import type { Product } from '@/types';
import { PriceRow } from '@/components/PriceRow';

interface PriceTableProps {
  products: Product[];
  isLive: boolean;
  onToggleWatch: (goodsNo: string) => void;
}

export function PriceTable({ products, isLive, onToggleWatch }: PriceTableProps) {
  return (
    <table className="price-table">
      <thead>
        <tr>
          <th className="heart"></th>
          <th className="thumb"></th>
          <th>브랜드</th>
          <th>상품명</th>
          <th className="num">정가</th>
          <th className="num">현재가</th>
          <th className="num">역대 최저가</th>
          <th className="num">최근 세일가</th>
          <th>최고가 대비</th>
          <th>비교</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <PriceRow key={p.goodsNo} product={p} isLive={isLive} onToggleWatch={onToggleWatch} />
        ))}
      </tbody>
    </table>
  );
}
