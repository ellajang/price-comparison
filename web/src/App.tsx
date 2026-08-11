import { useEffect, useMemo, useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { PriceTable } from '@/components/PriceTable';
import { CategoryFilter, type CategoryCount } from '@/components/CategoryFilter';
import { Pagination } from '@/components/Pagination';
import { dropRatio, latestSale } from '@/lib/history';
import type { Product } from '@/types';

const PAGE_SIZE = 50;

type SortKey = 'default' | 'discount' | 'priceAsc' | 'priceDesc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: '기본순' },
  { key: 'discount', label: '할인율순 (최고가 대비)' },
  { key: 'priceAsc', label: '가격 낮은순' },
  { key: 'priceDesc', label: '가격 높은순' },
];

export function App() {
  const { products, isLoading, error, isLive, toggleWatch } = useProducts();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [watchedOnly, setWatchedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('default');
  const [page, setPage] = useState(0);

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
    const matched = products.filter((p) => {
      if (watchedOnly && !p.watched) return false;
      if (category && p.category !== category) return false;
      if (q && !(p.brand?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });

    const byKey: Record<SortKey, (a: Product, b: Product) => number> = {
      default: () => 0,
      discount: (a, b) => dropRatio(b.history) - dropRatio(a.history),
      priceAsc: (a, b) => (latestSale(a.history) ?? Infinity) - (latestSale(b.history) ?? Infinity),
      priceDesc: (a, b) => (latestSale(b.history) ?? -Infinity) - (latestSale(a.history) ?? -Infinity),
    };

    // 찜한 상품 최상단 핀 → 그 안에서 선택한 정렬
    return [...matched].sort((a, b) => Number(b.watched) - Number(a.watched) || byKey[sort](a, b));
  }, [products, query, category, watchedOnly, sort]);

  // 필터/검색/정렬이 바뀌면 1페이지로 되돌림
  useEffect(() => {
    setPage(0);
  }, [query, category, watchedOnly, sort]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const watchedCount = products.filter((p) => p.watched).length;
  const isFiltering = category !== null || watchedOnly || query.trim() !== '';
  const rangeStart = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const rangeEnd = Math.min(filtered.length, (safePage + 1) * PAGE_SIZE);

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
          <select
            className="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="정렬"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="search"
            className="search"
            placeholder="브랜드·상품명 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </header>

      {isLoading && (
        <p className="state" aria-live="polite">
          불러오는 중…
        </p>
      )}
      {error && (
        <p className="state error" role="alert">
          불러오기 실패: {error}
        </p>
      )}

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
            {filtered.length > 0 && (
              <>
                {' '}
                · {rangeStart}–{rangeEnd}번째 보는 중
              </>
            )}
          </p>
          <PriceTable products={paged} isLive={isLive} onToggleWatch={toggleWatch} />
          <Pagination page={safePage} pageCount={pageCount} onChange={goToPage} />
        </>
      )}
    </main>
  );
}
