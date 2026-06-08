// Cloudflare 통과 여부 + 목록 API 캡처 검증용 일회성 스크립트
const { chromium } = require('playwright');

const TARGET =
  'https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    locale: 'ko-KR',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  // JSON 성격의 응답(목록/가격 API 후보) 캡처
  const apiHits = [];
  page.on('response', (res) => {
    const url = res.url();
    const ct = res.headers()['content-type'] || '';
    if (ct.includes('json') || /getBest|List|goods|prd|search/i.test(url)) {
      apiHits.push({ status: res.status(), ct, url });
    }
  });

  try {
    await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 45000 });
    // Cloudflare 챌린지가 풀릴 시간을 잠깐 줌
    await page.waitForTimeout(6000);

    const title = await page.title();
    const blocked = title.includes('잠시만');

    // 가격/상품으로 보이는 요소 탐색 (구조 모르니 넓게)
    const priceCount = await page.evaluate(() => {
      const cand = document.querySelectorAll(
        '[class*="price"], [class*="Price"], .prd_price, .tx_num'
      );
      return cand.length;
    });
    const sampleText = await page.evaluate(() => {
      const el = document.querySelector(
        '[class*="price"], .prd_price, .tx_num'
      );
      return el ? el.textContent.trim().slice(0, 60) : null;
    });

    console.log('==== 결과 ====');
    console.log('title       :', title);
    console.log('차단 여부    :', blocked ? '❌ 차단됨' : '✅ 통과!');
    console.log('가격류 요소  :', priceCount, '개');
    console.log('가격 샘플    :', sampleText);
    console.log('');
    console.log('==== JSON/목록 API 후보 (상위 15) ====');
    apiHits.slice(0, 15).forEach((h) => console.log(`[${h.status}] ${h.url}`));
    if (apiHits.length === 0) console.log('(JSON API 캡처 없음)');
  } catch (e) {
    console.log('에러:', e.message);
  } finally {
    await browser.close();
  }
})();
