interface PaginationProps {
  page: number; // 0-indexed
  pageCount: number;
  onChange: (page: number) => void;
}

// 간단한 페이지 이동 (이전/다음 + 현재 위치). pageCount<=1이면 안 보임.
export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  const go = (p: number) => onChange(Math.max(0, Math.min(pageCount - 1, p)));

  return (
    <nav className="pager" aria-label="페이지 이동">
      <button type="button" className="pager-btn" disabled={page === 0} onClick={() => go(0)}>
        « 처음
      </button>
      <button type="button" className="pager-btn" disabled={page === 0} onClick={() => go(page - 1)}>
        ‹ 이전
      </button>
      <span className="pager-info">
        <b>{page + 1}</b> / {pageCount}
      </span>
      <button
        type="button"
        className="pager-btn"
        disabled={page >= pageCount - 1}
        onClick={() => go(page + 1)}
      >
        다음 ›
      </button>
      <button
        type="button"
        className="pager-btn"
        disabled={page >= pageCount - 1}
        onClick={() => go(pageCount - 1)}
      >
        끝 »
      </button>
    </nav>
  );
}
