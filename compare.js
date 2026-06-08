// 세일 기준가 vs 평소 현재가 비교 조회
const { db } = require('./db');

// 각 상품의 (세일기간 최저가) 와 (비세일 최신가) 를 뽑아 비교
const rows = db
  .prepare(
    `
  SELECT
    p.brand,
    p.name,
    MIN(CASE WHEN s.is_sale_period = 1 THEN s.sale_price END) AS sale_floor,
    (
      SELECT s2.sale_price FROM price_snapshots s2
      WHERE s2.goods_no = p.goods_no AND s2.is_sale_period = 0
      ORDER BY s2.captured_at DESC LIMIT 1
    ) AS current_price
  FROM products p
  JOIN price_snapshots s ON s.goods_no = p.goods_no
  GROUP BY p.goods_no
`
  )
  .all();

const won = (n) => (n == null ? '-' : n.toLocaleString('ko-KR') + '원');

// 현재 상태 요약
const saleCount = rows.filter((r) => r.sale_floor != null).length;
const curCount = rows.filter((r) => r.current_price != null).length;
console.log('==== 현재 상태 ====');
console.log(`상품 수            : ${rows.length}`);
console.log(`세일 기준가 보유   : ${saleCount}`);
console.log(`평소 현재가 보유   : ${curCount}`);
console.log('');

const comparable = rows
  .filter((r) => r.sale_floor != null && r.current_price != null)
  .map((r) => ({ ...r, diff: r.current_price - r.sale_floor }))
  .sort((a, b) => a.diff - b.diff); // 지금 사도 이득인(차이 작은) 순

if (comparable.length === 0) {
  console.log('아직 비교할 수 없어요.');
  console.log('→ 세일이 아닌 달에 `node scrape.js`를 다시 돌리면');
  console.log('  평소 현재가가 쌓이고, 그때부터 비교가 채워집니다.');
} else {
  console.log('==== 세일가 대비 현재가 (지금 살만한 순) ====\n');
  for (const r of comparable.slice(0, 30)) {
    const pct =
      r.sale_floor > 0
        ? Math.round((r.diff / r.sale_floor) * 100)
        : 0;
    const tag =
      r.diff <= 0 ? '🟢 세일가 이하!' : `🔴 세일보다 +${pct}%`;
    console.log(
      `${tag}  [${r.brand}] ${r.name}\n` +
        `   세일가 ${won(r.sale_floor)} → 현재 ${won(r.current_price)} (차이 ${won(r.diff)})\n`
    );
  }
}
