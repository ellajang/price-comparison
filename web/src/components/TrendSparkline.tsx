import { useId } from 'react';
import type { PricePoint } from '@/types';
import { won } from '@/lib/format';

interface TrendSparklineProps {
  history: PricePoint[];
  width?: number;
  height?: number;
}

// 판매가(salePrice) 시계열을 의존성 없이 SVG 선으로. 세일 구간 점은 빨간 마커.
export function TrendSparkline({ history, width = 120, height = 32 }: TrendSparklineProps) {
  const gradientId = useId();
  const points = history.filter((p) => p.salePrice != null);

  if (points.length === 0) {
    return <span className="muted">-</span>;
  }
  if (points.length === 1) {
    return <span className="muted">추이 부족</span>;
  }

  const prices = points.map((p) => p.salePrice as number);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1; // 평평하면 0 나눗셈 방지
  const pad = 3;

  const x = (i: number) => (i / (points.length - 1)) * (width - pad * 2) + pad;
  const y = (price: number) => height - pad - ((price - min) / span) * (height - pad * 2);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.salePrice as number)}`).join(' ');
  const areaPath = `${linePath} L${x(points.length - 1)},${height} L${x(0)},${height} Z`;

  const first = prices[0];
  const last = prices[prices.length - 1];
  const trendUp = last > first;
  const stroke = last < first ? '#27ae60' : last > first ? '#c0392b' : '#999';

  const title = `${points[0].capturedAt} ${won(first)} → ${points[points.length - 1].capturedAt} ${won(last)}`;

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`가격 추이: ${title}`}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      {points.map((p, i) =>
        p.isSalePeriod ? (
          <circle key={p.capturedAt} cx={x(i)} cy={y(p.salePrice as number)} r="2.2" fill="#c0392b" />
        ) : null
      )}
      <circle cx={x(points.length - 1)} cy={y(last)} r="2.2" fill={stroke} aria-hidden="true" />
      {/* trendUp는 색으로 이미 표현되지만, 스크린리더용 텍스트는 aria-label에 포함됨 */}
      <desc>{trendUp ? '상승' : '하락 또는 유지'}</desc>
    </svg>
  );
}
