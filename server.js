// 로컬 뷰어 백엔드 — data.db를 JSON API로 노출 + web/dist 정적 서빙
// UI 렌더링은 web/(Vite+React)이 담당. (이전의 HTML 문자열 렌더 제거 → XSS 위험도 해소)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { getProducts } = require('./getProducts');
const { setWatched } = require('./db');

const PORT = 3000;
const DIST_DIR = path.join(__dirname, 'web', 'dist');

const sendJson = (res, data) => {
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

// web/dist 정적 파일 서빙 (SPA fallback → index.html)
function serveStatic(req, res) {
  if (!fs.existsSync(DIST_DIR)) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('web/dist 없음 — `cd web && npm run build` 먼저 실행하거나, 개발 중이면 `npm run dev`(Vite)로 접속하세요.');
    return;
  }
  const urlPath = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(DIST_DIR, urlPath);
  // 디렉터리 탈출 방지
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      // 라우트가 아닌 정적 파일이면 SPA index.html로 폴백
      fs.readFile(path.join(DIST_DIR, 'index.html'), (e2, html) => {
        if (e2) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.writeHead(200, { 'content-type': MIME['.html'] });
        res.end(html);
      });
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] ?? 'application/octet-stream' });
    res.end(buf);
  });
}

// 관심 상품 토글 (로컬 전용 쓰기 — 배포 Pages엔 이 엔드포인트가 없음)
function handleWatch(req, res) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1e4) req.destroy(); // 비정상 페이로드 방어
  });
  req.on('end', () => {
    try {
      const { goodsNo, watched } = JSON.parse(body);
      if (typeof goodsNo !== 'string' || typeof watched !== 'boolean') {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'goodsNo(string), watched(boolean) 필요' }));
        return;
      }
      const ok = setWatched(goodsNo, watched);
      sendJson(res, { goodsNo, watched, updated: ok });
    } catch {
      res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'JSON 파싱 실패' }));
    }
  });
}

http
  .createServer((req, res) => {
    const pathname = req.url.split('?')[0];
    if (pathname === '/api/products') {
      sendJson(res, getProducts());
      return;
    }
    if (pathname === '/api/watch' && req.method === 'POST') {
      handleWatch(req, res);
      return;
    }
    serveStatic(req, res);
  })
  .listen(PORT, () => {
    console.log(`API + 뷰어 실행 중 → http://localhost:${PORT}`);
    console.log(`개발 모드는 web/에서 'npm run dev' 후 Vite 주소로 접속 (/api는 :${PORT}로 프록시)`);
  });
