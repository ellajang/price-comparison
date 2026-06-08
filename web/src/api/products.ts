import type { Product } from '@/types';

// 제네릭 GET — 엔드포인트가 늘면 여기에 흘려 재사용
async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`요청 실패 (${res.status}): ${path}`);
  }
  return (await res.json()) as T;
}

// 개발: 라이브 API(server.js, /api 프록시) · 빌드(Pages): 정적 products.json
const PRODUCTS_URL = import.meta.env.PROD
  ? `${import.meta.env.BASE_URL}products.json`
  : '/api/products';

export function fetchProducts(): Promise<Product[]> {
  return apiGet<Product[]>(PRODUCTS_URL);
}
