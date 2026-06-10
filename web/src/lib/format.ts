// 가격/할인율 표시 포맷터
export function won(value: number | null): string {
  if (value == null) return '-';
  return `${value.toLocaleString('ko-KR')}원`;
}

// 'YYYY-MM-DD' → 'M/D'
export function shortDate(iso: string | null): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

// 정가 대비 할인율(%) — 정가가 없거나 0이면 null
export function discountPct(price: number | null, listPrice: number | null): number | null {
  if (price == null || !listPrice) return null;
  return Math.round((1 - price / listPrice) * 100);
}
