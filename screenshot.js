const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const url = process.argv[2];
  if (!url?.startsWith('https://')) {
    console.error('用法: node screenshot.js https://g.co/gemini/share/xxxxx');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1280,8000'
    ]
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );
  await page.evaluateOnNewDocument(() =>
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  );

  await page.goto(url, { waitUntil: 'networkidle2' });

  // 1️⃣ 递归查找 + 点击 Continue / 继续
  await clickContinueRecursive(page);

  // 2️⃣ 等待正文出现（文本长度>500 且不含 “Meet Gemini”）
  const hasBodyText = () =>
    (document.body.innerText || '').length > 500 &&
    !/Meet Gemini|个人 Assistant|Sign in|登录/.test(document.body.innerText);

  await page.waitForFunction(hasBodyText, { timeout: 30000 }).catch(() => {});

  // 3️⃣ 滚动 + 截图
  await autoScroll(page);
  await sleep(1200);
  const file = `gemini_canvas_${Date.now()}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`✅ 已保存 ${file}`);

  await browser.close();
})().catch(e => {
  console.error('❌ 失败：', e);
  process.exit(1);
});

/* ---------- 工具函数 ---------- */

async function clickContinueRecursive(page) {
  const keywords = ['Continue', '继续', 'Try Gemini Canvas', 'Preview'];

  // 点击顶层
  await clickKeywords(page, keywords);

  // 递归 iframe
  const frames = page.frames();
  for (const fr of frames) {
    try { await clickKeywords(fr, keywords); } catch (_) {}
  }
  await sleep(1200); // 给加载时间
}

async function clickKeywords(ctx, kws) {
  await ctx.evaluate(kwsArr => {
    const els = [...document.querySelectorAll('button,[role="button"],a')];
    els.forEach(el => {
      const t = (el.innerText || el.textContent || '').trim();
      if (kwsArr.some(k => t.includes(k))) el.click();
    });
  }, kws);
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(res => {
      let y = 0, step = 400;
      const t = setInterval(() => {
        window.scrollBy(0, step); y += step;
        if (y >= document.body.scrollHeight - window.innerHeight) {
          clearInterval(t); res();
        }
      }, 120);
    });
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));




