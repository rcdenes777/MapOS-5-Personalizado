const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      for (const route of ['#inicio', '#ordens']) {
        await page.goto(`http://127.0.0.1:${server.address().port}/${route}`);
        const notice = page.locator('[data-demo-notice]');
        assert.equal(await notice.isVisible(), true, `notice missing at ${width}px ${route}`);
        assert.equal(await notice.innerText(), 'Demonstração: não conectada ao MapOS. Os dados são fictícios e ficam neste navegador.');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}px ${route}`);
        await page.emulateMedia({ media: 'print' });
        assert.equal(await notice.isVisible(), true, `demo notice missing in print at ${width}px ${route}`);
        await page.emulateMedia({ media: 'screen' });
      }
      await page.close();
    }
    console.log('demo notice visible on mobile and desktop routes without horizontal overflow');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
