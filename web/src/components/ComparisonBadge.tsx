import { won } from '@/lib/format';

interface ComparisonBadgeProps {
  currentPrice: number | null;
  saleFloor: number | null;
}

// 현재가 vs 세일 최저가 비교 (▲ 비쌈 / ▼ 쌈 / – 동일)
export function ComparisonBadge({ currentPrice, saleFloor }: ComparisonBadgeProps) {
  if (saleFloor == null) {
    return <td className="muted">세일가 수집 전</td>;
  }
  if (currentPrice == null) {
    return <td className="muted">현재가 수집 전</td>;
  }

  const diff = currentPrice - saleFloor;
  if (diff === 0) {
    return <td className="flat">– 변화 없음</td>;
  }
  if (diff > 0) {
    return <td className="bad">▲ {won(diff)} (세일보다 비쌈)</td>;
  }
  return <td className="good">▼ {won(-diff)} (세일보다 쌈)</td>;
}
