import { useState } from 'react';
import type { PricePoint } from '@/types';
import { shortDate, won } from '@/lib/format';

interface PeakGaugeProps {
  history: PricePoint[];
}

// 역대 최고가 대비 현재가 상태 + 직전 대비 방향(오름/내림). tooltip엔 최고가 날짜·세일여부.
export function PeakGauge({ history }: PeakGaugeProps) {
  const [hover, setHover] = useState(false);
  const pts = history.filter((p) => p.salePrice != null);

  if (pts.length === 0) return <span className="muted">-</span>;

  // 최고가 지점 (동점이면 가장 이른 날짜)
  const peakPt = pts.reduce((a, b) => ((b.salePrice as number) > (a.salePrice as number) ? b : a));
  const peak = peakPt.salePrice as number;
  const current = pts[pts.length - 1].salePrice as number;
  const prev = pts.length >= 2 ? (pts[pts.length - 2].salePrice as number) : null;

  let state: 'down' | 'up' | 'flat';
  let label: string;
  let fill: number;

  if (current < peak) {
    state = 'down';
    label = `▼ ${Math.round((1 - current / peak) * 100)}%`;
    fill = Math.max(4, Math.round((current / peak) * 100));
  } else if (prev != null && current > prev) {
    state = 'up';
    label = `▲ ${Math.round((current / prev - 1) * 100)}%`;
    fill = 100;
  } else {
    state = 'flat';
    label = '최고가';
    fill = 100;
  }

  return (
    <span
      className="peak-wrap"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="peak-bar">
        <span className={`peak-fill ${state}`} style={{ width: `${fill}%` }} />
      </span>
      <span className={`peak-label ${state}`}>{label}</span>
      {hover && (
        <span className="peak-tip">
          최고 {won(peak)} ({shortDate(peakPt.capturedAt)}
          {peakPt.isSalePeriod ? ' ⚠️세일' : ''}) · 현재 {won(current)}
        </span>
      )}
    </span>
  );
}
