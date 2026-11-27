// Read-only OS list/detail characterization against the isolated synthetic lab.
// This creates only normal login sessions; it does not write domain records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { guardLab } = require('./guard.cjs');

const base = 'http://127.0.0.1:18130';
const usersPath = '/home/dragonblue/workspace/mapos-r08-006-native-lab/private/users.json';

async function restrictToLab(page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === base ? route.continue() : route.abort();
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const anonymous = await browser.newPage();
    await restrictToLab(anonymous);
    await guardLab(anonymous);
    for (const path of ['/index.php/os', '/index.php/os/visualizar/10']) {
      const response = await anonymous.request.get(base + path, { maxRedirects: 0 });
      assert.equal(response.status(), 307, `anonymous access to ${path}`);
      assert.equal(new URL(response.headers().location, base).href, base + '/index.php/login');
    }
    await anonymous.close();

    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    for (const role of ['admin', 'tecnico']) {
      const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
      await restrictToLab(page);
      await guardLab(page);
      await page.locator('#email').fill(users[role].email);
      await page.locator('#senha').fill(users[role].password);
      await page.locator('#btn-acessar').click();
      await page.waitForURL(base + '/index.php/mapos');
      const list = await page.goto(base + '/index.php/os');
      assert.equal(list.status(), 200, `${role}: OS list status`);
      assert.equal(await page.locator('h1').first().innerText(), 'Ordens de serviço');
      const totalCells = await page.locator('td[data-label="Total"]').count();
      if (role === 'admin') assert.ok(totalCells > 0, 'admin: expected visible total column');
      else assert.equal(totalCells, 0, 'technician: total column must not appear');
      const firstEquipment = page.locator('td[data-label="Equipamento"]').first();
      assert.equal(await firstEquipment.evaluate(el => getComputedStyle(el).display), 'block', `${role}: mobile equipment layout`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${role}: mobile overflow`);
      await page.setViewportSize({ width: 1024, height: 900 });
      const search = await page.locator('form[aria-label="Filtrar ordens de serviço"] [name="pesquisa"]').boundingBox();
      assert.ok(search && search.width >= 160, `${role}: tablet search width`);
      const detail = new URL(await page.locator('a[href*="/os/visualizar/"]').first().getAttribute('href'), base);
      assert.equal(detail.origin, base);
      assert.match(detail.pathname, /^\/index\.php\/os\/visualizar\/\d+$/);
      const id = detail.pathname.split('/').pop();
      const response = await page.goto(detail.href);
      assert.equal(response.status(), 200, `${role}: OS detail status`);
      assert.equal(new URL(page.url()).pathname, detail.pathname, `${role}: detail redirect`);
      assert.match(await page.locator('h1').first().innerText(), new RegExp(`\\bOS\\s*#?0*${id}\\b`, 'i'));
      const matched = await page.goto(base + '/index.php/os?pesquisa=' + encodeURIComponent(id));
      assert.equal(matched.status(), 200, `${role}: matching search status`);
      assert.ok(await page.locator(`a[href$="/os/visualizar/${id}"]`).count(), `${role}: matching OS absent`);
      const empty = await page.goto(base + '/index.php/os?pesquisa=INEXISTENTE-987654');
      assert.equal(empty.status(), 200, `${role}: empty search status`);
      assert.equal(await page.getByText('Nenhuma OS encontrada', { exact: true }).count(), 1, `${role}: empty search`);
      await page.close();
    }
    console.log('native lab: anonymous redirects and admin/technician list, detail and empty search passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
