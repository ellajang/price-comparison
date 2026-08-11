import { useState } from 'react';
import type { PricePoint } from '@/types';
import { shortDate, won } from '@/lib/format';
import { peakPoint, salePrices } from '@/lib/history';

interface PeakGaugeProps {
  history: PricePoint[];
}

// 낙폭이 이보다 크면 "옵션(기획/단품) 변동 가능성"으로 의심
const SUSPECT_DROP = 50;

// 역대 최고가 대비 현재가 상태 + 직전 대비 방향. 낙폭이 비정상적으로 크면 옵션변동 의심 표시.
export function PeakGauge({ history }: PeakGaugeProps) {
  const [hover, setHover] = useState(false);
  const prices = salePrices(history);
  const peakPt = peakPoint(history);

  if (prices.length === 0 || peakPt === null) return <span className="muted">-</span>;

  const peak = peakPt.salePrice as number;
  const current = prices[prices.length - 1];
  const prev = prices.length >= 2 ? prices[prices.length - 2] : null;
  const dropFromPeak = peak > 0 ? Math.round((1 - current / peak) * 100) : 0;

  let state: 'down' | 'up' | 'flat';
  let label: string;
  let fill: number;

  if (current < peak) {
    state = 'down';
    label = `▼ ${dropFromPeak}%`;
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

  // 낙폭이 너무 크면 진짜 세일보단 옵션(기획↔단품) 변동일 가능성
  const suspectVariant = state === 'down' && dropFromPeak >= SUSPECT_DROP;

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
      {suspectVariant && (
        <span
          className="opt-flag"
          role="img"
          aria-label="옵션(기획/단품) 변동 가능성 — 실제 가격 인하가 아닐 수 있음"
          title="옵션(기획/단품) 변동 가능성 — 실제 가격 인하가 아닐 수 있어요"
        >
          <span className="opt-q" aria-hidden="true">
            ?
          </span>
        </span>
      )}
      {hover && (
        <span className="peak-tip">
          최고 {won(peak)} ({shortDate(peakPt.capturedAt)}
          {peakPt.isSalePeriod ? ' ⚠️세일' : ''}) · 현재 {won(current)}
          {suspectVariant ? ' · 옵션 변동 가능성?' : ''}
        </span>
      )}
    </span>
  );
}
