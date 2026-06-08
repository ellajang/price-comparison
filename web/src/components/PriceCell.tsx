import { discountPct, won } from '@/lib/format';

interface PriceCellProps {
  price: number | null;
  listPrice: number | null;
  variant: 'cur' | 'sale' | 'recent';
}

// 가격 + 정가 대비 할인율을 함께 보여주는 셀
export function PriceCell({ price, listPrice, variant }: PriceCellProps) {
  if (price == null) {
    return <td className="num muted">-</td>;
  }
  const pct = discountPct(price, listPrice);
  return (
    <td className={`num ${variant}`}>
      {won(price)}
      {pct != null && <span className="pct"> -{pct}%</span>}
    </td>
  );
}
