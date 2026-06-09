// SQLite 저장 계층 — 상품 정보 + 가격 시계열
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    goods_no          TEXT PRIMARY KEY,
    brand             TEXT,
    name              TEXT,
    url               TEXT,
    image_url         TEXT,
    lowest_price      INTEGER,   -- 역대 최저 판매가 (영구 박제, 매 수집 시 비교 갱신)
    lowest_price_date TEXT,      -- 그 최저가가 찍힌 날짜
    watched           INTEGER NOT NULL DEFAULT 0,  -- 관심 상품(순위 밖이어도 상세페이지로 추적)
    first_seen        TEXT,
    last_seen         TEXT
  );

  CREATE TABLE IF NOT EXISTS price_snapshots (
    goods_no       TEXT NOT NULL,
    captured_at    TEXT NOT NULL,          -- YYYY-MM-DD
    list_price     INTEGER,                -- 정가
    sale_price     INTEGER,                -- 판매가(할인가)
    is_sale_period INTEGER NOT NULL,       -- 세일월이면 1
    category       TEXT,
    PRIMARY KEY (goods_no, captured_at),   -- 하루 1건 (재수집 시 갱신)
    FOREIGN KEY (goods_no) REFERENCES products(goods_no)
  );

  CREATE INDEX IF NOT EXISTS idx_snap_goods ON price_snapshots(goods_no);
`);

// 마이그레이션: 기존 data.db에 없는 컬럼 추가
const productCols = db.prepare(`PRAGMA table_info(products)`).all().map((c) => c.name);
if (!productCols.includes('image_url')) {
  db.exec(`ALTER TABLE products ADD COLUMN image_url TEXT`);
}
if (!productCols.includes('watched')) {
  db.exec(`ALTER TABLE products ADD COLUMN watched INTEGER NOT NULL DEFAULT 0`);
}
if (!productCols.includes('lowest_price')) {
  db.exec(`ALTER TABLE products ADD COLUMN lowest_price INTEGER`);
  db.exec(`ALTER TABLE products ADD COLUMN lowest_price_date TEXT`);
  // 기존 스냅샷에서 상품별 역대 최저 판매가를 한 번 채워넣음(백필)
  db.exec(`
    UPDATE products SET
      lowest_price = (
        SELECT MIN(s.sale_price) FROM price_snapshots s
        WHERE s.goods_no = products.goods_no AND s.sale_price IS NOT NULL
      ),
      lowest_price_date = (
        SELECT s.captured_at FROM price_snapshots s
        WHERE s.goods_no = products.goods_no AND s.sale_price IS NOT NULL
        ORDER BY s.sale_price ASC, s.captured_at ASC LIMIT 1
      )
  `);
}

const upsertProduct = db.prepare(`
  INSERT INTO products (goods_no, brand, name, url, image_url, first_seen, last_seen)
  VALUES (@goodsNo, @brand, @name, @url, @imageUrl, @date, @date)
  ON CONFLICT(goods_no) DO UPDATE SET
    brand = excluded.brand,
    name  = excluded.name,
    url   = excluded.url,
    image_url = excluded.image_url,
    last_seen = excluded.last_seen
`);

const upsertSnapshot = db.prepare(`
  INSERT INTO price_snapshots
    (goods_no, captured_at, list_price, sale_price, is_sale_period, category)
  VALUES
    (@goodsNo, @date, @listPrice, @salePrice, @isSalePeriod, @category)
  ON CONFLICT(goods_no, captured_at) DO UPDATE SET
    list_price = excluded.list_price,
    sale_price = excluded.sale_price,
    is_sale_period = excluded.is_sale_period,
    category = excluded.category
`);

// 가장 최근 스냅샷 (store-on-change 비교용)
const getLastSnapshot = db.prepare(`
  SELECT captured_at, list_price, sale_price, is_sale_period
  FROM price_snapshots WHERE goods_no = ?
  ORDER BY captured_at DESC LIMIT 1
`);

// [A] 역대 최저가 갱신 — 더 싸졌을 때만 (NULL이면 첫 기록)
const updateLowest = db.prepare(`
  UPDATE products SET lowest_price = @price, lowest_price_date = @date
  WHERE goods_no = @goodsNo AND (lowest_price IS NULL OR @price < lowest_price)
`);

// items: 스크랩 배열, meta: { date, isSalePeriod, category }
function saveItems(items, meta) {
  const isSale = meta.isSalePeriod ? 1 : 0;
  const tx = db.transaction((rows) => {
    for (const it of rows) {
      if (!it.goodsNo) continue;
      upsertProduct.run({
        goodsNo: it.goodsNo,
        brand: it.brand,
        name: it.name,
        url: it.url,
        imageUrl: it.image ?? null,
        date: meta.date,
      });

      // [B] store-on-change: 직전 스냅샷과 가격이 같으면 새 줄을 안 만든다(=용량 절감).
      //     단, 직전 스냅샷이 '오늘'이면(재수집/멀티카테고리) 그 줄을 갱신해야 하므로 통과.
      const last = getLastSnapshot.get(it.goodsNo);
      const unchanged =
        last &&
        last.captured_at !== meta.date &&
        last.list_price === it.listPrice &&
        last.sale_price === it.salePrice &&
        last.is_sale_period === isSale;
      if (!unchanged) {
        upsertSnapshot.run({
          goodsNo: it.goodsNo,
          date: meta.date,
          listPrice: it.listPrice,
          salePrice: it.salePrice,
          isSalePeriod: isSale,
          category: meta.category,
        });
      }

      // [A] 역대 최저가는 변동 여부와 무관하게 항상 비교
      if (it.salePrice != null) {
        updateLowest.run({ goodsNo: it.goodsNo, price: it.salePrice, date: meta.date });
      }
    }
  });
  tx(items);
}

// ── 관심 상품(watchlist) 관리 ──────────────────────────────
const setWatchedStmt = db.prepare(`UPDATE products SET watched = @on WHERE goods_no = @goodsNo`);

// 이름 부분일치 또는 goodsNo 정확일치로 상품 검색
const searchProductsStmt = db.prepare(`
  SELECT goods_no, brand, name, watched FROM products
  WHERE goods_no = @q OR name LIKE @like
  ORDER BY watched DESC, name
  LIMIT 20
`);

// 관심 상품 목록 (상세페이지 추적용) — 최근 카테고리도 함께
const watchlistStmt = db.prepare(`
  SELECT p.goods_no, p.brand, p.name, p.url, p.image_url,
    (SELECT s.category FROM price_snapshots s WHERE s.goods_no = p.goods_no
     ORDER BY s.captured_at DESC LIMIT 1) AS category
  FROM products p WHERE p.watched = 1
`);

function setWatched(goodsNo, on) {
  const r = setWatchedStmt.run({ goodsNo, on: on ? 1 : 0 });
  return r.changes > 0;
}

function searchProducts(query) {
  return searchProductsStmt.all({ q: query, like: `%${query}%` });
}

function getWatchlist() {
  return watchlistStmt.all();
}

module.exports = { db, saveItems, setWatched, searchProducts, getWatchlist };
