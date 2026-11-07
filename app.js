(function () {
  "use strict";

  let D = window.PROPOSTA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const params = new URLSearchParams(location.search);
  const RESERVED = ["", "index", "index.html", "admin", "admin.html", "proposta", "proposta.html", "relatorio", "relatorio.html"];
  const pathSlug = decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, "").split("/")[0] || "").toLowerCase();
  const slug = (params.get("p") || (RESERVED.includes(pathSlug) || /\.[a-z0-9]+$/.test(pathSlug) ? "" : pathSlug)).trim().toLowerCase();
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
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    tool: '<path d="M14.5 6.5a4 4 0 0 0 4.9 4.9L21 13l-8 8-4-4 8-8zM3 21l5-5"/>',
    leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15M5 19c2-5 5-8 9-10"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ICONS.page}</svg>`;

  /* ---------- Estado ---------- */
  let KEY = "";
  const state = { now: [], later: [], filtro: "todos", assinado: null, plano: null };
  const prev = { now: [], later: [] };

  // módulos marcados de fábrica (ex.: hospedagem) e dependências (upgrade leva o básico junto)
  const padroes = () => D.modulos.filter((m) => m.padrao).map((m) => m.id);
  function fecho(ids) {
    const out = [];
    const visita = (id) => { if (!byId[id] || out.includes(id)) return; (byId[id].requer || []).forEach(visita); out.push(id); };
    ids.forEach(visita);
    return out;
  }
  const dependentes = (id) => D.modulos.filter((m) => fecho([m.id]).includes(id) && m.id !== id).map((m) => m.id);
  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { /* sem storage: segue só em memória */ }
    if (raw) {
      state.now = fecho((raw.now || []).filter((id) => byId[id]));
      state.later = (raw.later || []).filter((id) => byId[id] && !state.now.includes(id));
      state.plano = raw.plano || null;
    } else {
      state.now = fecho(padroes());
    }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ now: state.now, later: state.later, plano: state.plano })); } catch (e) {}
  }

  const sum = (ids) =>
    ids.reduce((a, id) => ({ unico: a.unico + byId[id].preco, mensal: a.mensal + byId[id].mensal }), { unico: 0, mensal: 0 });

  /* ---------- Planos ---------- */
  const planById = () => Object.fromEntries((D.planos || []).map((p) => [p.id, p]));
  const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
  const planSet = (p) => fecho(p.modulos);
  function planoAtivo() {
    const p = state.plano && planById()[state.plano];
    return p && sameSet(state.now, planSet(p)) ? p : null;
  }
  const planoPreco = (p) => {
    const s = sum(planSet(p));
    return { unico: p.preco == null ? s.unico : p.preco, mensal: p.mensal == null ? s.mensal : p.mensal, baseUnico: s.unico, baseMensal: s.mensal };
  };
  // total do contrato: se um plano está selecionado (e os módulos batem com ele), vale o valor do plano
  function sumNow() {
    const base = sum(state.now), p = planoAtivo();
    if (!p) return { ...base, base, plano: null };
    const pp = planoPreco(p);
    return { unico: pp.unico, mensal: pp.mensal, base, plano: p };
  }

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
    if (list === "now" && !inNow) {
      const extra = fecho([id]).filter((x) => x !== id && !state.now.includes(x));
      extra.concat(id).forEach((x) => { state.later = state.later.filter((y) => y !== x); state.now.push(x); });
      toast(extra.length ? m.nome + " no contrato, junto com " + extra.map((x) => byId[x].nome).join(", ") : m.nome + " no contrato");
    } else if (list === "later" && !inLater) { state.later.push(id); toast(m.nome + " guardado para depois"); }
    if (list !== "now") {
      // quem depende deste módulo não pode ficar no contrato sozinho
      const saiu = dependentes(id).filter((x) => state.now.includes(x));
      if (saiu.length) { state.now = state.now.filter((x) => !saiu.includes(x)); toast(m.nome + " saiu — " + saiu.map((x) => byId[x].nome).join(", ") + " também"); }
    }
    state.assinado = null;
    save();
    const el = cardEls[id];
    if (el && !reduce) {
      el.animate([{ transform: "scale(1)" }, { transform: "scale(1.03)" }, { transform: "scale(1)" }], { duration: 380, easing: "ease-out" });
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
      const n = String(c.nome).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const ic = /todos/.test(n) ? "grid" : /site|vitrine|web/.test(n) ? "globe" : /gest|admin|painel/.test(n) ? "dashboard" : /aluno|app|mobile/.test(n) ? "mobile" : /nutri|diet|saude/.test(n) ? "leaf" : /venda|loja|checkout|pagam/.test(n) ? "cart" : /manut|suporte|hosped/.test(n) ? "tool" : /ia\b|chat/.test(n) ? "chat" : "star";
      b.innerHTML = `<span class="chip-ic">${icon(ic)}</span><span class="chip-t"></span>`;
      b.querySelector(".chip-t").textContent = c.nome;
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

  // "Upgrade de …": mostra de qual módulo este é o upgrade (o básico entra junto ao selecionar)
  function upgradeTag(m) {
    const base = (m.requer || []).filter((id) => byId[id] && byId[id].categoria === m.categoria && !byId[id].padrao);
    const alvo = base.length ? base : (m.requer || []).filter((id) => byId[id] && !byId[id].padrao);
    if (!alvo.length) return "";
    return `<div class="up-tag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg><span>Upgrade de <b>${esc(alvo.map((id) => byId[id].nome.replace(/\s*\(.*$/, "").replace(/\s*[—–-]\s*simples$/i, "")).join(" + "))}</b> · inclui o básico</span></div>`;
  }
  function priceHTML(m) {
    const parts = [];
    if (m.aPartir && m.mensal > 0) parts.push('<span class="apartir">A partir de</span>');
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
      ${upgradeTag(m)}
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
    el.classList.add("enter");
    el.addEventListener("animationend", (e) => { if (e.animationName === "cardIn") el.classList.remove("enter"); });
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
    if (card._raf) return;
    const cx = e.clientX, cy = e.clientY;
    card._raf = requestAnimationFrame(() => {
      card._raf = 0;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", cx - r.left + "px");
      card.style.setProperty("--my", cy - r.top + "px");
    });
  });

  /* ---------- Planos (cartões) ---------- */
  function renderPlanos() {
    const box = $("#planos-grid"), sec = $("#planos");
    const ps = D.planos || [];
    sec.hidden = !ps.length;
    box.innerHTML = "";
    if (!ps.length) return;
    ps.forEach((p, i) => {
      const pp = planoPreco(p);
      const eco = pp.baseUnico - pp.unico;
      const nomes = p.modulos.map((id) => byId[id].nome);
      const el = document.createElement("article");
      el.className = "plano" + (p.destaque ? " destaque" : "");
      el.dataset.id = p.id;
      el.style.setProperty("--i", i);
      el.innerHTML = `
        ${p.destaque ? '<span class="plano-tag">Mais escolhido</span>' : ""}
        <h3></h3>
        <p class="plano-desc"></p>
        <div class="plano-price">
          ${eco > 0 ? `<s>${brl(pp.baseUnico)}</s>` : ""}
          <strong>${pp.unico ? brl(pp.unico) : brl(pp.mensal)}</strong><span>${pp.unico ? "único" : "/mês"}</span>
          ${pp.unico && pp.mensal ? `<span class="plano-mensal">+ ${brl(pp.mensal)}/mês</span>` : ""}
        </div>
        ${eco > 0 ? `<p class="plano-eco">Economia de ${brl(eco)} no plano</p>` : ""}
        <ul class="plano-list">${nomes.slice(0, 6).map((n) => `<li></li>`).join("")}${nomes.length > 6 ? `<li class="mais">e mais ${nomes.length - 6} módulos</li>` : ""}</ul>
        <button type="button" class="btn btn-primary plano-btn"></button>`;
      $("h3", el).textContent = p.nome;
      $(".plano-desc", el).textContent = p.desc;
      el.querySelectorAll(".plano-list li:not(.mais)").forEach((li, k) => { li.textContent = nomes[k]; });
      $(".plano-btn", el).addEventListener("click", () => escolherPlano(p.id));
      box.appendChild(el);
    });
    syncPlanos();
  }
  function syncPlanos() {
    const at = planoAtivo();
    $$("#planos-grid .plano").forEach((el) => {
      const on = !!at && at.id === el.dataset.id;
      el.classList.toggle("on", on);
      const b = $(".plano-btn", el);
      b.textContent = on ? "Plano escolhido ✓" : "Escolher este plano";
      b.setAttribute("aria-pressed", String(on));
    });
    const line = $("#tn-plano");
    if (line) { line.hidden = !at; if (at) line.textContent = "Plano " + at.nome; }
  }
  function escolherPlano(id) {
    const p = planById()[id];
    if (!p) return;
    if (planoAtivo() && planoAtivo().id === id) {
      state.now = fecho(padroes()); state.plano = null; toast("Plano removido");
    } else {
      state.now = planSet(p);
      state.later = state.later.filter((x) => !state.now.includes(x));
      state.plano = id;
      toast("Plano " + p.nome + " selecionado");
    }
    state.assinado = null;
    save();
    update();
  }

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
    const ut = $("#det-up"); if (ut) ut.innerHTML = upgradeTag(m);
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

    const tn = sumNow(), tl = sum(state.later);
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
    const t = sumNow();
    if (t.plano) {
      const du = t.unico - t.base.unico, dm = t.mensal - t.base.mensal;
      if (du || dm) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td></td><td class='num'></td><td class='num'></td>";
        tr.children[0].textContent = "Plano " + t.plano.nome + " — condição especial";
        tr.children[1].textContent = du ? brl(du) : "—";
        tr.children[2].textContent = dm ? brl(dm) : "—";
        rows.appendChild(tr);
      }
    }
    $("#resumo-total").innerHTML = `<tr><td>Total</td><td class="num">${brl(t.unico)}</td><td class="num">${brl(t.mensal)}</td></tr>`;
  }

  function update() {
    if (state.plano && !planoAtivo()) { state.plano = null; save(); }
    syncCards();
    syncPlanos();
    syncDet();
    renderCart();
    renderContrato();
  }

  /* ---------- Fechamento do contrato ---------- */
  const resetPad = () => {};

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
    const t = sumNow(), tl = sum(state.later);
    const linhas = state.now.map((id) => `• ${byId[id].nome} — ${byId[id].preco ? brl(byId[id].preco) : ""}${byId[id].mensal ? (byId[id].preco ? " + " : "") + brl(byId[id].mensal) + "/mês" : ""}`);
    if (t.plano) linhas.unshift(`Plano ${t.plano.nome}`);
    let txt = `*Contrato Landora* — ${a.protocolo}\nCliente: ${cliente}\nContratante: ${a.nome} (${a.doc}) · ${a.email}\nData: ${a.data}\n\n*Contrato (agora)*\n${linhas.join("\n")}\n\nTotal: ${brl(t.unico)}${t.mensal ? " + " + brl(t.mensal) + "/mês" : ""}`;
    if (state.later.length) {
      txt += `\n\n*Reservado para depois*\n${state.later.map((id) => "• " + byId[id].nome).join("\n")}\nEstimativa: ${brl(tl.unico)}${tl.mensal ? " + " + brl(tl.mensal) + "/mês" : ""}`;
    }
    return txt;
  }

  function buildPrint(a) {
    const t = sumNow(), tl = sum(state.later);
    const row = (id) => `<tr><td>${esc(byId[id].nome)}</td><td class="num">${byId[id].preco ? brl(byId[id].preco) : "—"}</td><td class="num">${byId[id].mensal ? brl(byId[id].mensal) : "—"}</td></tr>`;
    $("#print-sheet").innerHTML = `
      <h1><span class="pl-dark"><svg viewBox="9 -2 990 204" role="img" aria-label="Landora"><use href="#layer1"/><text x="219.9" y="184.4" font-family="Manrope,sans-serif" font-weight="300" font-size="25.06" letter-spacing="12.64" fill="#fff">LANDING PAGES BUILT TO CONVERT</text></svg></span> Contrato</h1>
      <p class="meta">${D.logo ? `<img alt="" src="${esc(D.logo)}" style="max-height:48px;max-width:180px;display:block;margin-bottom:8px;${D.logoFundo === "transparente" ? "background:#0A0A0A;padding:6px 10px;border-radius:8px" : ""}">` : ""}Protocolo ${a.protocolo} · ${a.data}<br>Contratante: ${esc(cliente)} · ${esc(a.nome)} (${esc(a.doc)})</p>
      <h2>Módulos contratados</h2>
      <table><thead><tr><th>Módulo</th><th class="num">Único</th><th class="num">Mensal</th></tr></thead>
      <tbody>${state.now.map(row).join("")}${t.plano && (t.unico !== t.base.unico || t.mensal !== t.base.mensal) ? `<tr><td>Plano ${esc(t.plano.nome)} — condição especial</td><td class="num">${t.unico !== t.base.unico ? brl(t.unico - t.base.unico) : "—"}</td><td class="num">${t.mensal !== t.base.mensal ? brl(t.mensal - t.base.mensal) : "—"}</td></tr>` : ""}</tbody>
      <tfoot><tr><th>Total</th><th class="num">${brl(t.unico)}</th><th class="num">${brl(t.mensal)}</th></tr></tfoot></table>
      ${state.later.length ? `<h2>Reservado para depois (fora do contrato)</h2>
      <table><tbody>${state.later.map(row).join("")}</tbody>
      <tfoot><tr><th>Estimativa</th><th class="num">${brl(tl.unico)}</th><th class="num">${brl(tl.mensal)}</th></tr></tfoot></table>` : ""}
      <h2>Condições</h2>
      <ul>${D.termos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <h2>Aceite eletrônico</h2>
      <p class="meta">${esc(a.nome)} · ${esc(a.doc)} · ${esc(a.email)}<br>Protocolo ${esc(a.protocolo)} · ${esc(a.data)}</p>`;
  }

  /* Grava o contrato fechado (Firestore; aparece no painel admin em "Contratos") */
  async function salvarFirestore(a) {
    try {
      const t = sumNow(), tl = sum(state.later);
      await window.Store.addProposta({
        protocolo: a.protocolo,
        modelo: slug || null,
        plano: t.plano ? t.plano.nome : null,
        cliente,
        nome: a.nome,
        documento: a.doc,
        email: a.email,
        contrato: state.now.map((id) => ({ id, nome: byId[id].nome, preco: byId[id].preco, mensal: byId[id].mensal })),
        depois: state.later.map((id) => ({ id, nome: byId[id].nome, preco: byId[id].preco, mensal: byId[id].mensal })),
        totalContrato: { unico: t.unico, mensal: t.mensal },
        totalDepois: tl,
      });
      return { ok: true };
    } catch (e) {
      console.error("Contrato:", e);
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
    const email = $("#f-email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return erro("Informe um e-mail válido.");
    if (validadeRestante() <= 0 && D.criadoEm) return erro("Esta proposta expirou. Fale com a Landora para renovar.");
    if (!$("#f-aceite").checked) return erro("Aceite as condições para continuar.");
    if (!state.now.length) return erro("Adicione módulos ao contrato.");

    const now = new Date();
    const a = {
      nome, doc, email,
      data: now.toLocaleString("pt-BR"),
      protocolo: "LND-" + now.toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
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
    if (!r.ok && r.motivo === "erro") toast("Contrato fechado, mas não consegui salvar online. Envie o resumo.");
  });

  $("#btn-copiar").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(state.assinado.resumo); toast("Resumo copiado"); }
    catch (e) { toast("Não foi possível copiar"); }
  });
  $("#btn-pdf").addEventListener("click", () => window.print());
  $("#btn-editar").addEventListener("click", () => { state.assinado = null; renderContrato(); });

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
    state.now = fecho(padroes()); state.later = []; state.plano = null;
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
    const els = Array.from(document.querySelectorAll(".reveal"));
    if (reduce) { els.forEach((el) => el.classList.add("in")); return; }
    let left = els.slice();
    // revela tudo que já está na tela (ou acima dela) — cobre carregamento com scroll restaurado
    const sweep = () => {
      const h = innerHeight;
      left = left.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < h * 0.94) { el.classList.add("in"); return false; }
        return true;
      });
      if (!left.length) { removeEventListener("scroll", onS); removeEventListener("resize", onS); }
    };
    let t = false;
    const onS = () => { if (!t) { t = true; requestAnimationFrame(() => { t = false; sweep(); }); } };
    addEventListener("scroll", onS, { passive: true });
    addEventListener("resize", onS);
    addEventListener("load", sweep);
    sweep();
    [150, 600, 1500].forEach((ms) => setTimeout(sweep, ms));
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
    const box = $("#marquee");
    const one = nomes.map((n) => `<span class="mq">${esc(n)}</span>`).join("");
    box.innerHTML = one;
    // repete o conjunto até cobrir a tela; depois duplica para o loop ficar contínuo
    const w1 = Math.max(1, box.scrollWidth + 14);
    const rep = Math.max(1, Math.ceil((innerWidth * 1.2) / w1));
    const set = one.repeat(rep);
    box.innerHTML = set + set;
    const setW = w1 * rep;
    box.style.setProperty("--mq-dur", Math.max(24, Math.round(setW / 55)) + "s");
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
      logo: typeof m.logo === "string" && m.logo.startsWith("data:image/") ? m.logo : "",
      logoFundo: m.logoFundo === "transparente" ? "transparente" : m.logoFundo === "branco" ? "branco" : "auto",
      criadoEm: +m.criadoEm || +m.atualizadoEm || 0,
      diferenciais: Array.isArray(m.diferenciais) ? m.diferenciais.filter((d) => d && d.titulo) : null,
      planos: (m.planos || []).map((p) => ({
        id: String(p.id || ""), nome: String(p.nome || "Plano"), desc: String(p.desc || ""), destaque: !!p.destaque,
        preco: p.preco == null || p.preco === "" ? null : Math.max(0, +p.preco || 0),
        mensal: p.mensal == null || p.mensal === "" ? null : Math.max(0, +p.mensal || 0),
        modulos: (p.modulos || []).filter((id) => (m.modulos || []).some((x) => x.id === id)),
      })).filter((p) => p.id && p.modulos.length),
      validadeDias: +m.validadeDias || base.validadeDias,
      whatsapp: (m.whatsapp || "").replace(/\D/g, ""),
      instagram: m.instagram || base.instagram,
      termos: m.termos && m.termos.length ? m.termos : base.termos,
      categorias: [{ id: "todos", nome: "Todos" }].concat(cats.map((c) => ({ id: slugify(c), nome: c }))),
      modulos: (m.modulos || []).map((x) => ({
        id: x.id, categoria: slugify(x.categoria || ""), icone: x.icone || "page", nome: x.nome || "Módulo",
        desc: x.desc || "", detalhes: x.detalhes || "", imagens: x.imagens || [],
        preco: +x.preco || 0, mensal: +x.mensal || 0,
        requer: Array.isArray(x.requer) ? x.requer.filter((id) => id !== x.id) : [], padrao: !!x.padrao, aPartir: !!x.aPartir,
      })).map((x, i) => ({ x, i })).sort((a, b) => ((a.x.mensal > 0 && !a.x.preco) - (b.x.mensal > 0 && !b.x.preco)) || a.i - b.i).map((o) => o.x),
    };
  }

  function bootMsg(titulo, texto) {
    const b = $("#boot");
    b.hidden = false; b.classList.remove("out");
    $("h2", b).textContent = titulo;
    $("p", b).textContent = texto;
    // mensagens de erro/aviso: sem animação de carregamento
    if (!/^Carregando/.test(titulo)) { const bar = $(".boot-bar", b); if (bar) bar.hidden = true; }
  }
  function fechaBoot() {
    const b = $("#boot");
    if (!b || b.hidden) return;
    b.classList.add("out");
    setTimeout(() => { b.hidden = true; }, 420);
  }

  async function boot() {
    if (slug) {
      bootMsg("Carregando proposta…", "Só um instante.");
      $(".boot-bar").hidden = false;
      try {
        const m = await window.Store.getModelo(slug);
        if (!m) return bootMsg("Proposta não encontrada", "Confira o link com a Landora.");
        D = fromModelo(m);
      } catch (e) {
        console.error(e);
        return bootMsg("Não foi possível abrir a proposta", "Tente novamente em instantes ou fale com a Landora.");
      }
    }
    cliente = (params.get("cliente") || D.cliente).trim().slice(0, 80);
    byId = Object.fromEntries(D.modulos.map((m) => [m.id, m]));
    KEY = "landora-proposta:" + (slug ? slug + ":" : "") + cliente.toLowerCase();
    init();
    requestAnimationFrame(() => requestAnimationFrame(fechaBoot));
  }

  /* ---------- Diferenciais ---------- */
  const DIF_PADRAO = [
    { titulo: "Tudo no nome do contratante", texto: "Domínio, hospedagem, banco de dados e código ficam registrados no CNPJ e no e-mail de quem contrata. Nada fica preso à Landora." },
    { titulo: "Acesso total ao projeto", texto: "O dono recebe as chaves de tudo: painel, contas, repositório e dados. Você pode levar o projeto para onde quiser." },
    { titulo: "Pague só pelo que usa", texto: "Monte o sistema por módulos, deixe o resto reservado para depois e acompanhe o total em tempo real." },
  ];
  function renderDiferenciais() {
    const lista = D.diferenciais && D.diferenciais.length ? D.diferenciais : DIF_PADRAO;
    $("#dif-grid").innerHTML = lista.map((d, i) => `<article class="dif-card reveal" style="--d:${i}"><span class="dif-n">${icon(i === 0 ? "shield" : i === 1 ? "star" : "cart")}</span><h3>${esc(d.titulo)}</h3><p>${esc(d.texto || "")}</p></article>`).join("");
  }

  /* ---------- Validade decrescente ---------- */
  function validadeRestante() {
    if (!D.criadoEm) return D.validadeDias;
    const fim = D.criadoEm + D.validadeDias * 86400000;
    return Math.ceil((fim - Date.now()) / 86400000);
  }
  function validadeTexto() {
    const r = validadeRestante();
    if (!D.criadoEm) return "Válida por " + D.validadeDias + " dias";
    if (r <= 0) return "Proposta expirada";
    if (r === 1) return "Último dia da proposta";
    return "Válida por mais " + r + " dias";
  }
  function logoClara(url) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement("canvas"); c.width = 64; c.height = 32;
          const x = c.getContext("2d"); x.drawImage(img, 0, 0, 64, 32);
          const d = x.getImageData(0, 0, 64, 32).data; let n = 0, l = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { n++; l += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; }
          res(n > 0 && l / n > 0.6);
        } catch (_) { res(false); }
      };
      img.onerror = () => res(false);
      img.src = url;
    });
  }

  function init() {
    setNavHeight();
    addEventListener("resize", setNavHeight);
    $("#badge-txt").textContent = cliente === "Seu Cliente" ? "Proposta personalizada" : "Proposta para " + cliente;
    $("#parte-cliente").textContent = cliente;
    if (D.logo) {
      const chip = $("#client-chip");
      $("#client-logo", chip).src = D.logo;
      if (D.logoFundo === "transparente") { $(".logo-wrap", chip).classList.add("transp"); $("#parte-logo").classList.add("transp"); }
      $("#client-name", chip).textContent = cliente;
      chip.hidden = false;
      $(".badge").hidden = true;
      const pl = $("#parte-logo");
      pl.hidden = false; pl.querySelector("img").src = D.logo;
      const fl = $("#ft-logo"); fl.hidden = false; fl.src = D.logo;
      const aplicaTransp = () => { $(".logo-wrap", chip).classList.add("transp"); $("#parte-logo").classList.add("transp"); fl.style.background = "transparent"; fl.style.padding = "0"; };
      if (D.logoFundo === "transparente") aplicaTransp();
      else if (D.logoFundo === "auto") logoClara(D.logo).then((c) => { if (c) { D.logoFundo = "transparente"; aplicaTransp(); } });
    }
    $("#validade").textContent = validadeTexto();
    $("#validade-side").textContent = validadeTexto();
    if (D.criadoEm && validadeRestante() <= 0) { $("#validade").classList.add("expirada"); $("#validade-side").classList.add("expirada"); }
    setupSideMenu();
    $("#validade-txt").textContent = validadeTexto().replace(/^V/, "v").replace(/^P/, "p").replace(/^Ú/, "ú");
    $("#inst").textContent = D.instagram;
    const igUser = (D.instagram || "").replace("@", "");
    $("#ft-ig2").textContent = D.instagram;
    $("#ft-ig").href = $("#ft-ig2").href = "https://instagram.com/" + igUser;
    if (D.whatsapp) { const w = $("#ft-wpp"); w.hidden = false; w.href = "https://wa.me/" + D.whatsapp; }
    $("#ft-year").textContent = new Date().getFullYear();
    $("#ft-validade").textContent = D.criadoEm ? "até " + new Date(D.criadoEm + D.validadeDias * 86400000).toLocaleDateString("pt-BR") : D.validadeDias + " dias";
    if (cliente === "Seu Cliente") $("#ft-cli-row").hidden = true; else $("#ft-cliente").textContent = cliente;
    document.title = "Proposta Landora · " + cliente;
    $("#termos").innerHTML = D.termos.map((t) => `<li>${esc(t)}</li>`).join("");
    load();
    buildMarquee();
    renderFiltros();
    renderPlanos();
    renderDiferenciais();
    if ((D.planos || []).length) {
      const link = (cls) => { const l = document.createElement("a"); l.href = "#planos"; l.textContent = "Planos"; const ref = document.querySelector(cls + ' a[href="#vitrine"]'); ref.parentNode.insertBefore(l, ref); if (cls === "#side") l.insertAdjacentHTML("afterbegin", "<i>★</i>"); };
      link(".nav"); link("#side");
    }
    buildGrid();
    resetPad();
    update();
    setupReveal();
    setupProgress();
  }
  boot();
})();
