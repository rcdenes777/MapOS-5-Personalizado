// Isolated F002: credentials stay in process; no traces or token URLs logged.
const fs = require("fs"),
  cp = require("child_process"),
  assert = require("assert"),
  crypto = require("crypto");
const { chromium } = require("playwright");
const path = require("path");
const lab =
    process.env.MAPOS_LAB_DIR ||
    path.resolve(__dirname, "../../../mapos5-orcamento-lab"),
  base = process.env.MAPOS_LAB_URL || "http://127.0.0.1:8230",
  checks = [];
assert(
  ["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname),
  "Only loopback lab URLs are permitted",
);
const fixture = (mode) =>
  JSON.parse(
    cp.execFileSync(
      "docker",
      [
        "exec",
        "-e",
        "F002_MODE=" + mode,
        "mapos5-orcamento-lab-php",
        "php",
        "-d",
        "variables_order=EGPCS",
        "/var/www/html/tests/Support/trifase_orcamento_entrega_regularizacao.php",
      ],
      { encoding: "utf8" },
    ),
  );
const ok = (n) => {
    checks.push(n);
    console.log("PASS " + n);
  },
  op = () => crypto.randomBytes(16).toString("hex");
(async () => {
  let browser;
  try {
    const f = fixture("create"),
      id = f.os;
    browser = await chromium.launch({ headless: true });
    async function login(role) {
      const ctx = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        page = await ctx.newPage();
      await page.goto(base + "/index.php/login");
      await page.locator("[name=email]").fill(f.roles[role].email);
      await page.locator("[name=senha]").fill(f.roles[role].password);
      await Promise.all([
        page.waitForURL("**/mapos"),
        page.locator("button[type=submit]").click(),
      ]);
      return { ctx, page };
    }
    const normal = await login("normal"),
      reg = await login("regularizador"),
      low = await login("negado");
    ok("three synthetic exact-permission profiles normal CSRF login");
    const share =
        base + "/index.php/os/visualizar/" + id + "?secao=compartilhamento",
      endpoint =
        base + "/index.php/trifase_orcamentos/regularizar_resposta/" + id;
    async function visit(p, url = share) {
      await p.goto(url);
      await p.waitForLoadState("networkidle");
    }
    async function csrf(p) {
      const field = p.locator("[name=MAPOS_TOKEN]").first();
      if (await field.count()) return field.inputValue();
      const cookie = (await p.context().cookies()).find(
        (c) => c.name === "MAPOS_COOKIE",
      );
      assert(cookie, "CSRF cookie missing");
      return cookie.value;
    }
    async function post(actor, url, data) {
      await visit(actor.page);
      return actor.ctx.request.post(url, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
        form: { ...data, MAPOS_TOKEN: await csrf(actor.page) },
        maxRedirects: 0,
      });
    }
    async function screenshot(p, name) {
      if (name.includes("mobile")) {
        await p.reload();
        await p.waitForLoadState("networkidle");
      }
      await p
        .locator("input[readonly]")
        .evaluateAll((es) =>
          es.forEach((e) => (e.style.visibility = "hidden")),
        );
      await p.screenshot({
        path: lab + "/f002-" + name + ".png",
        fullPage: true,
      });
      const dimensions = await p.evaluate(() => ({
        innerWidth,
        root: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      fs.writeFileSync(
        lab + "/f002-" + name + "-dimensions.json",
        JSON.stringify(dimensions, null, 2),
      );
      assert(
        dimensions.root <= dimensions.innerWidth &&
          dimensions.body <= dimensions.innerWidth,
        "horizontal overflow " + name + " " + JSON.stringify(dimensions),
      );
      ok("layout " + name + " no horizontal overflow");
    }
    await visit(normal.page);
    const internal = normal.page.locator('form[action*="registrar_resposta"]');
    assert.equal(await internal.count(), 1);
    await normal.page
      .getByText("Registrar resposta do cliente", { exact: true })
      .click();
    const internalData = await internal.evaluate((el) =>
      Object.fromEntries(new FormData(el)),
    );
    ok("normal internal response form before delivery");
    await Promise.all([
      normal.page.waitForNavigation(),
      normal.page
        .getByRole("button", { name: "Gerar link público", exact: true })
        .click(),
    ]);
    await visit(normal.page);
    const publicUrl = await normal.page
      .getByRole("link", { name: "Abrir link", exact: true })
      .getAttribute("href");
    assert(publicUrl);
    const pubctx = await browser.newContext(),
      pub = await pubctx.newPage();
    await visit(pub, publicUrl);
    const budgetLink = pub.locator('a[href*="orcamento_publico"]');
    let budgetUrl = publicUrl;
    if (await budgetLink.count())
      budgetUrl = await budgetLink.first().getAttribute("href");
    await visit(pub, budgetUrl);
    const publicForm = pub.locator('form[action*="responder"]');
    assert.equal(await publicForm.count(), 1);
    const publicData = await publicForm.evaluate((el) =>
        Object.fromEntries(new FormData(el)),
      ),
      publicEndpoint = await publicForm.getAttribute("action");
    ok("public budget and response form before delivery");
    await visit(
      normal.page,
      base + "/index.php/os/visualizar/" + id + "?secao=entrega",
    );
    await normal.page.getByText("Registrar entrega", { exact: true }).click();
    const delivery = normal.page.locator(
      'form[data-os-acao=entrega][action*="registrar"]',
    );
    const deliveryTime = await delivery
      .locator("[name=entregue_em]")
      .inputValue();
    await delivery.locator("[name=recebedor]").fill("Cliente Sintetico F002");
    await delivery
      .locator("[name=itens]")
      .fill("Equipamento sintetico e acessorios");
    await delivery.locator("[name=confirmou_condicoes]").check();
    const responsePromise = normal.page.waitForResponse(
      (r) =>
        r.url().includes("trifase_entregas/registrar") &&
        r.request().method() === "POST",
    );
    await Promise.all([
      normal.page.waitForNavigation(),
      delivery
        .getByRole("button", { name: "Confirmar entrega", exact: true })
        .click(),
    ]);
    const dr = await responsePromise;
    assert.equal(dr.status(), 200);
    assert((dr.headers()["content-type"] || "").includes("application/json"));
    await visit(
      normal.page,
      base + "/index.php/os/visualizar/" + id + "?secao=entrega",
    );
    assert(
      (await normal.page.locator("body").innerText()).includes(
        "Entrega registrada",
      ),
    );
    ok("real delivery UI JSON endpoint persisted");
    const afterDelivery = fixture("assert");
    assert.equal(afterDelivery.current.delivery.length, 1);
    assert.equal(afterDelivery.decisions.length, 0);
    await screenshot(normal.page, "delivery-desktop");
    await normal.page.setViewportSize({ width: 393, height: 852 });
    await screenshot(normal.page, "delivery-mobile393");
    await visit(normal.page);
    assert.equal(
      await normal.page.locator('form[action*="registrar_resposta"]').count(),
      0,
    );
    assert.equal(
      await normal.page.locator('form[action*="regularizar_resposta"]').count(),
      0,
    );
    assert(
      (await normal.page.locator("body").innerText()).includes(
        "somente para consulta",
      ),
    );
    ok("normal forms absent and read-only notice after delivery");
    await visit(pub, budgetUrl);
    assert.equal(await pub.locator('form[action*="responder"]').count(), 0);
    assert(
      (await pub.locator("body").innerText()).includes("Diagnostico Sintetico"),
    );
    ok("public response absent but budget items consultable");
    const standalone =
      base +
      "/index.php/orcamento_publico/ver/" +
      new URL(publicUrl).pathname.split("/").pop();
    await visit(pub, standalone);
    assert.equal(await pub.locator('form[action*="responder"]').count(), 0);
    assert(
      (await pub.locator("body").innerText()).includes("somente para consulta"),
    );
    ok("standalone public budget also read-only after delivery");
    // Public read-only screen has no form; obtain fresh CSRF from ordinary login in same anonymous cookie jar.
    await pub.goto(base + "/index.php/login");
    publicData.MAPOS_TOKEN = await csrf(pub);
    let r = await pubctx.request.post(publicEndpoint, {
      form: {
        ...publicData,
        decisao: "aprovar",
        nome: "Cliente Sintetico F002",
        confirmar: "1",
      },
      maxRedirects: 0,
    });
    assert.equal(r.status(), 422);
    ok("public direct POST valid CSRF rejected 422 after delivery");
    const data = {
      ...internalData,
      decisao: "aprovar",
      nome: "Cliente Sintetico F002",
      confirmar: "1",
      canal: "telefone",
      comunicado_em: deliveryTime,
      observacao: "NOTA-PRIVADA-F002",
      justificativa:
        "JUSTIFICATIVA-PRIVADA-F002 comunicacao confirmada antes da retirada",
      operacao: op(),
    };
    r = await post(
      normal,
      base + "/index.php/trifase_orcamentos/registrar_resposta/" + id,
      data,
    );
    assert([302, 303].includes(r.status()));
    assert.equal(fixture("assert").decisions.length, 0);
    ok("internal ordinary direct POST creates no decision after delivery");
    for (const actor of [normal, low]) {
      r = await post(actor, endpoint, { ...data, operacao: op() });
      assert.equal(
        r.status(),
        403,
        "regularization actor " +
          (actor === normal ? "normal" : "negado") +
          " location " +
          (r.headers().location || "none").replace(/https?:\/\/[^/]+/, "") +
          " body " +
          (await r.text())
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .slice(0, 250),
      );
      assert.equal(
        await actor.page
          .locator('form[action*="regularizar_resposta"]')
          .count(),
        0,
      );
    }
    ok(
      "normal and denied profiles regularization valid-CSRF POST 403 and form absent",
    );
    await visit(reg.page);
    assert.equal(
      await reg.page.locator('form[action*="regularizar_resposta"]').count(),
      1,
    );
    ok("regularizer exclusive late form visible");
    r = await post(reg, endpoint, {
      ...data,
      comunicado_em: "2099-01-01T12:00",
      operacao: op(),
    });
    assert.equal(r.status(), 422);
    ok("future communication rejected 422");
    r = await post(reg, endpoint, {
      ...data,
      versao: String(f.version + 999999),
      operacao: op(),
    });
    assert.equal(r.status(), 422);
    ok("obsolete version rejected 422");
    // Minute-precision UI: equality with delivery is valid. Wait for the following minute to independently test nonfuture but post-delivery communication.
    const nowText = cp.execFileSync(
      "docker",
      [
        "exec",
        "mapos5-orcamento-lab-php",
        "php",
        "-r",
        'echo date("Y-m-d\\TH:i");',
      ],
      { encoding: "utf8" },
    );
    if (nowText <= deliveryTime)
      await new Promise((resolve) => setTimeout(resolve, 61000));
    const later = cp.execFileSync(
      "docker",
      [
        "exec",
        "mapos5-orcamento-lab-php",
        "php",
        "-r",
        'echo date("Y-m-d\\TH:i");',
      ],
      { encoding: "utf8" },
    );
    assert(later > deliveryTime);
    r = await post(reg, endpoint, {
      ...data,
      comunicado_em: later,
      operacao: op(),
    });
    assert.equal(r.status(), 422);
    assert((await r.text()).includes("posterior"));
    assert.equal(fixture("assert").decisions.length, 0);
    ok(
      "nonfuture communication after actual delivery rejected 422 without write",
    );
    await visit(reg.page);
    await reg.page
      .getByText("Regularização administrativa tardia", { exact: true })
      .click();
    const form = reg.page.locator('form[action*="regularizar_resposta"]');
    for (const key of ["nome", "comunicado_em", "observacao", "justificativa"])
      await form.locator("[name=" + key + "]").fill(data[key]);
    await form.locator("[name=decisao]").selectOption("aprovar");
    await form.locator("[name=canal]").selectOption("telefone");
    await form.locator("[name=confirmar]").check();
    const replay = await form.evaluate((el) =>
      Object.fromEntries(new FormData(el)),
    );
    await Promise.all([
      reg.page.waitForNavigation(),
      form
        .getByRole("button", {
          name: "Registrar regularização tardia",
          exact: true,
        })
        .click(),
    ]);
    await reg.page.waitForLoadState("networkidle");
    assert(
      (await reg.page.locator("body").innerText()).includes(
        "NOTA-PRIVADA-F002",
      ),
    );
    ok("real regularization UI stores late decision and private history");
    r = await post(reg, endpoint, replay);
    assert([302, 303].includes(r.status()));
    ok("identical regularization replay idempotent");
    r = await post(reg, endpoint, { ...replay, decisao: "recusar" });
    assert.equal(r.status(), 422);
    ok("conflicting replay rejected 422");
    r = await post(reg, endpoint, { ...replay, operacao: op() });
    assert.equal(r.status(), 422);
    ok("second decision new key rejected 422");
    await visit(reg.page);
    await screenshot(reg.page, "regularization-desktop");
    await reg.page.setViewportSize({ width: 393, height: 852 });
    await screenshot(reg.page, "regularization-mobile393");
    await visit(pub, budgetUrl);
    const publicText = await pub.locator("body").innerText();
    assert(publicText.toLowerCase().includes("aprov"));
    for (const secret of [
      "NOTA-PRIVADA-F002",
      "JUSTIFICATIVA-PRIVADA-F002",
      "F002 regularizador PRIVADO",
    ])
      assert(!publicText.includes(secret));
    ok(
      "public late decision consultable without private notes justification or operator",
    );
    await screenshot(pub, "public-desktop");
    await pub.setViewportSize({ width: 393, height: 852 });
    await screenshot(pub, "public-mobile393");
    const sql = fixture("assert");
    assert.equal(sql.decisions.length, 1);
    const decision = sql.decisions[0];
    assert.equal(Number(decision.regularizacao_tardia), 1);
    assert.equal(Number(decision.usuario_id), f.roles.regularizador.id);
    assert.equal(
      decision.comunicado_em,
      deliveryTime.replace("T", " ") + ":00",
    );
    assert(decision.criado_em >= sql.current.delivery[0].registrado_em);
    assert.equal(
      Number(decision.entrega_id),
      Number(sql.current.delivery[0].id),
    );
    assert.equal(decision.observacao, data.observacao);
    assert.equal(decision.justificativa, data.justificativa);
    for (const key of [
      "os",
      "delivery",
      "delivery_state",
      "history",
      "services",
      "products",
      "stock",
      "financial",
    ])
      assert.deepStrictEqual(
        sql.current[key],
        afterDelivery.current[key],
        key + " mutated after delivery",
      );
    for (const key of [
      "os",
      "history",
      "services",
      "products",
      "stock",
      "financial",
    ])
      assert.deepStrictEqual(
        sql.current[key],
        sql.baseline[key],
        key + " mutated from publication baseline",
      );
    ok(
      "SQL exactly one late decision operator timestamps delivery and all OS finance stock invariants intact",
    );
    fs.writeFileSync(lab + "/f002-sql.json", JSON.stringify(sql, null, 2));
    fs.writeFileSync(
      lab + "/f002-results.json",
      JSON.stringify(
        {
          status: "PASS",
          count: checks.length,
          checks,
          os: id,
          minutePrecision:
            "Communication equal to withdrawal minute accepted; all event timestamps real, no backdating.",
        },
        null,
        2,
      ),
    );
  } catch (e) {
    const error = String(e).replace(/https?:\/\/\S+/g, "[URL REDACTED]");
    fs.writeFileSync(
      lab + "/f002-results.json",
      JSON.stringify(
        { status: "FAIL", count: checks.length, checks, error },
        null,
        2,
      ),
    );
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
