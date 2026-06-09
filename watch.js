// 관심 상품(watchlist) 관리 CLI
//   node watch.js list                  관심 상품 목록
//   node watch.js add <goodsNo|이름>     관심 추가 (이름 부분검색 지원)
//   node watch.js remove <goodsNo|이름>  관심 해제
const { setWatched, searchProducts, getWatchlist } = require('./db');

const [, , cmd, ...rest] = process.argv;
const query = rest.join(' ').trim();

function printList(rows) {
  if (rows.length === 0) {
    console.log('(없음)');
    return;
  }
  for (const r of rows) {
    const star = r.watched ? '⭐' : '  ';
    console.log(`${star} ${r.goods_no}  ${r.brand ?? ''} ${r.name ?? ''}`.trim());
  }
}

// goodsNo 정확일치 또는 이름 단일매치를 골라 watched 토글
function resolveAndSet(on) {
  if (!query) {
    console.error(`사용법: node watch.js ${on ? 'add' : 'remove'} <goodsNo 또는 상품명>`);
    process.exit(1);
  }
  const results = searchProducts(query);
  if (results.length === 0) {
    console.log(`"${query}" 검색 결과 없음. (수집된 상품 중에서만 찾습니다)`);
    process.exit(1);
  }
  const exact = results.find((r) => r.goods_no === query);
  const target = exact ?? (results.length === 1 ? results[0] : null);
  if (!target) {
    console.log(`"${query}"에 여러 개가 걸려요. goodsNo로 정확히 지정하세요:\n`);
    printList(results);
    process.exit(1);
  }
  setWatched(target.goods_no, on);
  console.log(`${on ? '⭐ 관심 추가' : '관심 해제'}: ${target.brand ?? ''} ${target.name ?? ''}`.trim());
}

switch (cmd) {
  case 'list': {
    const rows = getWatchlist();
    console.log(`관심 상품 ${rows.length}개:`);
    rows.forEach((r) => console.log(`  ⭐ ${r.goods_no}  ${r.brand ?? ''} ${r.name ?? ''}`.trim()));
    break;
  }
  case 'add':
    resolveAndSet(true);
    break;
  case 'remove':
    resolveAndSet(false);
    break;
  default:
    console.log('사용법:\n  node watch.js list\n  node watch.js add <goodsNo|상품명>\n  node watch.js remove <goodsNo|상품명>');
}
