import type { Product } from '@/types';
import { won } from '@/lib/format';
import { PriceCell } from '@/components/PriceCell';
import { ComparisonBadge } from '@/components/ComparisonBadge';
import { TrendSparkline } from '@/components/TrendSparkline';
import { HeartIcon } from '@/components/HeartIcon';

interface PriceRowProps {
  product: Product;
  isLive: boolean; // 라이브(로컬)면 하트 클릭 가능
  onToggleWatch: (goodsNo: string) => void;
}

export function PriceRow({ product, isLive, onToggleWatch }: PriceRowProps) {
  // 현재(가장 최근) 판매가가 역대 최저가에 닿았는가 — 추적 이력이 2개 이상일 때만 (1일치 노이즈 방지)
  const latestSale = product.history.at(-1)?.salePrice ?? null;
  const isLowestNow =
    product.lowestPrice != null &&
    latestSale != null &&
    latestSale <= product.lowestPrice &&
    product.history.length > 1;

  return (
    <tr className={`${product.watched ? 'row-watched' : ''} ${isLowestNow ? 'row-lowest' : ''}`.trim() || undefined}>
      <td className="heart">
        {isLive ? (
          <button
            type="button"
            className="heart-btn"
            aria-pressed={product.watched}
            title={product.watched ? '찜 해제' : '찜하기'}
            onClick={() => onToggleWatch(product.goodsNo)}
          >
            <HeartIcon filled={product.watched} />
          </button>
        ) : product.watched ? (
          <span className="heart-ro" title="찜한 상품">
            <HeartIcon filled />
          </span>
        ) : null}
      </td>
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
      <td className="num lowest">
        {won(product.lowestPrice)}
        {product.lowestPriceDate && (
          <span className="lowest-date"> {product.lowestPriceDate.slice(2)}</span>
        )}
        {isLowestNow && <span className="fire-badge">🔥 역대최저</span>}
      </td>
      <PriceCell price={product.recentSale} listPrice={product.listPrice} variant="recent" />
      <td className="trend">
        <TrendSparkline history={product.history} />
      </td>
      <ComparisonBadge currentPrice={product.currentPrice} saleFloor={product.saleFloor} />
    </tr>
  );
}
