import { useMemo, useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { PriceTable } from '@/components/PriceTable';

export function App() {
  const { products, isLoading, error } = useProducts();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.brand?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
    );
  }, [products, query]);

  const saleCount = products.filter((p) => p.saleFloor != null).length;
  const curCount = products.filter((p) => p.currentPrice != null).length;

  return (
    <main className="app">
      <header className="app-header">
        <h1>🛒 올리브영 가격 비교</h1>
        <input
          type="search"
          className="search"
          placeholder="브랜드·상품명 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      {isLoading && <p className="state">불러오는 중…</p>}
      {error && <p className="state error">불러오기 실패: {error}</p>}

      {!isLoading && !error && (
        <>
          <p className="summary">
            상품 <b>{products.length}</b>개 · 세일 기준가 <b>{saleCount}</b> · 평소 현재가{' '}
            <b>{curCount}</b>
            {query && (
              <>
                {' '}
                · 검색 결과 <b>{filtered.length}</b>
              </>
            )}
            {curCount === 0 && (
              <span className="hint"> — 세일이 아닌 달에 다시 수집하면 비교가 채워집니다.</span>
            )}
          </p>
          <PriceTable products={filtered} />
        </>
      )}
    </main>
  );
}
