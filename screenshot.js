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
      '--window-size=1280,6000'
    ]
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  await safeWait(() => page.waitForSelector('body', { timeout: 15000 }));

  // 干掉遮罩 & 点击“Continue/继续”
  await dismissModal(page);

  // 下拉到最底部以加载所有内容
  await autoScroll(page);

  // 再等一下，确保最后渲染完成
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
  // 直接在页面中移除常见弹窗 / 遮罩
  await page.evaluate(() => {
    // 删除所有 role="dialog" 的节点
    document.querySelectorAll('[role="dialog"]').forEach(el => el.remove());
    // 底部提示条
    document.querySelectorAll('div[aria-live="polite"]').forEach(el => el.remove());
  });

  // 再尝试点击包含关键字的按钮
  await page.evaluate(() => {
    const keywords = ['Continue', '继续', 'Try Gemini', '继续使用', 'Try Gemini Canvas'];
    const buttons = Array.from(document.querySelectorAll('button, div[role="button"], a'));
    for (const btn of buttons) {
      const txt = (btn.innerText || btn.textContent || '').trim();
      if (!txt) continue;
      if (keywords.some(k => txt.includes(k))) {
        btn.click();
        break;
      }
    }
  });

  // 给点击一些时间
  await sleep(1500);
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 250;
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

