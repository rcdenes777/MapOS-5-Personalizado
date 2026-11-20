// Isolated lab only; normal browser login, no credential/token logging.
const fs = require("fs"),
  cp = require("child_process"),
  assert = require("assert");
const { chromium } = require("playwright");
const path = require("path");
const lab =
    process.env.MAPOS_LAB_DIR ||
    path.resolve(__dirname, "../../../mapos5-orcamento-lab"),
  base = process.env.MAPOS_LAB_URL || "http://127.0.0.1:8230";
assert(
  ["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname),
  "Only loopback lab URLs are permitted",
);
const checks = [];
const note = "NOTA-PRIVADA-F001\nsegunda linha <b data-private-f001>HTML privado & sintético</b>";
function multipartBody(data, field, value) {
  const boundary = "mapos-pr4-" + require("crypto").randomBytes(12).toString("hex");
  const parts = Object.entries(data).flatMap(([key, text]) => [
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n`),
    key === field && value === null ? Buffer.from([0x4e, 0x6f, 0x74, 0x61, 0xff]) : Buffer.from(String(text)),
    Buffer.from("\r\n"),
  ]);
  return { headers: { "Content-Type": "multipart/form-data; boundary=" + boundary },
    data: Buffer.concat([...parts, Buffer.from(`--${boundary}--\r\n`)]) };
}
const state = () => JSON.parse(cp.execFileSync("docker", [
  "exec", "-e", "CANAIS_MODE=assert", "mapos5-orcamento-lab-php", "php",
  "-d", "variables_order=EGPCS", "/var/www/html/tests/Support/trifase_orcamento_canais.php",
], { encoding: "utf8" }));
const ok = (n) => {
  checks.push(n);
  console.log("PASS " + n);
};
(async () => {
  let browser;
  try {
    cp.execFileSync("docker", [
      "exec",
      "mapos5-orcamento-lab-php",
      "php",
      "-d",
      "variables_order=EGPCS",
      "/var/www/html/tests/Support/trifase_orcamento_canais.php",
    ]);
    const fixture = JSON.parse(
      cp.execFileSync(
        "docker",
        [
          "exec",
          "mapos5-orcamento-lab-php",
          "php",
          "-r",
          "echo file_get_contents('/lab/orcamento-canais-private.json');",
        ],
        { encoding: "utf8" },
      ),
    );
    const creds = fixture,
      id = fixture.os;
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      }),
      page = await ctx.newPage();
    async function login(p, c) {
      await p.goto(base + "/index.php/login");
      await p.locator("[name=email]").fill(c.email);
      await p.locator("[name=senha]").fill(c.password);
      await Promise.all([
        p.waitForURL("**/mapos"),
        p.locator("button[type=submit]").click(),
      ]);
    }
    await login(page, creds);
    ok("normal browser login");
    const share = () =>
      base + "/index.php/os/visualizar/" + id + "?secao=compartilhamento";
    let publicUrl;
    for (const canal of ["telefone", "whatsapp", "presencial"])
      for (const decisao of ["aprovar", "recusar"]) {
        const panelResponse = await page.goto(
          base + "/index.php/trifase_orcamentos/visualizar/" + id,
        );
        await page.waitForLoadState("networkidle");
        if (panelResponse.status() === 503) {
          await page.screenshot({
            path: lab + "/orcamento-canais-schema-blocked.png",
            fullPage: true,
          });
          const diagnostic = JSON.parse(
            cp.execFileSync(
              "docker",
              [
                "exec",
                "-e",
                "CANAIS_MODE=diagnostic",
                "mapos5-orcamento-lab-php",
                "php",
                "-d",
                "variables_order=EGPCS",
                "/var/www/html/tests/Support/trifase_orcamento_canais.php",
              ],
              { encoding: "utf8" },
            ),
          );
          fs.writeFileSync(
            lab + "/orcamento-canais-schema-blocker.json",
            JSON.stringify({ http: 503, ...diagnostic }, null, 2),
          );
          throw new Error(
            "HTTP 503 schema gate: pending " + diagnostic.pending.join(", "),
          );
        }
        const pub = page.locator('form[action*="/publicar/"]');
        if ((await pub.count()) !== 1)
          console.log(
            "PUBLICATION DIAGNOSTIC " +
              (await page.locator("body").innerText()).slice(0, 3000),
          );
        assert.equal(await pub.count(), 1, "publication form missing");
        await pub.locator("[name=confirmar]").check();
        await Promise.all([
          page.waitForNavigation(),
          pub.locator("button[type=submit]").click(),
        ]);
        await page.goto(share());
        await page.waitForLoadState("networkidle");
        if (!publicUrl) {
          await Promise.all([
            page.waitForNavigation(),
            page
              .getByRole("button", { name: "Gerar link público", exact: true })
              .click(),
          ]);
          await page.goto(share());
          publicUrl = await page
            .getByRole("link", { name: "Abrir link", exact: true })
            .getAttribute("href");
          assert(publicUrl);
          ok("UI publish and generate link");
        }
        await page
          .getByText("Registrar resposta do cliente", { exact: true })
          .click();
        const f = page.locator('form[action*="registrar_resposta"]');
        await f.locator("[name=decisao]").selectOption(decisao);
        await f.locator("[name=canal]").selectOption(canal);
        await f.locator("[name=nome]").fill("Cliente Sintetico F001");
        const max = await f.locator("[name=comunicado_em]").getAttribute("max");
        await f.locator("[name=comunicado_em]").fill(max);
        await f.locator("textarea[name=observacao]").fill(note);
        await f.locator("[name=confirmar]").check();
        const payload = await f.evaluate((el) =>
          Object.fromEntries(new FormData(el)),
        );
        const endpoint = await f.getAttribute("action");
        if (checks.length === 2) {
          const missing = { ...payload };
          delete missing.MAPOS_TOKEN;
          const bad = await browser.newContext(),
            bp = await bad.newPage();
          await login(bp, creds);
          assert.equal(
            (
              await bad.request.post(endpoint, {
                form: missing,
                maxRedirects: 0,
              })
            ).status(),
            403,
          );
          await bad.close();
          ok("missing CSRF 403");
        }
        if (canal === "telefone" && decisao === "aprovar") {
          const before = state();
          for (const [label, value] of [
            ["NUL", "nota\0invalida"], ["C0", "nota\x01invalida"],
            ["tab", "nota\tinvalida"], ["CR isolado", "nota\rinvalida"],
            ["DEL", "nota\x7finvalida"], ["C1", "nota\u0085invalida"],
            ["bidi override", "nota\u202einvalida"],
            ["bidi isolate", "nota\u2066invalida"],
            ["size", "x".repeat(2001)], ["UTF8", null],
          ]) {
            await page.goto(share());
            const invalid = { ...payload, operacao: require("crypto").randomBytes(16).toString("hex"),
              MAPOS_TOKEN: await page.locator("[name=MAPOS_TOKEN]").first().inputValue(),
              observacao: value === null ? "invalid" : value };
            const response = await ctx.request.post(endpoint, value === null ? {
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              data: new URLSearchParams(invalid).toString().replace("observacao=invalid", "observacao=invalid%FF"),
            } : { form: invalid });
            assert.equal(response.status(), 200, "internal rejection must redirect to the ordinary screen");
            assert((await response.text()).includes("observação válida"), label + " missing validation error");
            assert.deepStrictEqual(state(), before, label + " changed persistent state");
          }
          ok("observation controls bidi invalid UTF8 and size rejected without writes");
          for (const [label, value] of [["NUL", "Nota\0invalida"], ["C0", "Nota\x01invalida"],
            ["DEL", "Nota\x7finvalida"], ["UTF8", null], ["plain", "Nota válida"]]) {
            await page.goto(share());
            const invalid = { ...payload, operacao: require("crypto").randomBytes(16).toString("hex"),
              MAPOS_TOKEN: await page.locator("[name=MAPOS_TOKEN]").first().inputValue(),
              observacao: value === null ? "invalid" : value };
            const response = await ctx.request.post(endpoint, multipartBody(invalid, "observacao", value));
            assert.equal(response.status(), 200);
            assert((await response.text()).includes("Formato de comunicação não suportado"), "multipart " + label + " was not explicitly rejected");
            assert.deepStrictEqual(state(), before, "multipart " + label + " wrote a decision");
          }
          ok("multipart plain NUL C0 DEL invalid UTF8 explicitly rejected with valid CSRF and no writes");
          await page.goto(share());
          await page.getByText("Registrar resposta do cliente", { exact: true }).click();
          await f.evaluate((el, values) => {
            for (const [key, value] of Object.entries(values)) {
              if (["MAPOS_TOKEN", "confirmar"].includes(key)) continue;
              el.elements.namedItem(key).value = value;
            }
          }, payload);
          await f.locator("[name=confirmar]").check();
        }
        await Promise.all([
          page.waitForNavigation(),
          f.getByRole("button", { name: "Salvar resposta" }).click(),
        ]);
        await page.waitForLoadState("networkidle");
        assert(
          (await page.locator("body").innerText()).includes(
            "NOTA-PRIVADA-F001",
          ),
          "decision not saved: " +
            (await page.locator("body").innerText())
              .replace(/https?:\/\/\S+/g, "[URL REDACTED]")
              .slice(0, 1800),
        );
        let csrf = await page
          .locator("[name=MAPOS_TOKEN]")
          .first()
          .inputValue();
        payload.MAPOS_TOKEN = csrf;
        // Exercise both wire encodings explicitly, not just browser serialization.
        const saved = state();
        for (const observation of [note, note.replace(/\n/g, "\r\n")]) {
          await page.goto(share());
          payload.MAPOS_TOKEN = await page.locator("[name=MAPOS_TOKEN]").first().inputValue();
          const replayResponse = await ctx.request.post(endpoint, { form: { ...payload, observacao: observation } });
          assert.equal(replayResponse.status(), 200);
          assert((await replayResponse.text()).includes("Resposta registrada na versão"), "LF/CRLF replay must ACK, not just leave state unchanged");
          assert.deepStrictEqual(state(), saved, "LF/CRLF replay duplicated or changed decision");
        }
        ok(canal + " " + decisao + " UI and replay");
        await page.goto(
          base + "/index.php/trifase_orcamentos/visualizar/" + id,
        );
        assert(
          (await page.locator("body").innerText()).includes(
            "NOTA-PRIVADA-F001",
          ),
        );
        const privateHtml = await page.content();
        assert(privateHtml.includes("&lt;b data-private-f001&gt;"), "private HTML not escaped");
        assert.equal(await page.locator("[data-private-f001]").count(), 0);
        assert((await page.locator("body").textContent()).includes(note));
        ok(canal + " " + decisao + " internal multiline escaped history");
        const pc = await browser.newContext(),
          pp = await pc.newPage();
        await pp.goto(publicUrl);
        await pp.waitForLoadState("networkidle");
        const text = await pp.locator("body").innerText();
        assert(!text.includes("NOTA-PRIVADA-F001"));
        assert(!text.includes("Operador #" + fixture.operator));
        const standalone = base + "/index.php/orcamento_publico/ver/" + new URL(publicUrl).pathname.split("/").pop();
        for (const url of [publicUrl, standalone]) {
          const response = await pc.request.get(url);
          assert.equal(response.status(), 200);
          const html = await response.text();
          for (const secret of ["NOTA-PRIVADA-F001", "segunda linha", "data-private-f001"])
            assert(!html.includes(secret), "private observation leaked in public HTML");
        }
        assert(
          text.includes(
            canal === "telefone"
              ? "por telefone"
              : canal === "whatsapp"
                ? "por WhatsApp"
                : "presencialmente",
          ),
          "public channel attribution missing",
        );
        assert(
          text.includes("Comunicação informada pela equipe"),
          "public communication provenance missing",
        );
        assert(
          text
            .toLowerCase()
            .includes(decisao === "aprovar" ? "aprov" : "recus"),
          "public decision missing",
        );
        if (canal === "telefone" && decisao === "aprovar") {
          await page.goto(share());
          await page
            .locator("input[readonly]")
            .evaluateAll((es) =>
              es.forEach((e) => (e.style.visibility = "hidden")),
            );
          await page.screenshot({
            path: lab + "/orcamento-canais-desktop.png",
            fullPage: true,
          });
          await pp.setViewportSize({ width: 393, height: 852 });
          await pp.screenshot({
            path: lab + "/orcamento-canais-mobile393.png",
            fullPage: true,
          });
          assert(
            await pp.evaluate(
              () => document.documentElement.scrollWidth <= 393,
            ),
            "mobile overflow",
          );
          ok("desktop and mobile393");
          const conflict = { ...payload, decisao: "recusar" };
          await page.goto(share());
          conflict.MAPOS_TOKEN = await page
            .locator("[name=MAPOS_TOKEN]")
            .first()
            .inputValue();
          let r = await ctx.request.post(endpoint, { form: conflict });
          assert((await r.text()).includes("Chave já utilizada"));
          ok("conflicting operation rejected");
          const invalid = {
            ...payload,
            canal: "email",
            operacao: "invalid-channel-f001-123456",
          };
          await page.goto(share());
          invalid.MAPOS_TOKEN = await page
            .locator("[name=MAPOS_TOKEN]")
            .first()
            .inputValue();
          r = await ctx.request.post(endpoint, { form: invalid });
          assert((await r.text()).includes("Informe o canal"));
          ok("invalid channel rejected");
          const anon = await browser.newContext(),
            ap = await anon.newPage();
          await ap.goto(base + "/index.php/login");
          const ac = await ap.locator("[name=MAPOS_TOKEN]").inputValue();
          r = await anon.request.post(endpoint, {
            form: { ...payload, MAPOS_TOKEN: ac },
          });
          assert(r.url().includes("/login"));
          await anon.close();
          ok("anonymous denied with valid CSRF");
          const low = await browser.newContext(),
            lp = await low.newPage();
          await login(lp, fixture.restricted);
          await lp.goto(base + "/index.php/os/visualizar/" + id);
          const lc = await lp.evaluate(() => {
            const n = document.querySelector(
              'meta[name="csrf-cookie-name"]',
            ).content;
            return decodeURIComponent(
              document.cookie
                .split(";")
                .map((s) => s.trim())
                .find((s) => s.startsWith(n + "="))
                .slice(n.length + 1),
            );
          });
          r = await low.request.post(endpoint, {
            headers: { "X-Requested-With": "XMLHttpRequest" },
            form: { ...payload, MAPOS_TOKEN: lc },
            maxRedirects: 0,
          });
          assert.equal(r.status(), 403);
          await low.close();
          ok("restricted profile direct POST valid CSRF 403");
        }
        await pc.close();
        ok(canal + " " + decisao + " public decision and private note hidden");
      }
    const sql = JSON.parse(
      cp.execFileSync(
        "docker",
        [
          "exec",
          "-e",
          "CANAIS_MODE=assert",
          "mapos5-orcamento-lab-php",
          "php",
          "-d",
          "variables_order=EGPCS",
          "/var/www/html/tests/Support/trifase_orcamento_canais.php",
        ],
        { encoding: "utf8" },
      ),
    );
    assert.equal(sql.count, 6);
    for (const row of sql.decisions) {
      assert.equal(row.usuario_id, fixture.operator);
      assert(row.comunicado_em && row.criado_em);
      assert.equal(row.observacao, note, "CRLF must persist canonically as LF");
    }
    ok("MySQL six decisions persisted exactly once with operator and dates");
    fs.writeFileSync(
      lab + "/orcamento-canais-sql.json",
      JSON.stringify(sql, null, 2),
    );
    fs.writeFileSync(
      lab + "/orcamento-canais-results.json",
      JSON.stringify({ status: "PASS", count: checks.length, checks }, null, 2),
    );
  } catch (e) {
    fs.writeFileSync(
      lab + "/orcamento-canais-results.json",
      JSON.stringify(
        {
          status: "FAIL",
          count: checks.length,
          checks,
          error: String(e).replace(/https?:\/\/\S+/g, "[URL REDACTED]"),
        },
        null,
        2,
      ),
    );
    console.error(
      "FAIL " + String(e).replace(/https?:\/\/\S+/g, "[URL REDACTED]"),
    );
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
