const puppeteer = require('puppeteer');

(async () => {
  const url = process.argv[2];
  if (!url || !url.startsWith('https://')) {
    console.error('❌ 请传入有效的 Gemini Canvas 链接，例如：node screenshot.js https://g.co/gemini/share/xxxxx');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,8000'
    ]
  });

  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2' });

  // 等待主体
  await safeWait(() => page.waitForSelector('body', { timeout: 15000 }));

  // 连续尝试 3 次处理弹窗/按钮
  for (let i = 0; i < 3; i++) {
    await dismissModal(page);
    await sleep(800);
  }

  // 等待真正的 Canvas 内容出现（尝试常见选择器/文本）
  await waitCanvas(page);

  // 滚动到底部
  await autoScroll(page);

  // 再等一会儿，避免最后一屏没渲染完整
  await sleep(2000);

  const filename = `gemini_canvas_${Date.now()}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`✅ 截图已保存：${filename}`);

  await browser.close();
})().catch(err => {
  console.error('❌ 运行出错：', err);
  process.exit(1);
});

async function dismissModal(page) {
  await page.evaluate(() => {
    // 1) 删掉常见遮罩/弹窗
    document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
    document.querySelectorAll('div[aria-live="polite"]').forEach(el => el.remove());
  });

  // 2) 点击包含关键词的按钮
  await page.evaluate(() => {
    const keywords = ['Continue', '继续', 'Try Gemini', 'Try Gemini Canvas', 'Preview', '继续使用'];
    const clickable = Array.from(document.querySelectorAll('button, div[role="button"], a'));
    for (const btn of clickable) {
      const txt = (btn.innerText || btn.textContent || '').trim();
      if (!txt) continue;
      if (keywords.some(k => txt.includes(k))) {
        btn.click();
      }
    }
  });
}

async function waitCanvas(page) {
  // 等待页面上出现非登录文本、或主要容器
  await safeWait(() =>
    page.waitForFunction(() => {
      const text = document.body.innerText || '';
      const hasContent =
        text.length > 500 && !/Meet Gemini|Sign in|登录|继续|Try Gemini/.test(text);
      const possibleCanvas =
        document.querySelector('[data-testid*="canvas"]') ||
        document.querySelector('main section') ||
        document.querySelector('article');
      return hasContent && possibleCanvas;
    }, { timeout: 20000 })
  );
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const sh = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= sh - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 120);
    });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function safeWait(fn) {
  try { await fn(); } catch (_) {}
}


