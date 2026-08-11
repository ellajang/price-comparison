import type { PricePoint } from '@/types';

// 가격 이력에서 파생값을 계산하는 공용 함수들 (App / PeakGauge 공유 — 규칙 일원화)

// null 아닌 판매가만 (오래된 → 최신 순 유지)
export const salePrices = (history: PricePoint[]): number[] =>
  history.map((p) => p.salePrice).filter((v): v is number => v != null);

// 가장 최근 판매가
export const latestSale = (history: PricePoint[]): number | null => {
  const s = salePrices(history);
  return s.length ? s[s.length - 1] : null;
};

// 역대 최고 판매가
export const peakSale = (history: PricePoint[]): number | null => {
  const s = salePrices(history);
  return s.length ? Math.max(...s) : null;
};

// 역대 최고가가 찍힌 지점 (동점이면 가장 이른 날짜)
export const peakPoint = (history: PricePoint[]): PricePoint | null => {
  let best: PricePoint | null = null;
  for (const p of history) {
    if (p.salePrice == null) continue;
    if (best === null || p.salePrice > (best.salePrice as number)) best = p;
  }
  return best;
};

// 역대 최고가 대비 현재가 하락률 (0~1)
export const dropRatio = (history: PricePoint[]): number => {
  const peak = peakSale(history);
  const cur = latestSale(history);
  return peak != null && cur != null && peak > 0 ? 1 - cur / peak : 0;
};
