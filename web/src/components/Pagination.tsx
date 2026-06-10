interface PaginationProps {
  page: number; // 0-indexed
  pageCount: number;
  onChange: (page: number) => void;
}

// 현재 페이지 주변 + 처음/끝만 보여주고 사이는 …으로 (1 … 4 5 6 … 54)
function buildItems(page: number, pageCount: number): (number | 'gap')[] {
  const cur = page + 1;
  const wanted = new Set([1, pageCount, cur, cur - 1, cur + 1]);
  const nums = [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  let prev = 0;
  for (const n of nums) {
    if (n - prev > 1) out.push('gap');
    out.push(n);
    prev = n;
  }
  return out;
}

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  const items = buildItems(page, pageCount);

  return (
    <nav className="pager" aria-label="페이지 이동">
      <button
        type="button"
        className="pager-arrow"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        aria-label="이전 페이지"
      >
        ‹
      </button>

      {items.map((it, i) =>
        it === 'gap' ? (
          <span key={`gap-${i}`} className="pager-gap">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            className={`pager-num ${it - 1 === page ? 'on' : ''}`}
            aria-current={it - 1 === page ? 'page' : undefined}
            onClick={() => onChange(it - 1)}
          >
            {it}
          </button>
        )
      )}

      <button
        type="button"
        className="pager-arrow"
        disabled={page >= pageCount - 1}
        onClick={() => onChange(page + 1)}
        aria-label="다음 페이지"
      >
        ›
      </button>
    </nav>
  );
}
