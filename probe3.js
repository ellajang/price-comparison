// 상품 구조화 추출 검증용 일회성 스크립트
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

  // 먼저 첫 카드의 가격 영역 HTML을 떠서 클래스명 확인
  const priceHtml = await page.evaluate(() => {
    const li = document.querySelector('.cate_prd_list > li');
    const price = li && li.querySelector('.prd_price');
    return price ? price.outerHTML : '(prd_price 없음)';
  });
  console.log('==== 가격 영역 HTML ====');
  console.log(priceHtml);
  console.log('');

  // 구조화 추출
  const items = await page.evaluate(() => {
    const toNum = (s) => {
      if (!s) return null;
      const n = s.replace(/[^0-9]/g, '');
      return n ? parseInt(n, 10) : null;
    };
    return Array.from(document.querySelectorAll('.cate_prd_list > li')).map(
      (li) => {
        const a = li.querySelector('a[data-ref-goodsno]');
        const goodsNo = a?.getAttribute('data-ref-goodsno') || null;
        const name = li.querySelector('.prd_name .tx_name, .prd_name')?.textContent.trim() || null;
        const brand = li.querySelector('.prd_name .tx_brand, .tx_brand')?.textContent.trim() || null;
        // 정가(취소선)와 판매가 후보
        const orgEl = li.querySelector('.tx_org .tx_num, .tx_org');
        const curEl = li.querySelector('.prd_price .point, .tx_cur .tx_num, .tx_cur');
        return {
          goodsNo,
          brand,
          name: name ? name.replace(/\s+/g, ' ') : null,
          listPrice: toNum(orgEl?.textContent),
          salePrice: toNum(curEl?.textContent),
          url: a?.href || null,
        };
      }
    );
  });

  console.log('==== 추출 결과 (상위 5개) ====');
  console.log(JSON.stringify(items.slice(0, 5), null, 2));
  console.log(`\n총 ${items.length}개 추출`);
  const withPrice = items.filter((i) => i.salePrice).length;
  console.log(`판매가 잡힌 항목: ${withPrice}/${items.length}`);

  await browser.close();
})();
