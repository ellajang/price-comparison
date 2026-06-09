// 올리브영 카테고리별 베스트 가격 수집 → SQLite 저장
// 베스트 페이지를 한 번만 연 뒤(=Cloudflare 1회 통과), 카테고리 탭을 순회 클릭하며 수집한다.
const { chromium } = require('playwright');
const { saveItems, getWatchlist } = require('./db');

// 올리브영 정기 세일(올영세일)은 "월 전체"가 아니라 며칠짜리 행사다.
// 세일 공지가 뜨면 그 날짜 구간을 여기에 추가하세요. 이 구간에 수집한 가격만 "세일가"로 기록됨.
// 평소(상시 할인가)는 그냥 "현재가"로 저장됩니다.
const SALE_PERIODS = [
  // { start: '2026-05-30', end: '2026-06-05' },  // 예: 2026 6월 올영세일
];

// 날짜 구간에 안 넣어도, 세일 중에 `node scrape.js --sale` 로 실행하면 강제로 세일가로 기록됨.
const FORCE_SALE = process.argv.includes('--sale');

// 베스트 랭킹 진입점(전체). 여기서 카테고리 탭을 읽어 순회한다.
const BEST_URL =
  'https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const LIST_SELECTOR = '.cate_prd_list > li';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// 베스트 페이지를 열고 상품 리스트가 뜰 때까지 대기. Cloudflare 차단 시 컨텍스트를 새로 만들어 재시도.
async function openBestPage(browser, maxTries = 3) {
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    const ctx = await browser.newContext({ locale: 'ko-KR', userAgent: UA });
    const page = await ctx.newPage();
    try {
      await page.goto(BEST_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector(LIST_SELECTOR, { timeout: 20000 });
      return page; // 통과
    } catch (e) {
      const title = await page.title().catch(() => '');
      console.error(`  초기 로드 시도 ${attempt}/${maxTries} 실패 (title: "${title}")`);
      await ctx.close();
      if (attempt === maxTries) {
        throw new Error('Cloudflare 통과 실패 — 잠시 후 다시 시도하세요');
      }
      await sleep(5000); // 잠깐 쉬고 새 세션으로 재시도
    }
  }
}

// 베스트 페이지 상단 카테고리 탭 목록을 동적으로 읽는다. (탭이 추가돼도 자동 반영)
// 탭 버튼: <button data-ref-dispcatno="10000010009">마스크팩</button> — 11자리가 상위 카테고리.
function readCategoryTabs(page) {
  return page.evaluate(() => {
    const EXCLUDE = new Set(['장바구니', '전체']); // 탭에 섞인 비(非)카테고리 버튼
    const seen = new Map();
    document.querySelectorAll('button[data-ref-dispcatno]').forEach((b) => {
      const no = b.getAttribute('data-ref-dispcatno') || '';
      const name = (b.textContent || '').trim().replace(/\s+/g, ' ');
      if (/^\d{11}$/.test(no) && name && !EXCLUDE.has(name) && !seen.has(no)) seen.set(no, name);
    });
    return Array.from(seen, ([dispCatNo, name]) => ({ dispCatNo, name }));
  });
}

// 현재 렌더된 상품 리스트를 추출 (탭 클릭 후 호출)
function extractCurrentList(page) {
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

// 카테고리 탭을 클릭하고 리스트가 재렌더되길 기다린 뒤 추출
async function scrapeCategory(page, cat) {
  const clicked = await page.evaluate((no) => {
    const b = document.querySelector(`button[data-ref-dispcatno="${no}"]`);
    if (!b) return false;
    b.click();
    return true;
  }, cat.dispCatNo);
  if (!clicked) throw new Error('탭 버튼을 찾지 못함');
  await page.waitForTimeout(3000); // AJAX 재렌더 대기 (인페이지 전환, Cloudflare 재챌린지 없음)
  return extractCurrentList(page);
}

// 관심 상품의 상세 페이지로 직접 방문해 현재가 추출 (순위 밖이어도 추적)
async function scrapeDetail(page, product) {
  await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(4000);
  const data = await page.evaluate(() => {
    const toNum = (s) => {
      if (!s) return null;
      const n = s.replace(/[^0-9]/g, '');
      return n ? parseInt(n, 10) : null;
    };
    // CSS 모듈 해시는 바뀔 수 있어 클래스 접두로 매칭
    const pick = (re) => {
      for (const el of document.querySelectorAll('[class*="GoodsDetailInfo_price"]')) {
        if (re.test(el.className)) return el.textContent;
      }
      return null;
    };
    return {
      listPrice: toNum(pick(/GoodsDetailInfo_price-before/)), // 정가(취소선)
      salePrice: toNum(pick(/GoodsDetailInfo_price__/)), // 현재 판매가
    };
  });
  if (data.salePrice == null) throw new Error('가격 추출 실패(페이지 구조 변경?)');
  return {
    goodsNo: product.goods_no,
    brand: product.brand,
    name: product.name,
    url: product.url,
    image: product.image_url, // 기존 썸네일 유지 (null로 덮어쓰지 않도록)
    listPrice: data.listPrice,
    salePrice: data.salePrice,
  };
}

(async () => {
  const date = todayStr();
  const isSalePeriod = isSaleDay(date);

  console.log(
    `수집일: ${date} | 분류: ${isSalePeriod ? '세일가' : '현재가(평소)'}` +
      (FORCE_SALE ? ' (--sale 강제)' : '')
  );

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await openBestPage(browser);
    const cats = await readCategoryTabs(page);
    console.log(`카테고리 ${cats.length}개 발견: ${cats.map((c) => c.name).join(', ')}`);

    let total = 0;
    const failed = [];
    const seenToday = new Set(); // 이번 베스트 수집에서 본 goodsNo
    for (const cat of cats) {
      try {
        const items = await scrapeCategory(page, cat);
        if (items.length === 0) {
          failed.push(cat.name);
          console.error(`  [${cat.name}] 0개 (재렌더 실패 추정)`);
        } else {
          items.forEach((it) => seenToday.add(it.goodsNo));
          saveItems(items, { date, isSalePeriod, category: cat.name });
          total += items.length;
          console.log(`  [${cat.name}] ${items.length}개 저장`);
        }
      } catch (e) {
        failed.push(cat.name);
        console.error(`  [${cat.name}] 실패: ${e.message}`);
      }
      await page.waitForTimeout(2000); // 사람처럼 간격 두기
    }

    // 관심 상품 중 베스트에 없던 것 → 상세페이지로 직접 추적 (순위 밖이어도 가격 갱신)
    const dropped = getWatchlist().filter((w) => w.url && !seenToday.has(w.goods_no));
    if (dropped.length) {
      console.log(`관심 상품 중 베스트 밖 ${dropped.length}개 → 상세페이지로 추적`);
      for (const w of dropped) {
        try {
          const item = await scrapeDetail(page, w);
          saveItems([item], { date, isSalePeriod, category: w.category ?? '관심상품' });
          total += 1;
          console.log(`  ⭐ ${(w.name ?? '').slice(0, 28)} → ${item.salePrice}원`);
        } catch (e) {
          console.error(`  ⭐ ${(w.name ?? '').slice(0, 20)} 실패: ${e.message}`);
        }
        await page.waitForTimeout(2000);
      }
    }

    console.log(`완료: 총 ${total}개 수집 (중복 상품은 last-wins로 병합) → data.db`);
    if (failed.length) console.log(`실패한 카테고리: ${failed.join(', ')}`);
    if (total === 0) process.exitCode = 1; // 한 건도 못 받으면 실패로 알림 (스케줄/모니터링용)
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
