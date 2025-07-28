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
      '--window-size=1280,8000',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  await safeWait(() => page.waitForSelector('body', { timeout: 15000 }));

  // 连续尝试处理弹窗
  for (let i = 0; i < 3; i++) {
    await dismissModal(page);
    await sleep(800);
  }

  // 等待真正内容出现
  const mainHandle = await waitCanvasAndGetHandle(page);

  // 尝试整页截图
  const filename = `gemini_canvas_${Date.now()}.png`;
  try {
    await autoScroll(page);
    await sleep(1500);
    await page.screenshot({ path: filename, fullPage: true });
  } catch (e) {
    console.warn('⚠️ fullPage 截图失败，改为只截主容器：', e.message);
    if (mainHandle) {
      await mainHandle.screenshot({ path: filename });
    } else {
      throw e;
    }
  }

  console.log(`✅ 截图已保存：${filename}`);
  await browser.close();
})().catch(err => {
  console.error('❌ 运行出错：', err);
  process.exit(1);
});

async function dismissModal(page) {
  await page.evaluate(() => {
    // 1) 删除遮罩/弹窗
    document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
    document.querySelectorAll('div[aria-live="polite"]').forEach(el => el.remove());
  });

  // 2) 点击关键字按钮
  await page.evaluate(() => {
    const keywords = ['Continue', '继续', 'Try Gemini', 'Try Gemini Canvas', 'Preview', '继续使用'];
    const nodes = Array.from(document.querySelectorAll('button, [role="button"], a'));
    for (const n of nodes) {
      const t = (n.innerText || n.textContent || '').trim();
      if (!t) continue;
      if (keywords.some(k => t.includes(k))) {
        n.click();
      }
    }
  });
}

async function waitCanvasAndGetHandle(page) {
  // 等待文本量足够大且不是登录页的提示
  await safeWait(() =>
    page.waitForFunction(() => {
      const txt = (document.body.innerText || '').replace(/\s+/g, ' ');
      const enoughText = txt.length > 500;
      const notLogin = !/Meet Gemini|Sign in|登录|继续|Try Gemini/.test(txt);
      return enoughText && notLogin;
    }, { timeout: 20000 })
  );

  // 返回一个可能的主容器句柄
  const selectors = [
    '[data-testid*="canvas"]',
    'main section',
    'article',
    'main'
  ];
  for (const sel of selectors) {
    const h = await page.$(sel);
    if (h) return h;
  }
  return null;
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let total = 0;
      const step = 300;
      const timer = setInterval(() => {
        const sh = document.body.scrollHeight;
        window.scrollBy(0, step);
        total += step;
        if (total >= sh - window.innerHeight) {
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



