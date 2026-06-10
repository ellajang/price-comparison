import { useId, useState, type MouseEvent } from 'react';
import type { PricePoint } from '@/types';
import { won } from '@/lib/format';

interface TrendSparklineProps {
  history: PricePoint[];
  width?: number;
  height?: number;
}

// 판매가(salePrice) 시계열 SVG 선. 마우스 올리면 그 지점의 날짜·가격 툴팁 표시.
export function TrendSparkline({ history, width = 120, height = 32 }: TrendSparklineProps) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const points = history.filter((p) => p.salePrice != null);

  if (points.length === 0) return <span className="muted">-</span>;
  if (points.length === 1) return <span className="muted">추이 부족</span>;

  const prices = points.map((p) => p.salePrice as number);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const pad = 3;

  const x = (i: number) => (i / (points.length - 1)) * (width - pad * 2) + pad;
  const y = (price: number) => height - pad - ((price - min) / span) * (height - pad * 2);

  const linePath = points.map((_, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(prices[i])}`).join(' ');
  const areaPath = `${linePath} L${x(points.length - 1)},${height} L${x(0)},${height} Z`;

  const last = prices[prices.length - 1];
  const stroke = last < prices[0] ? '#27ae60' : last > prices[0] ? '#c0392b' : '#999';

  // 마우스 x → 가장 가까운 점 인덱스 (들어오는 즉시 + 움직일 때 모두)
  const handlePoint = (e: MouseEvent<SVGRectElement>) => {
    const ratio = (e.nativeEvent.offsetX - pad) / (width - pad * 2);
    const i = Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))));
    setHover(i);
  };

  return (
    <span className="sparkline-wrap">
      <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />

        {/* hover 가이드선 */}
        {hover !== null && (
          <line x1={x(hover)} y1={0} x2={x(hover)} y2={height} stroke="#bbb" strokeWidth="1" strokeDasharray="2 2" />
        )}

        {/* 점 — hover한 점은 강조 */}
        {points.map((p, i) => (
          <circle
            key={p.capturedAt}
            cx={x(i)}
            cy={y(prices[i])}
            r={hover === i ? 3.2 : p.isSalePeriod ? 2.2 : 0}
            fill={p.isSalePeriod ? '#c0392b' : stroke}
          />
        ))}
        <circle cx={x(points.length - 1)} cy={y(last)} r="2.2" fill={stroke} />

        {/* 전체를 덮는 투명 영역에서 마우스 추적 */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="transparent"
          onMouseEnter={handlePoint}
          onMouseMove={handlePoint}
          onMouseLeave={() => setHover(null)}
        />
      </svg>

      {hover !== null && (
        <span className="spark-tip" style={{ left: x(hover) }}>
          <b>{won(prices[hover])}</b>
          <em>{points[hover].capturedAt.slice(2)}</em>
        </span>
      )}
    </span>
  );
}
