// data.db → web/public/products.json 생성 (GitHub Pages 정적 배포용)
// 스크래핑 후 `node gen-data.js`를 돌리고 data.db + products.json을 함께 커밋하세요.
const fs = require('fs');
const path = require('path');
const { db } = require('./db');
const { getProducts } = require('./getProducts');

// WAL에 남은 변경분을 data.db 본체로 합침 → 커밋한 data.db가 누락 없는 완전한 스냅샷이 됨
db.pragma('wal_checkpoint(TRUNCATE)');

const outDir = path.join(__dirname, 'web', 'public');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'products.json');

const products = getProducts();
fs.writeFileSync(outFile, JSON.stringify(products));

console.log(`생성: web/public/products.json (상품 ${products.length}개)`);
