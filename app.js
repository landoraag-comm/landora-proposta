(function () {
  "use strict";

  let D = window.PROPOSTA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const params = new URLSearchParams(location.search);
  const slug = (params.get("p") || "").trim().toLowerCase();
  let cliente = "";
  let byId = {};
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Ícones ---------- */
  const ICONS = {
    page: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 14h6"/>',
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    card: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 11h20M6 16h4"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.7A8 8 0 1 1 21 12z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.2 2.3 3.5 5.2"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    cart: '<path d="M3 4h2l2.2 11h10.6L20 7H6"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
    zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ICONS.page}</svg>`;

  /* ---------- Estado ---------- */
  let KEY = "";
  const state = { now: [], later: [], filtro: "todos", assinado: null };
  const prev = { now: [], later: [] };

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw) {
        state.now = (raw.now || []).filter((id) => byId[id]);
        state.later = (raw.later || []).filter((id) => byId[id] && !state.now.includes(id));
      }
    } catch (e) { /* sem storage: segue só em memória */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ now: state.now, later: state.later })); } catch (e) {}
  }

  const sum = (ids) =>
    ids.reduce((a, id) => ({ unico: a.unico + byId[id].preco, mensal: a.mensal + byId[id].mensal }), { unico: 0, mensal: 0 });

  /* ---------- Animação de números ---------- */
  function tween(el, to, fmt) {
    if (!el) return;
    const from = el._cur ?? 0;
    el._cur = to;
    cancelAnimationFrame(el._raf);
    if (reduce || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 650;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }
  const bump = (el) => {
    if (!el || reduce) return;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  };

  /* ---------- Toast ---------- */
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 1900);
  }

  /* ---------- Ações ---------- */
  function setList(id, list) {
    const m = byId[id];
    const inNow = state.now.includes(id);
    const inLater = state.later.includes(id);
    state.now = state.now.filter((x) => x !== id);
    state.later = state.later.filter((x) => x !== id);
    if (list === "now" && !inNow) { state.now.push(id); toast(m.nome + " no contrato"); }
    else if (list === "later" && !inLater) { state.later.push(id); toast(m.nome + " guardado para depois"); }
    state.assinado = null;
    save();
    const el = cardEls[id];
    if (el && !reduce) {
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    }
    update();
  }

  /* ---------- Filtros ---------- */
  function renderFiltros() {
    const box = $("#filtros");
    box.innerHTML = "";
    D.categorias.forEach((c) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      b.role = "tab";
      b.textContent = c.nome;
      b.setAttribute("aria-selected", String(state.filtro === c.id));
      b.addEventListener("click", () => {
        if (state.filtro === c.id) return;
        state.filtro = c.id;
        renderFiltros();
        buildGrid();
      });
      box.appendChild(b);
    });
  }

  /* ---------- Vitrine ---------- */
  const cardEls = {};

  function priceHTML(m) {
    const parts = [];
    if (m.preco > 0) parts.push(`<strong>${brl(m.preco)}</strong><span>único</span>`);
    if (m.mensal > 0) {
      if (m.preco > 0) parts.push(`<span>+ ${brl(m.mensal)}/mês</span>`);
      else parts.push(`<strong>${brl(m.mensal)}</strong><span>/mês</span>`);
    }
    return parts.join("");
  }

  function createCard(m, i) {
    const el = document.createElement("article");
    el.className = "card";
    el.style.setProperty("--i", i);
    el.innerHTML = `
      ${m.imagens && m.imagens[0] ? `<button type="button" class="card-cover" aria-label="Ver detalhes"><img alt="" loading="lazy" src="${esc(m.imagens[0])}"></button>` : ""}
      <div class="card-top">
        <div class="card-ico">${icon(m.icone)}</div>
        <span class="tag"></span>
      </div>
      <h3></h3>
      <p></p>
      ${m.detalhes || (m.imagens && m.imagens.length) ? '<button type="button" class="link-btn card-more">Ver detalhes</button>' : ""}
      <div class="price">${priceHTML(m)}</div>
      <div class="card-actions">
        <button type="button" class="btn btn-primary btn-now"></button>
        <button type="button" class="btn btn-later"></button>
      </div>`;
    $("h3", el).textContent = m.nome;
    $("p", el).textContent = m.desc;
    const openDet = () => openDetails(m.id);
    const mb = $(".card-more", el), cv = $(".card-cover", el);
    if (mb) mb.addEventListener("click", openDet);
    if (cv) cv.addEventListener("click", openDet);
    $(".btn-now", el).addEventListener("click", () => setList(m.id, state.now.includes(m.id) ? null : "now"));
    $(".btn-later", el).addEventListener("click", () => setList(m.id, state.later.includes(m.id) ? null : "later"));
    el.addEventListener("animationend", (e) => { if (e.animationName === "pop") el.classList.remove("pop"); });
    return el;
  }

  function buildGrid() {
    const grid = $("#grid");
    grid.innerHTML = "";
    Object.keys(cardEls).forEach((k) => delete cardEls[k]);
    D.modulos
      .filter((m) => state.filtro === "todos" || m.categoria === state.filtro)
      .forEach((m, i) => {
        const el = createCard(m, i);
        cardEls[m.id] = el;
        grid.appendChild(el);
      });
    syncCards();
  }

  function syncCards() {
    Object.entries(cardEls).forEach(([id, el]) => {
      const inNow = state.now.includes(id), inLater = state.later.includes(id);
      el.classList.toggle("is-now", inNow);
      el.classList.toggle("is-later", inLater);
      $(".tag", el).textContent = inNow ? "No contrato" : inLater ? "Para depois" : "";
      const bn = $(".btn-now", el), bl = $(".btn-later", el);
      bn.textContent = inNow ? "No contrato" : "Adicionar";
      bn.setAttribute("aria-pressed", String(inNow));
      bl.textContent = inLater ? "Reservado" : "Depois";
      bl.setAttribute("aria-pressed", String(inLater));
    });
  }

  // brilho que segue o mouse nos cards
  $("#grid").addEventListener("pointermove", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", e.clientX - r.left + "px");
    card.style.setProperty("--my", e.clientY - r.top + "px");
  });

  /* ---------- Detalhes do módulo (modal) ---------- */
  let detId = null;
  function openDetails(id) {
    const m = byId[id];
    if (!m) return;
    detId = id;
    const imgs = m.imagens || [];
    $("#det-main").hidden = !imgs.length;
    if (imgs.length) $("#det-main").src = imgs[0];
    $("#det-thumbs").innerHTML = imgs.length > 1 ? imgs.map((u, i) => `<button type="button" class="${i ? "" : "on"}" data-i="${i}"><img alt="" src="${esc(u)}"></button>`).join("") : "";
    $("#det-ico").innerHTML = icon(m.icone);
    $("#det-title").textContent = m.nome;
    $("#det-desc").textContent = m.desc || "";
    $("#det-more").textContent = m.detalhes || "";
    $("#det-price").innerHTML = priceHTML(m);
    syncDet();
    const box = $("#mod-det");
    box.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => box.classList.add("on"));
    $(".det-close", box).focus();
  }
  function closeDetails() {
    const box = $("#mod-det");
    box.classList.remove("on");
    document.body.classList.remove("modal-open");
    setTimeout(() => { if (!box.classList.contains("on")) box.hidden = true; }, 260);
    detId = null;
  }
  function syncDet() {
    if (!detId) return;
    const inNow = state.now.includes(detId), inLater = state.later.includes(detId);
    const bn = $("#det-now"), bl = $("#det-later");
    bn.textContent = inNow ? "No contrato ✓" : "Adicionar ao contrato";
    bn.setAttribute("aria-pressed", String(inNow));
    bl.textContent = inLater ? "Reservado ✓" : "Guardar para depois";
    bl.setAttribute("aria-pressed", String(inLater));
  }
  $("#det-thumbs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (!b) return;
    $("#det-main").src = byId[detId].imagens[+b.dataset.i];
    $$("#det-thumbs button").forEach((x) => x.classList.toggle("on", x === b));
  });
  $("#det-now").addEventListener("click", () => { setList(detId, state.now.includes(detId) ? null : "now"); syncDet(); });
  $("#det-later").addEventListener("click", () => { setList(detId, state.later.includes(detId) ? null : "later"); syncDet(); });
  $("#mod-det").addEventListener("click", (e) => { if (e.target.matches("#mod-det, .det-close")) closeDetails(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && detId) closeDetails(); });

  /* ---------- Carrinhos ---------- */
  function renderCartList(ul, ids, prevIds, moveTo, moveLabel) {
    ul.innerHTML = "";
    if (!ids.length) {
      const li = document.createElement("li");
      li.className = "cart-empty";
      li.textContent = "Nenhum módulo ainda.";
      ul.appendChild(li);
      return;
    }
    ids.forEach((id) => {
      const m = byId[id];
      const li = document.createElement("li");
      if (!prevIds.includes(id)) li.className = "new";
      li.innerHTML = `<div class="nm"><b></b><span></span></div>
        <button class="mini" type="button" title="${moveLabel}" aria-label="${moveLabel}">⇄</button>
        <button class="mini" type="button" title="Remover" aria-label="Remover">×</button>`;
      $("b", li).textContent = m.nome;
      $("span", li).textContent = [m.preco ? brl(m.preco) : null, m.mensal ? brl(m.mensal) + "/mês" : null].filter(Boolean).join(" + ");
      const [mv, rm] = li.querySelectorAll(".mini");
      mv.addEventListener("click", () => setList(id, moveTo));
      rm.addEventListener("click", () => setList(id, null));
      ul.appendChild(li);
    });
  }

  function renderCart() {
    renderCartList($("#lista-now"), state.now, prev.now, "later", "Mover para Depois");
    renderCartList($("#lista-later"), state.later, prev.later, "now", "Mover para o Contrato");
    prev.now = state.now.slice();
    prev.later = state.later.slice();

    const tn = sum(state.now), tl = sum(state.later);
    tween($("#tn-unico"), tn.unico, brl);
    tween($("#tn-mensal"), tn.mensal, brl);
    tween($("#tl-unico"), tl.unico, brl);
    tween($("#tl-mensal"), tl.mensal, brl);
    $("#tl-box").classList.toggle("off", !state.later.length);
    $("#ir-assinar").disabled = !state.now.length;

    // hero (cartões flutuantes)
    tween($("#hv-now"), tn.unico, brl);
    tween($("#hv-later"), tl.unico, brl);
    tween($("#hv-mensal"), tn.mensal, brl);
    $("#hv-now-n").textContent = state.now.length;
    $("#hv-later-n").textContent = state.later.length;

    $("#ft-sum").textContent = state.now.length
      ? state.now.length + (state.now.length === 1 ? " módulo" : " módulos") + " no contrato · " + brl(tn.unico) + (tn.mensal ? " + " + brl(tn.mensal) + "/mês" : "")
      : "Nenhum módulo no contrato ainda";

    // barra mobile
    $("#bar-count").textContent = state.now.length + state.later.length;
    tween($("#bar-total"), tn.unico, brl);
    bump($("#bar-count"));
    bump($("#tn-unico"));
  }

  /* ---------- Contrato ---------- */
  function renderContrato() {
    const has = state.now.length > 0;
    const signed = !!state.assinado;
    $("#contrato-vazio").hidden = has;
    $("#contrato-form").hidden = !has || signed;
    $("#contrato-ok").hidden = !signed;
    if (!has) return;

    const rows = $("#resumo-linhas");
    rows.innerHTML = "";
    state.now.forEach((id, i) => {
      const m = byId[id];
      const tr = document.createElement("tr");
      tr.style.animationDelay = i * 50 + "ms";
      tr.innerHTML = "<td></td><td class='num'></td><td class='num'></td>";
      tr.children[0].textContent = m.nome;
      tr.children[1].textContent = m.preco ? brl(m.preco) : "—";
      tr.children[2].textContent = m.mensal ? brl(m.mensal) : "—";
      rows.appendChild(tr);
    });
    const t = sum(state.now);
    $("#resumo-total").innerHTML = `<tr><td>Total</td><td class="num">${brl(t.unico)}</td><td class="num">${brl(t.mensal)}</td></tr>`;
  }

  function update() {
    syncCards();
    syncDet();
    renderCart();
    renderContrato();
  }

  /* ---------- Assinatura ---------- */
  const pad = $("#sign-pad");
  const ctx = pad.getContext("2d");
  let drawing = false, hasInk = false;

  function resetPad() {
    ctx.clearRect(0, 0, pad.width, pad.height);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#ffffff";
    hasInk = false;
    $(".sign").classList.remove("has-ink");
  }
  function pos(e) {
    const r = pad.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * pad.width, y: ((e.clientY - r.top) / r.height) * pad.height };
  }
  pad.addEventListener("pointerdown", (e) => {
    drawing = true;
    pad.setPointerCapture(e.pointerId);
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
    hasInk = true;
    $(".sign").classList.add("has-ink");
  });
  pad.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => pad.addEventListener(ev, () => { drawing = false; }));
  $("#sign-clear").addEventListener("click", resetPad);

  // CPF/CNPJ com máscara simples
  $("#f-doc").addEventListener("input", (e) => {
    const d = e.target.value.replace(/\D/g, "").slice(0, 14);
    e.target.value =
      d.length <= 11
        ? d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2")
        : d.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  });

  function erro(msg) {
    const el = $("#form-erro");
    el.hidden = !msg;
    el.textContent = msg;
    if (msg) { el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; }
  }

  function resumoTexto(a) {
    const t = sum(state.now), tl = sum(state.later);
    const linhas = state.now.map((id) => `• ${byId[id].nome} — ${byId[id].preco ? brl(byId[id].preco) : ""}${byId[id].mensal ? (byId[id].preco ? " + " : "") + brl(byId[id].mensal) + "/mês" : ""}`);
    let txt = `*Contrato Landora* — ${a.protocolo}\nCliente: ${cliente}\nAssinado por: ${a.nome} (${a.doc})\nData: ${a.data}\n\n*Contrato (agora)*\n${linhas.join("\n")}\n\nTotal: ${brl(t.unico)}${t.mensal ? " + " + brl(t.mensal) + "/mês" : ""}`;
    if (state.later.length) {
      txt += `\n\n*Reservado para depois*\n${state.later.map((id) => "• " + byId[id].nome).join("\n")}\nEstimativa: ${brl(tl.unico)}${tl.mensal ? " + " + brl(tl.mensal) + "/mês" : ""}`;
    }
    return txt;
  }

  function buildPrint(a) {
    const t = sum(state.now), tl = sum(state.later);
    const row = (id) => `<tr><td>${esc(byId[id].nome)}</td><td class="num">${byId[id].preco ? brl(byId[id].preco) : "—"}</td><td class="num">${byId[id].mensal ? brl(byId[id].mensal) : "—"}</td></tr>`;
    $("#print-sheet").innerHTML = `
      <h1>Contrato Landora</h1>
      <p class="meta">Protocolo ${a.protocolo} · ${a.data}<br>Contratante: ${esc(cliente)} · ${esc(a.nome)} (${esc(a.doc)})</p>
      <h2>Módulos contratados</h2>
      <table><thead><tr><th>Módulo</th><th class="num">Único</th><th class="num">Mensal</th></tr></thead>
      <tbody>${state.now.map(row).join("")}</tbody>
      <tfoot><tr><th>Total</th><th class="num">${brl(t.unico)}</th><th class="num">${brl(t.mensal)}</th></tr></tfoot></table>
      ${state.later.length ? `<h2>Reservado para depois (fora do contrato)</h2>
      <table><tbody>${state.later.map(row).join("")}</tbody>
      <tfoot><tr><th>Estimativa</th><th class="num">${brl(tl.unico)}</th><th class="num">${brl(tl.mensal)}</th></tr></tfoot></table>` : ""}
      <h2>Condições</h2>
      <ul>${D.termos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <h2>Assinatura</h2>
      <img alt="Assinatura" src="${a.assinaturaPrint}">
      <p class="meta">${esc(a.nome)}</p>`;
  }

  // Imagem da assinatura em fundo branco/traço escuro para impressão
  function assinaturaPrint() {
    const c = document.createElement("canvas");
    c.width = pad.width; c.height = pad.height;
    const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    x.filter = "invert(1)";
    x.drawImage(pad, 0, 0);
    return c.toDataURL("image/png");
  }

  /* Gravação opcional no Firestore (preencha firebase-config.js) */
  async function salvarFirestore(a) {
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || !cfg.projectId) return { ok: false, motivo: "firebase-nao-configurado" };
    try {
      const V = "10.14.1";
      const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
      const { getFirestore, collection, addDoc, serverTimestamp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
      const app = initializeApp(cfg);
      const db = getFirestore(app);
      const t = sum(state.now), tl = sum(state.later);
      await addDoc(collection(db, "propostas"), {
        protocolo: a.protocolo,
        modelo: slug || null,
        cliente,
        nome: a.nome,
        documento: a.doc,
        assinatura: a.assinaturaPrint,
        contrato: state.now.map((id) => ({ id, nome: byId[id].nome, preco: byId[id].preco, mensal: byId[id].mensal })),
        depois: state.later.map((id) => ({ id, nome: byId[id].nome, preco: byId[id].preco, mensal: byId[id].mensal })),
        totalContrato: t,
        totalDepois: tl,
        criadoEm: serverTimestamp(),
      });
      return { ok: true };
    } catch (e) {
      console.error("Firestore:", e);
      return { ok: false, motivo: "erro" };
    }
  }

  $("#form-assinatura").addEventListener("submit", async (e) => {
    e.preventDefault();
    erro("");
    const nome = $("#f-nome").value.trim();
    const doc = $("#f-doc").value.trim();
    const digits = doc.replace(/\D/g, "");
    if (nome.split(/\s+/).length < 2) return erro("Informe seu nome completo.");
    if (digits.length !== 11 && digits.length !== 14) return erro("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
    if (!hasInk) return erro("Faça sua assinatura no quadro.");
    if (!$("#f-aceite").checked) return erro("Aceite as condições para continuar.");
    if (!state.now.length) return erro("Adicione módulos ao contrato.");

    const now = new Date();
    const a = {
      nome, doc,
      data: now.toLocaleString("pt-BR"),
      protocolo: "LND-" + now.toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      assinaturaPrint: assinaturaPrint(),
    };
    const btn = e.submitter || $("#form-assinatura button[type=submit]");
    btn.disabled = true;
    const r = await salvarFirestore(a);
    btn.disabled = false;
    state.assinado = a;
    state.assinado.resumo = resumoTexto(a);
    buildPrint(a);

    $("#protocolo").textContent = a.protocolo;
    const wpp = $("#btn-wpp"), cp = $("#btn-copiar");
    if (D.whatsapp) {
      wpp.hidden = false; cp.hidden = true;
      wpp.href = `https://wa.me/${D.whatsapp}?text=${encodeURIComponent(state.assinado.resumo)}`;
    } else {
      wpp.hidden = true; cp.hidden = false;
    }
    renderContrato();
    $("#contrato").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    if (!r.ok && r.motivo === "erro") toast("Assinado, mas não consegui salvar online. Envie o resumo.");
  });

  $("#btn-copiar").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(state.assinado.resumo); toast("Resumo copiado"); }
    catch (e) { toast("Não foi possível copiar"); }
  });
  $("#btn-pdf").addEventListener("click", () => window.print());
  $("#btn-editar").addEventListener("click", () => { state.assinado = null; resetPad(); renderContrato(); });

  /* ---------- Carrinho: navegação e mobile ---------- */
  const cart = $("#carrinho"), scrim = $("#scrim");
  function openCart() { cart.classList.add("open"); scrim.hidden = false; document.body.classList.add("cart-open"); }
  function closeCart() { cart.classList.remove("open"); scrim.hidden = true; document.body.classList.remove("cart-open"); }
  $("#ir-assinar").addEventListener("click", () => {
    closeCart();
    $("#contrato").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  });
  $("#limpar").addEventListener("click", () => {
    if (!state.now.length && !state.later.length) return;
    state.now = []; state.later = [];
    state.assinado = null;
    save();
    update();
    toast("Seleção limpa");
  });
  $("#cart-bar").addEventListener("click", openCart);
  $("#cart-close").addEventListener("click", closeCart);
  scrim.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

  /* ---------- Efeitos de página ---------- */
  function setupReveal() {
    const els = document.querySelectorAll(".reveal");
    if (reduce || !("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => io.observe(el));
  }

  function setupProgress() {
    const bar = $("#progress");
    let ticking = false;
    const calc = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
      document.body.classList.toggle("show-bar", scrollY > 480);
      ticking = false;
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(calc); } }, { passive: true });
    calc();
  }

  function buildMarquee() {
    const nomes = D.modulos.map((m) => m.nome);
    const html = nomes.map((n) => `<span class="mq">${esc(n)}</span>`).join("");
    $("#marquee").innerHTML = html + html;
  }

  /* ---------- Init ---------- */
  function setupSideMenu() {
    const side = $("#side"), sc = $("#side-scrim"), btn = $("#menu-btn");
    let t;
    const open = () => {
      clearTimeout(t);
      sc.hidden = false; side.setAttribute("aria-hidden", "false");
      btn.setAttribute("aria-expanded", "true");
      document.body.classList.add("cart-open");
      requestAnimationFrame(() => { side.classList.add("on"); sc.classList.add("on"); });
      $("#side-close").focus();
    };
    const close = () => {
      side.classList.remove("on"); sc.classList.remove("on");
      side.setAttribute("aria-hidden", "true"); btn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("cart-open");
      t = setTimeout(() => { sc.hidden = true; }, 320);
    };
    btn.addEventListener("click", open);
    $("#side-close").addEventListener("click", close);
    sc.addEventListener("click", close);
    side.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && side.classList.contains("on")) { close(); btn.focus(); } });
    addEventListener("resize", () => { if (innerWidth > 1080 && side.classList.contains("on")) close(); });
  }

  function setNavHeight() {
    const tb = $(".topbar-wrap");
    if (tb) document.documentElement.style.setProperty("--nav-h", tb.offsetHeight + "px");
  }

  function fromModelo(m) {
    const cats = [];
    (m.modulos || []).forEach((x) => { if (x.categoria && !cats.includes(x.categoria)) cats.push(x.categoria); });
    const slugify = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    const base = window.PROPOSTA;
    return {
      ...base,
      cliente: m.cliente || base.cliente,
      validadeDias: +m.validadeDias || base.validadeDias,
      whatsapp: (m.whatsapp || "").replace(/\D/g, ""),
      instagram: m.instagram || base.instagram,
      termos: m.termos && m.termos.length ? m.termos : base.termos,
      categorias: [{ id: "todos", nome: "Todos" }].concat(cats.map((c) => ({ id: slugify(c), nome: c }))),
      modulos: (m.modulos || []).map((x) => ({
        id: x.id, categoria: slugify(x.categoria || ""), icone: x.icone || "page", nome: x.nome || "Módulo",
        desc: x.desc || "", detalhes: x.detalhes || "", imagens: x.imagens || [],
        preco: +x.preco || 0, mensal: +x.mensal || 0,
      })),
    };
  }

  function bootMsg(titulo, texto) {
    const b = $("#boot");
    b.hidden = false;
    b.innerHTML = `<div><h2></h2><p></p></div>`;
    $("h2", b).textContent = titulo;
    $("p", b).textContent = texto;
  }

  async function boot() {
    if (slug) {
      bootMsg("Carregando proposta…", "Só um instante.");
      try {
        const m = await window.Store.getModelo(slug);
        if (!m) return bootMsg("Proposta não encontrada", "Confira o link com a Landora.");
        D = fromModelo(m);
      } catch (e) {
        console.error(e);
        return bootMsg("Não foi possível abrir a proposta", "Tente novamente em instantes ou fale com a Landora.");
      }
      $("#boot").hidden = true;
    }
    cliente = (params.get("cliente") || D.cliente).trim().slice(0, 80);
    byId = Object.fromEntries(D.modulos.map((m) => [m.id, m]));
    KEY = "landora-proposta:" + (slug ? slug + ":" : "") + cliente.toLowerCase();
    init();
  }

  function init() {
    setNavHeight();
    addEventListener("resize", setNavHeight);
    $("#badge-txt").textContent = cliente === "Seu Cliente" ? "Proposta personalizada" : "Proposta para " + cliente;
    $("#parte-cliente").textContent = cliente;
    $("#validade").textContent = "Válida por " + D.validadeDias + " dias";
    $("#validade-side").textContent = "Válida por " + D.validadeDias + " dias";
    setupSideMenu();
    $("#validade-dias").textContent = D.validadeDias;
    $("#inst").textContent = D.instagram;
    const igUser = (D.instagram || "").replace("@", "");
    $("#ft-ig2").textContent = D.instagram;
    $("#ft-ig").href = $("#ft-ig2").href = "https://instagram.com/" + igUser;
    if (D.whatsapp) { const w = $("#ft-wpp"); w.hidden = false; w.href = "https://wa.me/" + D.whatsapp; }
    $("#ft-year").textContent = new Date().getFullYear();
    $("#ft-validade").textContent = D.validadeDias + " dias";
    if (cliente === "Seu Cliente") $("#ft-cli-row").hidden = true; else $("#ft-cliente").textContent = cliente;
    document.title = "Proposta Landora · " + cliente;
    $("#termos").innerHTML = D.termos.map((t) => `<li>${esc(t)}</li>`).join("");
    load();
    buildMarquee();
    renderFiltros();
    buildGrid();
    resetPad();
    update();
    setupReveal();
    setupProgress();
  }
  boot();
})();
