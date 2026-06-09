import { useCallback, useEffect, useState } from 'react';
import { fetchProducts, setWatch } from '@/api/products';
import type { Product } from '@/types';

interface UseProductsResult {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  isLive: boolean; // 라이브(로컬)면 하트 클릭 가능, 정적(배포)이면 읽기 전용
  toggleWatch: (goodsNo: string) => void;
}

// 서버 상태 로딩 훅. 화면/엔드포인트가 늘면 TanStack Query로 승격.
export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then(({ products: data, isLive: live }) => {
        if (cancelled) return;
        setProducts(data);
        setIsLive(live);
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

  // 낙관적 토글: 화면 먼저 바꾸고 서버 반영, 실패하면 되돌림
  const toggleWatch = useCallback(
    (goodsNo: string) => {
      const current = products.find((p) => p.goodsNo === goodsNo);
      if (!current) return;
      const next = !current.watched;
      setProducts((prev) =>
        prev.map((p) => (p.goodsNo === goodsNo ? { ...p, watched: next } : p))
      );
      setWatch(goodsNo, next).catch((e: unknown) => {
        setProducts((prev) =>
          prev.map((p) => (p.goodsNo === goodsNo ? { ...p, watched: current.watched } : p))
        );
        setError(e instanceof Error ? e.message : '찜 업데이트 실패');
      });
    },
    [products]
  );

  return { products, isLoading, error, isLive, toggleWatch };
}
