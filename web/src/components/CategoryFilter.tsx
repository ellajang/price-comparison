export interface CategoryCount {
  name: string;
  count: number;
}

interface CategoryFilterProps {
  categories: CategoryCount[];
  selected: string | null; // null = 전체
  totalCount: number;
  onSelect: (category: string | null) => void;
}

// 상단 카테고리 선택 칩. 선택된 칩만 채워지고, '전체'로 해제.
export function CategoryFilter({ categories, selected, totalCount, onSelect }: CategoryFilterProps) {
  return (
    <div className="cat-filter" role="group" aria-label="카테고리 필터">
      <button
        type="button"
        className={`chip ${selected === null ? 'on' : ''}`}
        aria-pressed={selected === null}
        onClick={() => onSelect(null)}
      >
        전체 <span className="chip-cnt">{totalCount}</span>
      </button>
      {categories.map((cat) => (
        <button
          key={cat.name}
          type="button"
          className={`chip ${selected === cat.name ? 'on' : ''}`}
          aria-pressed={selected === cat.name}
          onClick={() => onSelect(cat.name)}
        >
          {cat.name} <span className="chip-cnt">{cat.count}</span>
        </button>
      ))}
    </div>
  );
}
