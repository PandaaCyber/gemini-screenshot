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

  // 等待主体元素
  await waitSafe(page, () => page.waitForSelector('body', { timeout: 15000 }));

  // 处理弹窗（“Continue / Try Gemini”等）
  await dismissModal(page);

  // 滚动加载
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
  // 1) 直接删除遮罩层/弹窗
  await page.evaluate(() => {
    // 删除 role="dialog" 的弹窗
    document.querySelectorAll('[role="dialog"]').forEach(el => el.remove());
    // 删除底部登录提示条
    document.querySelectorAll('div[aria-live="polite"]').forEach(el => el.remove());
  });

  // 2) 如果按钮仍在，尝试点“Continue”或“继续”
  const candidates = [
    "//button[.//text()[contains(.,'Continue')]]",
    "//button[.//text()[contains(.,'继续')]]",
    "//button[.//text()[contains(.,'Try Gemini')]]",
    "//button[.//text()[contains(.,'继续使用')]]"
  ];

  for (const xp of candidates) {
    const btns = await page.$x(xp);
    if (btns.length) {
      try {
        await btns[0].click();
        await sleep(1500);
        break;
      } catch (_) {}
    }
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 250;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 120);
    });
  });
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function waitSafe(page, fn) {
  try { await fn(); } catch (_) {}
}

