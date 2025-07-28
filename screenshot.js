const puppeteer = require('puppeteer');

(async () => {
  const url = process.argv[2];
  if (!url || !/^https?:\/\//.test(url)) {
    console.error('❌ 请输入有效链接：node screenshot.js https://g.co/gemini/share/xxxx');
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
      '--lang=zh-CN,zh,en-US,en'
    ]
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await safeWait(() => page.waitForSelector('body', { timeout: 15000 }));

  // 尝试最多 5 次去掉登录/继续弹窗
  for (let i = 0; i < 5; i++) {
    await dismissModal(page);
    // 如果已进入内容就退出循环
    if (await isCanvasVisible(page)) break;
    await sleep(1200);
  }

  // 再判断一次内容是否出来
  if (!(await isCanvasVisible(page))) {
    console.warn('⚠️ 仍未检测到 Canvas，继续滚动并强制截图首页（可能灰屏）');
  }

  await autoScroll(page);
  await sleep(1500);

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
    // 1. 删除常见弹层/遮罩
    document.querySelectorAll('[role="dialog"], [aria-modal="true"], .modal, .scrim, .c7m2af').forEach(el => el.remove());
    // 2. 删除底部“Sign in”提示条
    document.querySelectorAll('div[aria-live="polite"], [data-testid*="signin"]').forEach(el => el.remove());
    // 3. 清理 body 禁止滚动属性
    document.body.style.overflow = 'auto';
  });

  // 4. 点击包含关键字的按钮
  await page.evaluate(() => {
    const keywords = ['Continue', '继续', 'Try Gemini', 'Try Gemini Canvas', 'Preview', '继续使用'];
    const nodes = Array.from(document.querySelectorAll('button, div[role="button"], a'));
    for (const n of nodes) {
      const txt = (n.innerText || n.textContent || '').trim();
      if (!txt) continue;
      if (keywords.some(k => txt.includes(k))) {
        n.click();
      }
    }
  });
}

async function isCanvasVisible(page) {
  // 逻辑：页面文本足够长 & 没有“Meet Gemini / Sign in”等明显首页词
  return page.evaluate(() => {
    const txt = (document.body.innerText || '').replace(/\s+/g, ' ');
    const tooShort = txt.length < 800; // 内容太短说明没加载
    const hasHomeWords = /Meet Gemini|your personal AI assistant|Sign in|登录|Try Gemini/i.test(txt);
    return !tooShort && !hasHomeWords;
  });
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let total = 0;
      const step = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight - window.innerHeight) {
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



