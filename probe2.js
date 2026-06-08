// 상품 카드 DOM 구조 파악용 일회성 스크립트
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
  await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(5000);

  // 가격 요소에서 거슬러 올라가 "상품 카드" 단위를 추정하고 구조 덤프
  const info = await page.evaluate(() => {
    // 흔한 올리브영 베스트 리스트 후보 셀렉터
    const listCandidates = [
      '.cate_prd_list > li',
      '.prd_info',
      'ul.cate_prd_list li',
      'li[class*="prd"]',
    ];
    let chosen = null;
    let nodes = [];
    for (const sel of listCandidates) {
      const els = document.querySelectorAll(sel);
      if (els.length > 5) {
        chosen = sel;
        nodes = Array.from(els);
        break;
      }
    }
    if (!chosen) return { chosen: null };

    const dump = nodes.slice(0, 2).map((n) => n.outerHTML.slice(0, 1200));
    return { chosen, count: nodes.length, dump };
  });

  console.log('선택된 카드 셀렉터:', info.chosen);
  console.log('카드 개수        :', info.count);
  console.log('\n==== 카드 HTML 샘플 (앞 1200자) ====\n');
  (info.dump || []).forEach((d, i) => {
    console.log(`--- 카드 ${i + 1} ---`);
    console.log(d);
    console.log('');
  });

  await browser.close();
})();
