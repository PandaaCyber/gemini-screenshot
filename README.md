
# Gemini Screenshot with Puppeteer

使用 Puppeteer 自动截图 Google Gemini Canvas 页面。

## ✅ 特点

- 自动加载页面内容（包括懒加载）
- 支持滚动至底部再截图
- 输出高清 PNG 图片

## 🧰 环境要求

- Node.js >= 16
- npm

## 🚀 使用方式

1. 下载本项目代码

2. 安装依赖

```bash
npm install
```

3. 执行截图命令

```bash
node screenshot.js https://g.co/gemini/share/你的链接ID
```

输出：当前目录下生成 `gemini_canvas_时间戳.png`
