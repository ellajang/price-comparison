// 상품 목록 + 가격 시계열 조회 — server.js(라이브 API)와 gen-data.js(정적 빌드)가 공유
const { db } = require('./db');

const allSnapshots = db.prepare(`
  SELECT goods_no, captured_at, list_price, sale_price, is_sale_period, category
  FROM price_snapshots
  ORDER BY captured_at ASC
`);

const allProducts = db.prepare(`
  SELECT goods_no, brand, name, url, image_url, lowest_price, lowest_price_date FROM products
`);

// 상품마다 history 배열을 임베드 (한 번의 fetch로 표 + 스파크라인 둘 다)
function getProducts() {
  const history = new Map(); // goods_no -> PricePoint[]
  for (const s of allSnapshots.all()) {
    const point = {
      capturedAt: s.captured_at,
      listPrice: s.list_price,
      salePrice: s.sale_price,
      isSalePeriod: s.is_sale_period === 1,
      category: s.category,
    };
    const arr = history.get(s.goods_no);
    if (arr) arr.push(point);
    else history.set(s.goods_no, [point]);
  }

  return allProducts.all().map((p) => {
    const points = history.get(p.goods_no) ?? [];
    const sales = points.filter((pt) => pt.isSalePeriod && pt.salePrice != null);
    const normals = points.filter((pt) => !pt.isSalePeriod && pt.salePrice != null);
    const listPrices = points.map((pt) => pt.listPrice).filter((v) => v != null);

    const latest = points.length ? points[points.length - 1] : null;
    return {
      goodsNo: p.goods_no,
      brand: p.brand,
      name: p.name,
      url: p.url,
      image: p.image_url,
      category: latest ? latest.category : null, // 가장 최근 스냅샷의 카테고리
      lowestPrice: p.lowest_price, // 역대 최저 판매가
      lowestPriceDate: p.lowest_price_date,

      listPrice: listPrices.length ? Math.max(...listPrices) : null,
      currentPrice: normals.length ? normals[normals.length - 1].salePrice : null,
      saleFloor: sales.length ? Math.min(...sales.map((pt) => pt.salePrice)) : null,
      recentSale: sales.length ? sales[sales.length - 1].salePrice : null,
      history: points,
    };
  });
}

module.exports = { getProducts };
