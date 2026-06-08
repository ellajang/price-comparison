import { useMemo, useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { PriceTable } from '@/components/PriceTable';
import { CategoryFilter, type CategoryCount } from '@/components/CategoryFilter';

export function App() {
  const { products, isLoading, error } = useProducts();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  // 카테고리별 개수 (개수 많은 순)
  const categories = useMemo<CategoryCount[]>(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count
    );
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (q && !(p.brand?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [products, query, category]);

  const saleCount = products.filter((p) => p.saleFloor != null).length;
  const curCount = products.filter((p) => p.currentPrice != null).length;
  const isFiltering = category !== null || query.trim() !== '';

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
          <CategoryFilter
            categories={categories}
            selected={category}
            totalCount={products.length}
            onSelect={setCategory}
          />
          <p className="summary">
            상품 <b>{products.length}</b>개 · 세일 기준가 <b>{saleCount}</b> · 평소 현재가{' '}
            <b>{curCount}</b>
            {isFiltering && (
              <>
                {' '}
                · 표시 <b>{filtered.length}</b>
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
