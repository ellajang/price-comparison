import { useState } from 'react';
import type { PricePoint } from '@/types';
import { won } from '@/lib/format';

interface PeakGaugeProps {
  history: PricePoint[];
}

// 역대 최고가(관측된 최고 판매가) 대비 현재가가 얼마나 떨어졌는지 막대로 표시.
export function PeakGauge({ history }: PeakGaugeProps) {
  const [hover, setHover] = useState(false);
  const prices = history.map((p) => p.salePrice).filter((v): v is number => v != null);

  if (prices.length === 0) return <span className="muted">-</span>;

  const peak = Math.max(...prices);
  const current = prices[prices.length - 1];
  const dropPct = peak > 0 ? Math.round((1 - current / peak) * 100) : 0;
  const dropped = dropPct > 0;
  // 막대 채움 = 현재가 / 최고가 (떨어질수록 짧아짐)
  const fill = peak > 0 ? Math.max(4, Math.round((current / peak) * 100)) : 100;

  return (
    <span
      className="peak-wrap"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="peak-bar">
        <span className={`peak-fill ${dropped ? 'down' : 'flat'}`} style={{ width: `${fill}%` }} />
      </span>
      <span className={`peak-label ${dropped ? 'down' : 'flat'}`}>
        {dropped ? `↓${dropPct}%` : '최고가'}
      </span>
      {hover && (
        <span className="peak-tip">
          최고 {won(peak)} → 현재 {won(current)}
          {dropped ? ` (↓${dropPct}%)` : ''}
        </span>
      )}
    </span>
  );
}
