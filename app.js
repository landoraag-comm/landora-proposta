(function () {
  "use strict";

  const D = window.PROPOSTA;
  const $ = (s, r = document) => r.querySelector(s);
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const params = new URLSearchParams(location.search);
  const cliente = (params.get("cliente") || D.cliente).trim().slice(0, 80);
  const byId = Object.fromEntries(D.modulos.map((m) => [m.id, m]));

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
  const KEY = "landora-proposta:" + cliente.toLowerCase();
  const state = { now: [], later: [], filtro: "todos", assinado: null };

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

  /* ---------- Ações ---------- */
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 1800);
  }

  function setList(id, list) {
    const m = byId[id];
    const inNow = state.now.includes(id);
    const inLater = state.later.includes(id);
    state.now = state.now.filter((x) => x !== id);
    state.later = state.later.filter((x) => x !== id);
    if (list === "now" && !inNow) { state.now.push(id); toast(m.nome + " no contrato"); }
    else if (list === "later" && !inLater) { state.later.push(id); toast(m.nome + " guardado para depois"); }
    changed();
  }

  function changed() {
    state.assinado = null;
    save();
    render();
  }

  /* ---------- Render: filtros e vitrine ---------- */
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
      b.addEventListener("click", () => { state.filtro = c.id; renderFiltros(); renderGrid(); });
      box.appendChild(b);
    });
  }

  function priceHTML(m) {
    const parts = [];
    if (m.preco > 0) parts.push(`<strong>${brl(m.preco)}</strong><span>único</span>`);
    if (m.mensal > 0) {
      if (m.preco > 0) parts.push(`<span>+ ${brl(m.mensal)}/mês</span>`);
      else parts.push(`<strong>${brl(m.mensal)}</strong><span>/mês</span>`);
    }
    return parts.join("");
  }

  function renderGrid() {
    const grid = $("#grid");
    grid.innerHTML = "";
    D.modulos
      .filter((m) => state.filtro === "todos" || m.categoria === state.filtro)
      .forEach((m) => {
        const inNow = state.now.includes(m.id);
        const inLater = state.later.includes(m.id);
        const el = document.createElement("article");
        el.className = "card" + (inNow ? " is-now" : "") + (inLater ? " is-later" : "");
        el.innerHTML = `
          <div class="card-top">
            <div class="card-ico">${icon(m.icone)}</div>
            <span class="tag">${inNow ? "No contrato" : inLater ? "Para depois" : ""}</span>
          </div>
          <h3></h3>
          <p></p>
          <div class="price">${priceHTML(m)}</div>
          <div class="card-actions">
            <button type="button" class="btn btn-primary btn-now" aria-pressed="${inNow}">${inNow ? "No contrato" : "Adicionar"}</button>
            <button type="button" class="btn btn-later" aria-pressed="${inLater}">${inLater ? "Reservado" : "Depois"}</button>
          </div>`;
        $("h3", el).textContent = m.nome;
        $("p", el).textContent = m.desc;
        $(".btn-now", el).addEventListener("click", () => setList(m.id, inNow ? null : "now"));
        $(".btn-later", el).addEventListener("click", () => setList(m.id, inLater ? null : "later"));
        grid.appendChild(el);
      });
  }

  /* ---------- Render: carrinhos ---------- */
  function renderCartList(ul, ids, moveTo, moveLabel) {
    ul.innerHTML = "";
    if (!ids.length) {
      const li = document.createElement("li");
      li.className = "cart-empty";
      li.style.cssText = "background:none;border:0;padding:6px 2px";
      li.textContent = "Nenhum módulo ainda.";
      ul.appendChild(li);
      return;
    }
    ids.forEach((id) => {
      const m = byId[id];
      const li = document.createElement("li");
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

  function totalsHTML(t, label) {
    return `<div class="row big"><span>${label}</span><span>${brl(t.unico)}</span></div>
            <div class="row"><span>Recorrência</span><span>${brl(t.mensal)}/mês</span></div>`;
  }

  function renderCart() {
    renderCartList($("#lista-now"), state.now, "later", "Mover para Depois");
    renderCartList($("#lista-later"), state.later, "now", "Mover para o Contrato");
    const tn = sum(state.now), tl = sum(state.later);
    $("#total-now").innerHTML = totalsHTML(tn, "Total do contrato");
    $("#total-later").innerHTML = state.later.length
      ? totalsHTML(tl, "Estimativa futura").replace("row big", "row")
      : "";
    $("#ir-assinar").disabled = !state.now.length;
    $("#bar-count").textContent = state.now.length + state.later.length;
    $("#bar-total").textContent = brl(tn.unico) + (tn.mensal ? " + " + brl(tn.mensal) + "/mês" : "");
  }

  /* ---------- Render: contrato ---------- */
  function renderContrato() {
    const has = state.now.length > 0;
    const signed = !!state.assinado;
    $("#contrato-vazio").hidden = has;
    $("#contrato-form").hidden = !has || signed;
    $("#contrato-ok").hidden = !signed;
    if (!has) return;

    const rows = $("#resumo-linhas");
    rows.innerHTML = "";
    state.now.forEach((id) => {
      const m = byId[id];
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td class='num'></td><td class='num'></td>";
      tr.children[0].textContent = m.nome;
      tr.children[1].textContent = m.preco ? brl(m.preco) : "—";
      tr.children[2].textContent = m.mensal ? brl(m.mensal) : "—";
      rows.appendChild(tr);
    });
    const t = sum(state.now);
    $("#resumo-total").innerHTML = `<tr><td>Total</td><td class="num">${brl(t.unico)}</td><td class="num">${brl(t.mensal)}</td></tr>`;
  }

  function render() {
    renderGrid();
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
    el.textContent = msg;
    el.hidden = !msg;
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
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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
    $("#contrato").scrollIntoView({ behavior: "smooth", block: "start" });
    if (!r.ok && r.motivo === "erro") toast("Assinado, mas não consegui salvar online. Envie o resumo.");
  });

  $("#btn-copiar").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(state.assinado.resumo); toast("Resumo copiado"); }
    catch (e) { toast("Não foi possível copiar"); }
  });
  $("#btn-pdf").addEventListener("click", () => window.print());
  $("#btn-editar").addEventListener("click", () => { state.assinado = null; resetPad(); renderContrato(); });

  /* ---------- Carrinho: navegação e mobile ---------- */
  $("#ir-assinar").addEventListener("click", () => {
    closeCart();
    $("#contrato").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#limpar").addEventListener("click", () => {
    if (!state.now.length && !state.later.length) return;
    state.now = []; state.later = [];
    changed();
    toast("Seleção limpa");
  });
  const cart = $("#carrinho"), scrim = $("#scrim");
  function openCart() { cart.classList.add("open"); scrim.hidden = false; }
  function closeCart() { cart.classList.remove("open"); scrim.hidden = true; }
  $("#cart-bar").addEventListener("click", openCart);
  $("#cart-close").addEventListener("click", closeCart);
  scrim.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

  /* ---------- Init ---------- */
  function init() {
    $("#cliente-nome").textContent = cliente === "Seu Cliente" ? "seu negócio" : cliente;
    $("#parte-cliente").textContent = cliente;
    $("#validade").textContent = "Válida por " + D.validadeDias + " dias";
    $("#validade-dias").textContent = D.validadeDias;
    $("#inst").textContent = D.instagram;
    $("#footer-ig").textContent = D.instagram;
    document.title = "Proposta Landora · " + cliente;
    $("#termos").innerHTML = D.termos.map((t) => `<li>${esc(t)}</li>`).join("");
    load();
    renderFiltros();
    resetPad();
    render();
  }
  init();
})();
