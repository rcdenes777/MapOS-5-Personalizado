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
function multipartBody(data, field, value) {
  const boundary = "mapos-pr4-" + crypto.randomBytes(12).toString("hex");
  const parts = Object.entries(data).flatMap(([key, text]) => [
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n`),
    key === field && value === null ? Buffer.from([0x4e, 0x6f, 0x74, 0x61, 0xff]) : Buffer.from(String(text)),
    Buffer.from("\r\n"),
  ]);
  return { headers: { "Content-Type": "multipart/form-data; boundary=" + boundary },
    data: Buffer.concat([...parts, Buffer.from(`--${boundary}--\r\n`)]) };
}
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
    const budgetPanel = (os = id) => base + "/index.php/trifase_orcamentos/visualizar/" + os;
    await visit(normal.page, budgetPanel());
    const publicationForm = normal.page.locator('form[action*="/publicar/"]');
    assert.equal(await publicationForm.count(), 1);
    await publicationForm.locator("[name=confirmar]").check();
    const publicationReplay = await publicationForm.evaluate(el => Object.fromEntries(new FormData(el)));
    const publicationEndpoint = await publicationForm.getAttribute("action");
    await Promise.all([
      normal.page.waitForNavigation(),
      publicationForm.getByRole("button", { name: "Publicar nova versão", exact: true }).click(),
    ]);
    const published = fixture("assert").current;
    assert.equal(published.budget_versions.length, 2);
    assert.equal(published.budget_events.filter(e => e.tipo === "publicar").length, 2);
    ok("real publication UI captured for historical replay after delivery");
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
    async function assertPublicationBlocked(label) {
      await visit(normal.page, budgetPanel());
      assert.equal(await normal.page.locator('form[action*="/publicar/"]').count(), 0);
      assert.equal(await normal.page.getByRole("button", { name: "Publicar nova versão", exact: true }).count(), 0);
      const before = fixture("assert").current;
      const denied = await post(normal, publicationEndpoint, { ...publicationReplay, operacao: op() });
      assert.equal(denied.status(), 422, "direct publication must be denied, not ACKed");
      assert(/entreg/i.test(await denied.text()), "delivery denial missing");
      assert.deepStrictEqual(fixture("assert").current, before, "denied publication changed version decision physical state or link");
      const ack = await post(normal, publicationEndpoint, publicationReplay);
      assert([302, 303].includes(ack.status()), "historical publication replay should ACK");
      assert.deepStrictEqual(fixture("assert").current, before, "historical publication replay duplicated or changed state");
      ok(label + " publication hidden direct CSRF POST denied historical replay ACK unchanged SQL");
    }
    await assertPublicationBlocked("delivered pending version");
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
      observacao: "NOTA-PRIVADA-F002\nsegunda linha <b data-private-f002-note>HTML privado & sintético</b>",
      justificativa:
        "JUSTIFICATIVA-PRIVADA-F002\ncomunicacao confirmada <i data-private-f002-reason>antes da retirada & privada</i>",
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
    const beforeInvalid = fixture("assert").current;
    // A fresh valid-CSRF request per case proves text validation, not CSRF rejection.
    for (const field of ["observacao", "justificativa"]) {
      for (const [label, value] of [
        ["NUL", "texto\0invalido"], ["C0", "texto\x01invalido"],
        ["tab", "texto\tinvalido"], ["CR isolado", "texto\rinvalido"],
        ["DEL", "texto\x7finvalido"], ["C1", "texto\u0085invalido"],
        ["bidi override", "texto\u202einvalido"], ["bidi isolate", "texto\u2066invalido"],
        ["size", "x".repeat(2001)], ["UTF8", null],
      ]) {
        await visit(reg.page);
        const invalid = { ...data, operacao: op(), MAPOS_TOKEN: await csrf(reg.page),
          [field]: value === null ? "invalid" : value };
        const response = await reg.ctx.request.post(endpoint, {
          headers: { "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded" },
          data: new URLSearchParams(invalid).toString().replace(field + "=invalid", field + "=invalid" + (value === null ? "%FF" : "")),
          maxRedirects: 0,
        });
        assert.equal(response.status(), 422, field + " " + label + " should be rejected");
        assert((await response.text()).includes(field === "observacao" ? "observação válida" : "justificativa válida"));
        assert.deepStrictEqual(fixture("assert").current, beforeInvalid, field + " " + label + " wrote state");
      }
    }
    for (const field of ["observacao", "justificativa"]) {
      for (const [label, value] of [["NUL", "Texto\0invalido"], ["C0", "Texto\x01invalido"],
        ["DEL", "Texto\x7finvalido"], ["UTF8", null], ["plain", "Texto válido"]]) {
        await visit(reg.page);
        const invalid = { ...data, operacao: op(), MAPOS_TOKEN: await csrf(reg.page), [field]: value === null ? "invalid" : value };
        const response = await reg.ctx.request.post(endpoint, { ...multipartBody(invalid, field, value), maxRedirects: 0 });
        assert.equal(response.status(), 422, "multipart " + field + " " + label + " must fail");
        assert((await response.text()).includes("Formato de comunicação não suportado"));
        assert.deepStrictEqual(fixture("assert").current, beforeInvalid, "multipart " + field + " " + label + " wrote state");
      }
    }
    ok("multipart rejected explicitly for both private fields with valid CSRF and no writes");
    await visit(reg.page);
    const withoutCsrf = { ...data, operacao: op() };
    delete withoutCsrf.MAPOS_TOKEN;
    r = await reg.ctx.request.post(endpoint, { form: withoutCsrf, maxRedirects: 0 });
    assert.equal(r.status(), 403);
    assert.deepStrictEqual(fixture("assert").current, beforeInvalid);
    ok("both private textareas reject controls bidi invalid UTF8 size and missing CSRF without writes");
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
      await form.locator((["observacao", "justificativa"].includes(key) ? "textarea" : "") + "[name=" + key + "]").fill(data[key]);
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
    for (const [field, marker] of [["observacao", "b data-private-f002-note"], ["justificativa", "i data-private-f002-reason"]]) {
      assert((await reg.page.locator("body").textContent()).includes(data[field]));
      assert((await reg.page.content()).includes("&lt;" + marker + "&gt;"));
    }
    assert.equal(await reg.page.locator("[data-private-f002-note], [data-private-f002-reason]").count(), 0);
    ok("real regularization UI stores multiline escaped private history");
    // Test normalization before idempotency hashing for BOTH textarea fields.
    const normalized = fixture("assert").current;
    const crlfReplay = { ...replay, observacao: data.observacao.replace(/\n/g, "\r\n"), justificativa: data.justificativa.replace(/\n/g, "\r\n") };
    r = await post(reg, endpoint, crlfReplay);
    assert([302, 303].includes(r.status()));
    assert.deepStrictEqual(fixture("assert").current, normalized, "CRLF replay wrote a duplicate");
    r = await post(reg, endpoint, replay);
    assert([302, 303].includes(r.status()));
    ok("identical regularization replay idempotent");
    r = await post(reg, endpoint, { ...replay, decisao: "recusar" });
    assert.equal(r.status(), 422);
    ok("conflicting replay rejected 422");
    r = await post(reg, endpoint, { ...replay, operacao: op() });
    assert.equal(r.status(), 422);
    ok("second decision new key rejected 422");
    await assertPublicationBlocked("delivered approved version");
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
    for (const url of [publicUrl, standalone]) {
      const response = await pubctx.request.get(url);
      assert.equal(response.status(), 200);
      const html = await response.text();
      for (const secret of ["NOTA-PRIVADA-F002", "JUSTIFICATIVA-PRIVADA-F002", "data-private-f002-note", "data-private-f002-reason", "F002 regularizador PRIVADO"])
        assert(!html.includes(secret), "private multiline text leaked in public HTML");
    }
    ok("both public pages omit multiline notes justification HTML and operator");
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
    assert.deepStrictEqual(sql.current.budget_versions, afterDelivery.current.budget_versions);
    assert.deepStrictEqual(sql.current.budget_state, afterDelivery.current.budget_state);
    assert.equal(sql.current.link_digest, afterDelivery.current.link_digest);
    assert.deepStrictEqual(sql.current.budget_events.filter(e => e.tipo === "publicar"), afterDelivery.current.budget_events);
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
    // Positive boundary: a finished OS without its OWN active delivery can still publish.
    const finishedBefore = fixture("assert").finished;
    assert.equal(finishedBefore.os.status, "Finalizado");
    assert.equal(finishedBefore.delivery.length, 0);
    await visit(normal.page, budgetPanel(f.finished));
    const finishedForm = normal.page.locator('form[action*="/publicar/"]');
    assert.equal(await finishedForm.count(), 1);
    await finishedForm.locator("[name=confirmar]").check();
    await Promise.all([normal.page.waitForNavigation(), finishedForm.getByRole("button", { name: "Publicar nova versão", exact: true }).click()]);
    const finishedAfter = fixture("assert").finished;
    assert.equal(finishedAfter.budget_versions.length, 1);
    assert.equal(finishedAfter.budget_events.filter(e => e.tipo === "publicar").length, 1);
    for (const key of ["os", "delivery", "delivery_state", "history", "services", "products", "stock", "financial", "link_digest"])
      assert.deepStrictEqual(finishedAfter[key], finishedBefore[key], "finished publication mutated " + key);
    ok("Finalizado without delivery publishes through UI and preserves physical workflow state");
    // Administrative correction is an audited HTTP operation, never a fixture DB edit.
    r = await post(normal, base + "/index.php/trifase_entregas/cancelar/" + id, {
      evento_id: String(sql.current.delivery[0].id), motivo: "F002 correcao sintetica de entrega indevida", operacao: op(),
    });
    assert.equal(r.status(), 200);
    assert.equal((await r.json()).result, true);
    const corrected = fixture("assert").current;
    assert.equal(corrected.delivery.length, 2);
    assert.equal(corrected.delivery[1].tipo, "cancelar");
    assert.deepStrictEqual(corrected.delivery_state, [], "correction must clear the active own-delivery pointer");
    assert.deepStrictEqual(corrected.budget_versions, sql.current.budget_versions);
    assert.deepStrictEqual(corrected.budget_events, sql.current.budget_events);
    for (const key of ["budget_state", "os", "history", "services", "products", "stock", "financial", "link_digest"])
      assert.deepStrictEqual(corrected[key], sql.current[key], "delivery correction mutated " + key);
    await visit(normal.page, budgetPanel());
    const reopened = normal.page.locator('form[action*="/publicar/"]');
    assert.equal(await reopened.count(), 1);
    await reopened.locator("[name=confirmar]").check();
    await Promise.all([normal.page.waitForNavigation(), reopened.getByRole("button", { name: "Publicar nova versão", exact: true }).click()]);
    const republished = fixture("assert").current;
    assert.equal(republished.budget_versions.length, corrected.budget_versions.length + 1);
    assert.equal(republished.budget_events.length, corrected.budget_events.length + 1);
    assert.equal(republished.budget_events.at(-1).tipo, "publicar");
    assert.notEqual(republished.budget_state[0].versao_id, corrected.budget_state[0].versao_id);
    assert.deepStrictEqual(republished.budget_events.filter(e => ["aprovar", "recusar"].includes(e.tipo)), sql.decisions);
    for (const key of ["os", "delivery", "delivery_state", "history", "services", "products", "stock", "financial", "link_digest"])
      assert.deepStrictEqual(republished[key], corrected[key], "republication mutated " + key);
    ok("audited delivery correction re-enables new publication preserving approval history and physical state");
    fs.writeFileSync(lab + "/f002-sql.json", JSON.stringify({ ...sql, corrected, republished, finishedAfter }, null, 2));
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
