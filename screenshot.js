// ===== 1. 引入 puppeteer‑extra + stealth =========
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// ===== 2. 主流程 =================================
(async () => {
  const url = process.argv[2];
  if (!url || !url.startsWith('https://')) {
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

  // 隐藏 webdriver 痕迹
  await page.evaluateOnNewDocument(() =>
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  );

  await page.goto(url, { waitUntil: 'networkidle2' });

  // ===== 3. 找到并点击“Continue / 继续” ==================
  await clickContinue(page);          // <— 关键修改

  // ===== 4. 等真正 Canvas 内容出现 ======================
  await page.waitForSelector('h1', { timeout: 20000 }); // 题目 H1
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

// ========= 工具函数 ==================================

async function clickContinue(page) {
  const keywords = ['Continue', '继续', 'Try Gemini Canvas', 'Preview'];
  for (let i = 0; i < 5; i++) {
    // 尝试点击按钮
    const clicked = await page.evaluate(kws => {
      const btn = [...document.querySelectorAll('button, [role="button"], a')]
        .find(el => kws.some(k => (el.innerText || '').includes(k)));
      if (btn) { btn.click(); return true; }
      return false;
    }, keywords);

    // 如果点击成功，等待内容渲染再退出循环
    if (clicked) {
      await sleep(1200);
      break;
    }
    await sleep(400);
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(res => {
      let y = 0, step = 400;
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
const sleep = ms => new Promise(r => setTimeout(r, ms));



