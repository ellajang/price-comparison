// 백엔드 /api/products 응답 계약
export interface PricePoint {
  capturedAt: string; // YYYY-MM-DD
  listPrice: number | null;
  salePrice: number | null;
  isSalePeriod: boolean;
  category: string | null;
}

export interface Product {
  goodsNo: string;
  brand: string | null;
  name: string | null;
  url: string | null;
  image: string | null; // 썸네일 URL
  listPrice: number | null; // 정가
  currentPrice: number | null; // 평소(비세일) 최신 판매가
  saleFloor: number | null; // 세일 구간 최저가
  recentSale: number | null; // 가장 최근 세일가
  history: PricePoint[]; // 오래된 → 최신
}
