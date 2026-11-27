// Checks the native lab OS equipment layout without modifying domain records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { guardLab } = require('./guard.cjs');
const base = 'http://127.0.0.1:18130';
const usersPath = '/home/dragonblue/workspace/mapos-r08-006-native-lab/private/users.json';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 639, 640, 641, 768, 1023, 1024, 1100, 1199, 1200, 1440, 1600]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      await guardLab(page);
      const user = JSON.parse(fs.readFileSync(usersPath, 'utf8')).admin;
      await page.locator('#email').fill(user.email);
      await page.locator('#senha').fill(user.password);
      await page.locator('#btn-acessar').click();
      await page.waitForURL(base + '/index.php/mapos');
      const response = await page.goto(base + '/index.php/os');
      assert.equal(response.status(), 200);
      const filter = page.locator('form[aria-label="Filtrar ordens de serviço"]');
      const searchBox = await filter.locator('[name="pesquisa"]').boundingBox();
      const statusBox = await filter.locator('[name="status"]').boundingBox();
      assert.ok(searchBox && searchBox.width >= 160, `search field too narrow at ${width}px`);
      if (statusBox) {
        assert.ok(searchBox.x + searchBox.width <= statusBox.x + 1 || searchBox.y + searchBox.height <= statusBox.y + 1, `filters overlap at ${width}px`);
        const labelsOverlap = await filter.evaluate(form => {
          const search = form.querySelector('[name="pesquisa"]');
          const status = form.querySelector('[name="status"]');
          const searchLabel = search.labels[0], statusLabel = status.labels[0];
          const range = document.createRange();
          range.selectNodeContents(searchLabel);
          const a = range.getBoundingClientRect(), b = statusLabel.getBoundingClientRect();
          return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        });
        assert.equal(labelsOverlap, false, `filter labels overlap at ${width}px`);
      }
      const row = page.locator('table:has(caption:text-is("Ordens de serviço")) tbody tr').first();
      const equipment = row.locator('td[data-label="Equipamento"]');
      const style = await equipment.evaluate(el => ({ display: getComputedStyle(el).display, align: getComputedStyle(el).textAlign }));
      const expectedDisplay = width < 640 ? 'block' : width < 1024 ? 'none' : 'table-cell';
      assert.equal(style.display, expectedDisplay, `equipment display at ${width}px`);
      if (width < 640) {
        assert.equal(style.align, 'left', `equipment alignment at ${width}px`);
        await page.emulateMedia({ media: 'print' });
        assert.equal(await equipment.evaluate(el => getComputedStyle(el).display), 'flex', `mobile overlay must not alter print at ${width}px`);
        await page.emulateMedia({ media: 'screen' });
        for (const label of ['Equipamento', 'Responsável']) {
          const properties = await row.locator(`td[data-label="${label}"]`).evaluate(el => {
            const computed = getComputedStyle(el);
            return { display: computed.display, whiteSpace: computed.whiteSpace, overflowWrap: computed.overflowWrap };
          });
          assert.deepEqual(properties, { display: 'block', whiteSpace: 'normal', overflowWrap: 'anywhere' }, `${label} wrapping at ${width}px`);
        }
      }
      for (const label of ['Nº', 'Cliente', 'Equipamento', 'Status', 'Ações']) {
        assert.equal(await row.locator(`td[data-label="${label}"]`).count(), 1, `${label} missing at ${width}px`);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}px`);
      if (width >= 1024 && width < 1200) {
        const tableOverflow = await row.evaluate(el => {
          const container = el.closest('.overflow-x-auto');
          return container.scrollWidth > container.clientWidth + 1;
        });
        assert.equal(tableOverflow, false, `OS table overflow at ${width}px`);
      }
      if (width >= 640 && width < 1024) {
        for (const label of ['Cliente', 'Equipamento', 'Responsável']) {
          const wrap = await row.locator(`td[data-label="${label}"]`).evaluate(el => getComputedStyle(el).overflowWrap);
          assert.equal(wrap, 'anywhere', `${label} wrapping at ${width}px`);
        }
      }
      if (width >= 640) {
        const values = [['Cliente', 100]];
        if (width >= 1024) values.unshift(['Equipamento', 60]);
        if (width >= 1536) values.push(['Responsável', 100]);
        for (const [label, length] of values) {
          const cell = row.locator(`td[data-label="${label}"]`);
          await cell.evaluate((el, n) => { (el.querySelector('a') || el).textContent = 'X'.repeat(n); }, length);
          const overflow = await cell.evaluate(el => {
            const container = el.closest('.overflow-x-auto');
            return { cell: el.scrollWidth > el.clientWidth + 1, table: container.scrollWidth > container.clientWidth + 1 };
          });
          assert.deepEqual(overflow, { cell: false, table: false }, `long ${label} overflow at ${width}px`);
        }
      }
      if (width < 640) {
        for (const label of ['Equipamento', 'Responsável', 'Cliente']) {
          const cell = row.locator(`td[data-label="${label}"]`);
          for (const value of ['X'.repeat(256), 'https://example.invalid/' + 'modelo/'.repeat(64)]) {
            await cell.evaluate((el, text) => { (el.querySelector('a') || el).textContent = text; }, value);
            const overflow = await cell.evaluate(el => {
              const container = el.closest('.overflow-x-auto');
              return { cell: el.scrollWidth > el.clientWidth + 1, table: container.scrollWidth > container.clientWidth + 1, page: document.documentElement.scrollWidth > innerWidth };
            });
            assert.deepEqual(overflow, { cell: false, table: false, page: false }, `long ${label} overflow at ${width}px`);
          }
        }
      }
      await row.locator('a[href*="/os/visualizar/"]').first().click();
      assert.match(new URL(page.url()).pathname, /^\/index\.php\/os\/visualizar\/\d+$/);
      await page.close();
    }
    console.log('native OS list: equipment layout, fields and detail navigation passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
