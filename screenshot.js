
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
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  await autoScroll(page);

  const filename = `gemini_canvas_${Date.now()}.png`;
  await page.screenshot({ path: filename, fullPage: true });

  console.log(`✅ 截图已保存：${filename}`);
  await browser.close();
})();

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
