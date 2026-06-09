import { useMemo, useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { PriceTable } from '@/components/PriceTable';
import { CategoryFilter, type CategoryCount } from '@/components/CategoryFilter';

export function App() {
  const { products, isLoading, error } = useProducts();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [watchedOnly, setWatchedOnly] = useState(false);

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
      if (watchedOnly && !p.watched) return false;
      if (category && p.category !== category) return false;
      if (q && !(p.brand?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [products, query, category, watchedOnly]);

  const watchedCount = products.filter((p) => p.watched).length;
  const isFiltering = category !== null || watchedOnly || query.trim() !== '';

  return (
    <main className="app">
      <header className="app-header">
        <h1>🛒 올리브영 가격 비교</h1>
        <div className="header-controls">
          <button
            type="button"
            className={`chip ${watchedOnly ? 'on' : ''}`}
            aria-pressed={watchedOnly}
            onClick={() => setWatchedOnly((v) => !v)}
          >
            ⭐ 관심상품 <span className="chip-cnt">{watchedCount}</span>
          </button>
          <input
            type="search"
            className="search"
            placeholder="브랜드·상품명 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
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
            상품 <b>{products.length}</b>개 · ⭐ 관심 <b>{watchedCount}</b>
            {isFiltering && (
              <>
                {' '}
                · 표시 <b>{filtered.length}</b>
              </>
            )}
          </p>
          <PriceTable products={filtered} />
        </>
      )}
    </main>
  );
}
