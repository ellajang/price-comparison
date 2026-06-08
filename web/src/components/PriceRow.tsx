import type { Product } from '@/types';
import { won } from '@/lib/format';
import { PriceCell } from '@/components/PriceCell';
import { ComparisonBadge } from '@/components/ComparisonBadge';
import { TrendSparkline } from '@/components/TrendSparkline';

interface PriceRowProps {
  product: Product;
}

export function PriceRow({ product }: PriceRowProps) {
  return (
    <tr>
      <td className="thumb">
        {product.image ? (
          <img src={product.image} alt="" loading="lazy" decoding="async" width={44} height={44} />
        ) : (
          <span className="thumb-empty" aria-hidden="true" />
        )}
      </td>
      <td>{product.brand ?? '-'}</td>
      <td className="name">
        {product.url ? (
          <a href={product.url} target="_blank" rel="noopener noreferrer">
            {product.name ?? '-'}
          </a>
        ) : (
          (product.name ?? '-')
        )}
      </td>
      <td className="num list">{won(product.listPrice)}</td>
      <PriceCell price={product.currentPrice} listPrice={product.listPrice} variant="cur" />
      <PriceCell price={product.saleFloor} listPrice={product.listPrice} variant="sale" />
      <PriceCell price={product.recentSale} listPrice={product.listPrice} variant="recent" />
      <td className="trend">
        <TrendSparkline history={product.history} />
      </td>
      <ComparisonBadge currentPrice={product.currentPrice} saleFloor={product.saleFloor} />
    </tr>
  );
}
