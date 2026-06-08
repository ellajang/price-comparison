// 올리브영 가격 수집 → SQLite 저장
const { chromium } = require('playwright');
const { saveItems } = require('./db');

// 올리브영 정기 세일(올영세일)은 "월 전체"가 아니라 며칠짜리 행사다.
// 세일 공지가 뜨면 그 날짜 구간을 여기에 추가하세요. 이 구간에 수집한 가격만 "세일가"로 기록됨.
// 평소(상시 할인가)는 그냥 "현재가"로 저장됩니다.
const SALE_PERIODS = [
  // { start: '2026-05-30', end: '2026-06-05' },  // 예: 2026 6월 올영세일
];

// 날짜 구간에 안 넣어도, 세일 중에 `node scrape.js --sale` 로 실행하면 강제로 세일가로 기록됨.
const FORCE_SALE = process.argv.includes('--sale');

// 수집 대상 카테고리. 지금은 베스트 전체 1개. 추후 여기에 dispCatNo를 더하면 범위가 넓어짐.
const CATEGORIES = [
  { name: '베스트_전체', dispCatNo: '900000100100001' },
];

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 오늘이 세일 구간에 드는지 (문자열 YYYY-MM-DD 비교 = 날짜순)
function isSaleDay(date) {
  if (FORCE_SALE) return true;
  return SALE_PERIODS.some((p) => date >= p.start && date <= p.end);
}

async function scrapeCategory(page, cat) {
  const url = `https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=${cat.dispCatNo}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(5000); // Cloudflare 챌린지 통과 대기

  const title = await page.title();
  if (title.includes('잠시만')) {
    throw new Error(`Cloudflare 차단됨 (${cat.name})`);
  }

  return page.evaluate(() => {
    const toNum = (s) => {
      if (!s) return null;
      const n = s.replace(/[^0-9]/g, '');
      return n ? parseInt(n, 10) : null;
    };
    return Array.from(document.querySelectorAll('.cate_prd_list > li'))
      .map((li) => {
        const a = li.querySelector('a[data-ref-goodsno]');
        const goodsNo = a?.getAttribute('data-ref-goodsno') || null;
        const brand = li.querySelector('.tx_brand')?.textContent.trim() || null;
        let name = li.querySelector('.prd_name')?.textContent.trim() || null;
        if (name && brand && name.startsWith(brand)) {
          name = name.slice(brand.length).trim(); // 앞에 중복된 브랜드 제거
        }
        const orgEl = li.querySelector('.tx_org .tx_num');
        const curEl = li.querySelector('.tx_cur .tx_num');
        return {
          goodsNo,
          brand,
          name: name ? name.replace(/\s+/g, ' ') : null,
          listPrice: toNum(orgEl?.textContent),
          salePrice: toNum(curEl?.textContent),
          url: a?.href || null,
          image: li.querySelector('img')?.src || null, // 썸네일 (CDN 직링크)
        };
      })
      .filter((it) => it.goodsNo);
  });
}

(async () => {
  const date = todayStr();
  const isSalePeriod = isSaleDay(date);

  console.log(
    `수집일: ${date} | 분류: ${isSalePeriod ? '세일가' : '현재가(평소)'}` +
      (FORCE_SALE ? ' (--sale 강제)' : '')
  );

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ locale: 'ko-KR', userAgent: UA });
  const page = await ctx.newPage();

  let total = 0;
  for (const cat of CATEGORIES) {
    try {
      const items = await scrapeCategory(page, cat);
      saveItems(items, { date, isSalePeriod, category: cat.name });
      total += items.length;
      console.log(`  [${cat.name}] ${items.length}개 저장`);
    } catch (e) {
      console.error(`  [${cat.name}] 실패: ${e.message}`);
    }
    await page.waitForTimeout(2000); // 사람처럼 간격 두기
  }

  await browser.close();
  console.log(`완료: 총 ${total}개 저장됨 → data.db`);
})();
