// SQLite 저장 계층 — 상품 정보 + 가격 시계열
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    goods_no   TEXT PRIMARY KEY,
    brand      TEXT,
    name       TEXT,
    url        TEXT,
    image_url  TEXT,
    first_seen TEXT,
    last_seen  TEXT
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

// 마이그레이션: 기존 data.db에 image_url 컬럼이 없으면 추가 (재수집 전까지는 NULL)
const productCols = db.prepare(`PRAGMA table_info(products)`).all().map((c) => c.name);
if (!productCols.includes('image_url')) {
  db.exec(`ALTER TABLE products ADD COLUMN image_url TEXT`);
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

// items: probe3 형태의 배열, meta: { date, isSalePeriod, category }
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
      upsertSnapshot.run({
        goodsNo: it.goodsNo,
        date: meta.date,
        listPrice: it.listPrice,
        salePrice: it.salePrice,
        isSalePeriod: isSale,
        category: meta.category,
      });
    }
  });
  tx(items);
}

module.exports = { db, saveItems };
