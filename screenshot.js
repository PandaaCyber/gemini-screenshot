// 使用 puppeteer‑extra + stealth
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const url = process.argv[2];
  if (!url || !url.startsWith('https://')) {
    console.error('❌ 请输入有效 Gemini 链接，如: node screenshot.js https://g.co/gemini/share/xxxxx');
    process.exit(1);
  }

  // 启动浏览器
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

  // 伪装正常用户 UA
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  // 隐藏 webdriver 痕迹（保险起见）
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // 打开链接
  await page.goto(url, { waitUntil: 'networkidle2' });

  // 如有“Continue / 继续”按钮，自动点击 3 次
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const keywords = ['Continue', '继续', 'Preview', 'Try Gemini Canvas'];
      [...document.querySelectorAll('button, [role="button"], a')].forEach(el => {
        const txt = (el.innerText || el.textContent || '').trim();
        if (keywords.some(k => txt.includes(k))) el.click();
      });
    });
    await sleep(800);
  }

  // 等待真正内容加载：页面文本长度足够大
  await page.waitForFunction(
    () => (document.body.innerText || '').length > 500,
    { timeout: 20000 }
  );

  // 向下滚动加载全部懒加载元素
  await autoScroll(page);
  await sleep(1500);

  const filename = `gemini_canvas_${Date.now()}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`✅ 已保存 ${filename}`);

  await browser.close();
})().catch(err => {
  console.error('❌ 运行报错：', err);
  process.exit(1);
});

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(res => {
      let y = 0;
      const step = 400;
      const t = setInterval(() => {
        window.scrollBy(0, step);
        y += step;
        if (y >= document.body.scrollHeight - window.innerHeight) {
          clearInterval(t); res();
        }
      }, 120);
    });
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }



