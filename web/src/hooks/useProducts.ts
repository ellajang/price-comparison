import { useEffect, useState } from 'react';
import { fetchProducts } from '@/api/products';
import type { Product } from '@/types';

interface UseProductsResult {
  products: Product[];
  isLoading: boolean;
  error: string | null;
}

// 서버 상태 로딩 훅. 화면/엔드포인트가 늘면 TanStack Query로 승격.
export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '알 수 없는 오류');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, isLoading, error };
}
