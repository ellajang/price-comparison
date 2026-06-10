import { useState } from 'react';
import type { PricePoint } from '@/types';
import { won } from '@/lib/format';

interface PeakGaugeProps {
  history: PricePoint[];
}

// 역대 최고가 대비 현재가 상태 + 직전 대비 방향(오름/내림) 표시.
export function PeakGauge({ history }: PeakGaugeProps) {
  const [hover, setHover] = useState(false);
  const prices = history.map((p) => p.salePrice).filter((v): v is number => v != null);

  if (prices.length === 0) return <span className="muted">-</span>;

  const peak = Math.max(...prices);
  const current = prices[prices.length - 1];
  const prev = prices.length >= 2 ? prices[prices.length - 2] : null;

  let state: 'down' | 'up' | 'flat';
  let label: string;
  let fill: number; // 막대 채움 %

  if (current < peak) {
    // 최고가보다 싸진 상태
    state = 'down';
    label = `↓${Math.round((1 - current / peak) * 100)}%`;
    fill = Math.max(4, Math.round((current / peak) * 100));
  } else if (prev != null && current > prev) {
    // 직전보다 올라 새 고점을 찍음
    state = 'up';
    label = `↑${Math.round((current / prev - 1) * 100)}%`;
    fill = 100;
  } else {
    // 변동 없음
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
          최고 {won(peak)} · 현재 {won(current)}
          {prev != null ? ` · 직전 ${won(prev)}` : ''}
        </span>
      )}
    </span>
  );
}
