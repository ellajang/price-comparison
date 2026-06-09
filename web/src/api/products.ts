import type { Product } from '@/types';

export interface ProductsResult {
  products: Product[];
  isLive: boolean; // /api/products(라이브 DB)에서 왔으면 true → 하트 편집 가능
}

// 라이브 API(로컬 뷰어) 우선 → 실패 시 정적 products.json(배포 Pages) 폴백
export async function fetchProducts(): Promise<ProductsResult> {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      return { products: (await res.json()) as Product[], isLive: true };
    }
  } catch {
    // 네트워크 오류 → 정적 폴백으로
  }
  const res = await fetch(`${import.meta.env.BASE_URL}products.json`);
  if (!res.ok) throw new Error(`데이터 로드 실패 (${res.status})`);
  return { products: (await res.json()) as Product[], isLive: false };
}

// 관심 상품 토글 (로컬 라이브 모드에서만 동작 — 배포엔 엔드포인트 없음)
export async function setWatch(goodsNo: string, watched: boolean): Promise<void> {
  const res = await fetch('/api/watch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ goodsNo, watched }),
  });
  if (!res.ok) throw new Error(`찜 업데이트 실패 (${res.status})`);
}
