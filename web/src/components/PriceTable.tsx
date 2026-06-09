import type { Product } from '@/types';
import { PriceRow } from '@/components/PriceRow';

interface PriceTableProps {
  products: Product[];
}

export function PriceTable({ products }: PriceTableProps) {
  return (
    <table className="price-table">
      <thead>
        <tr>
          <th className="thumb"></th>
          <th>브랜드</th>
          <th>상품명</th>
          <th className="num">정가</th>
          <th className="num">현재가</th>
          <th className="num">역대 최저가</th>
          <th className="num">최근 세일가</th>
          <th>추이</th>
          <th>비교</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <PriceRow key={p.goodsNo} product={p} />
        ))}
      </tbody>
    </table>
  );
}
