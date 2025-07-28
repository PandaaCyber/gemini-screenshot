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
      '--window-size=1280,4000'
    ]
  });

  const page = await browser.newPage();

  // 加载页面
  await page.goto(url, { waitUntil: 'networkidle2' });

  // 可选：等待页面关键元素（若你知道选择器可替换'body'）
  await page.waitForSelector('body', { timeout: 15000 });

  // 自动滚动，确保懒加载内容出现
  await autoScroll(page);

  // 额外等待，避免最后一屏还在渲染
  await page.waitForTimeout(2000);

  const filename = `gemini_canvas_${Date.now()}.png`;
  await page.screenshot({ path: filename, fullPage: true });

  console.log(`✅ 截图已保存：${filename}`);
  await browser.close();
})();

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 200;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
