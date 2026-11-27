// R08-007: administrator OS list at two viewports, synthetic lab, external requests blocked.
// Read-only: normal login session only; no domain writes.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { chromium } = require('playwright');
const { guardLab } = require('../../referencias/laboratorio/guard.cjs');

const base = 'http://127.0.0.1:18130';
const usersPath = '/home/dragonblue/workspace/mapos-r08-006-native-lab/private/users.json';
const outDir = __dirname;

async function restrictToLab(page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === base ? route.continue() : route.abort();
  });
}

(async () => {
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const vp of [{ width: 390, height: 900 }, { width: 1440, height: 900 }]) {
      const page = await browser.newPage({ viewport: vp });
      await restrictToLab(page);
      await guardLab(page);
      await page.locator('#email').fill(users.admin.email);
      await page.locator('#senha').fill(users.admin.password);
      await page.locator('#btn-acessar').click();
      await page.waitForURL(base + '/index.php/mapos');
      const response = await page.goto(base + '/index.php/os');
      await page.waitForLoadState('networkidle');
      const title = await page.locator('h1').first().innerText();
      const m = await page.evaluate(() => {
        const search = document.querySelector('form[aria-label="Filtrar ordens de serviço"] [name="pesquisa"]');
        const box = search ? search.getBoundingClientRect() : null;
        const detail = document.querySelector('tbody a[href*="/os/visualizar/"]') || document.querySelector('a[href*="/os/visualizar/"]');
        const dbox = detail ? detail.getBoundingClientRect() : null;
        let hit = null;
        if (detail && dbox.width > 0) {
          const cx = dbox.x + dbox.width / 2, cy = dbox.y + dbox.height / 2;
          const at = document.elementFromPoint(cx, cy);
          hit = !!at && (at === detail || detail.contains(at));
        }
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          search: box && {
            width: box.width, height: box.height, x: box.x, y: box.y,
            visible: !!(search.offsetWidth || search.offsetHeight),
            inViewport: box.x >= 0 && box.x + box.width <= window.innerWidth,
          },
          action: dbox && {
            label: detail.getAttribute('aria-label') || detail.textContent.trim(),
            width: dbox.width, height: dbox.height,
            visible: !!(detail.offsetWidth || detail.offsetHeight),
            hittable: hit,
          },
          rows: document.querySelectorAll('tbody tr').length,
          detailLinks: document.querySelectorAll('a[href*="/os/visualizar/"]').length,
        };
      });
      const file = path.join(outDir, `os-lista-admin-${vp.width}x${vp.height}.png`);
      await page.screenshot({ path: file, fullPage: false });
      const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      results.push({
        viewport: `${vp.width}x${vp.height}`,
        url: page.url(),
        status: response.status(),
        h1: title,
        screenshot: path.basename(file),
        sha256,
        ...m,
        assertions: {
          no_overflow: m.overflow <= 0,
          search_visible: !!(m.search && m.search.visible && m.search.inViewport && m.search.width >= 120),
          action_usable: !!(m.action && m.action.visible && m.action.hittable && m.action.width >= 24 && m.action.height >= 24),
        },
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(outDir, 'capturas-os.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
  if (results.some(r => Object.values(r.assertions).includes(false))) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
