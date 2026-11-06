(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const S = window.Store;
  const app = $("#app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const brl = (v) => (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const slugify = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  const uid = () => Math.random().toString(36).slice(2, 8);
  const ICONES = ["page", "dashboard", "calendar", "card", "chat", "users", "lock", "bell", "chart", "star", "cart", "zap", "globe", "mobile", "shield"];
  const ICON_NOME = { page: "Página", dashboard: "Painel", calendar: "Agenda", card: "Pagamento", chat: "Chat", users: "Pessoas", lock: "Acesso", bell: "Notificação", chart: "Gráfico", star: "Estrela", cart: "Carrinho", zap: "Raio", globe: "Globo", mobile: "Celular", shield: "Escudo" };
  const BASE = location.href.split(/[?#]/)[0].replace(/[^/]*$/, "");
  const RESERVADOS = ["admin", "index", "proposta", "relatorio", "assets", "styles", "app", "data", "store", "firebase-config", "firebase", "404", "api"];
  // online: https://dominio/slug (reescrita do Hosting) | demonstração local: ?p=slug
  const linkDe = (slug) => (S.mode === "firebase" ? location.origin + "/" + encodeURIComponent(slug) : BASE + "proposta.html?p=" + encodeURIComponent(slug));

  const LOGO = `<svg class="brand-lockup" viewBox="9 -2 990 204" role="img" aria-label="Landora"><use href="#layer1"/><text x="219.9" y="184.4" font-family="Manrope,sans-serif" font-weight="400" font-size="25.06" letter-spacing="12.64" fill="#fff">LANDING PAGES BUILT TO CONVERT</text></svg>`;

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  let user = null;
  let ed = null; // proposta em edição

  /* ---------- Cabeçalho ---------- */
  const topo = () => `
    <div class="adm-top">
      <a href="./" aria-label="Landora">${LOGO}</a>
      <div class="adm-user"><span>${esc(user.email)}</span>${user.demo ? "" : '<button class="btn btn-ghost btn-sm" id="sair">Sair</button>'}</div>
    </div>
    ${S.mode === "local" ? '<div class="demo-bar">Modo demonstração: os dados ficam só neste navegador. Preencha o <b>firebase-config.js</b> para salvar online.</div>' : ""}`;

  /* ---------- Login ---------- */
  function viewLogin(erro) {
    app.innerHTML = `
      <div class="panel login">
        <div style="display:flex;justify-content:center">${LOGO}</div>
        <p>Painel de propostas. Entre com a conta Google autorizada.</p>
        <button class="btn btn-primary btn-lg" id="entrar">Entrar com Google</button>
        ${erro ? `<p class="msg-err" style="margin-top:14px">${esc(erro)}</p>` : ""}
      </div>`;
    $("#entrar").onclick = async () => {
      try { await S.signIn(); } catch (e) { viewLogin("Não foi possível entrar: " + (e.code || e.message)); }
    };
  }

  /* ---------- Lista ---------- */
  async function viewLista() {
    ed = null;
    app.innerHTML = topo() + `<p class="empty">Carregando…</p>`;
    bindSair();
    let lista = [];
    let nContratos = 0;
    try { lista = await S.listModelos(); try { nContratos = (await S.listPropostas()).length; } catch (_) {} }
    catch (e) {
      console.error(e);
      app.innerHTML = topo() + `<div class="panel"><b class="msg-err">Sem permissão ou erro ao ler.</b><p class="sub" style="margin-top:8px">Confirme que o seu e-mail está na lista <code>isAdmin()</code> do firestore.rules e que as regras foram publicadas. (${esc(e.code || e.message)})</p></div>`;
      bindSair(); return;
    }
    app.innerHTML = topo() + `
      <div class="sec-h" style="margin-top:0"><div><h1>Propostas</h1><p class="sub" style="margin:0">Cada proposta usa o site como base, com os módulos e valores que você cadastrar.</p></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-ghost" id="ver-contratos">Contratos fechados${nContratos ? " (" + nContratos + ")" : ""}</button><button class="btn btn-ghost" id="imp-json">Importar proposta (.json)</button><button class="btn btn-primary" id="nova">+ Nova proposta</button></div><input type="file" id="imp-file" accept="application/json,.json" hidden></div>
      ${lista.length ? `<div class="grid-p">${lista.map((p) => `
        <article class="panel pcard" data-slug="${esc(p.slug)}">
          <div class="phead">
            <div class="plogo ${p.logoFundo === "transparente" ? "dark" : ""}">${p.logo ? `<img src="${esc(p.logo)}" alt="">` : `<span>${esc((p.cliente || p.slug || "?").trim().charAt(0).toUpperCase())}</span>`}</div>
            <div><h3>${esc(p.titulo || p.slug)}</h3>
            <small>${p.cliente ? "Cliente: " + esc(p.cliente) + " · " : ""}${(p.modulos || []).length} módulos${(p.planos || []).length ? " · " + p.planos.length + " planos" : ""}</small></div>
          </div>
          <code>${esc(linkDe(p.slug))}</code>
          <div class="row">
            <button class="btn btn-primary btn-sm" data-a="edit">Editar</button>
            <a class="btn btn-ghost btn-sm" href="${esc(linkDe(p.slug))}" target="_blank" rel="noopener">Abrir</a>
            <button class="btn btn-ghost btn-sm" data-a="rel">Relatório</button>
            <button class="btn btn-ghost btn-sm" data-a="copy">Copiar link</button>
            <button class="btn btn-ghost btn-sm" data-a="dup">Duplicar</button>
            <button class="btn btn-ghost btn-sm" data-a="del">Excluir</button>
          </div>
        </article>`).join("")}</div>` : `<div class="panel empty">Nenhuma proposta ainda. Clique em “Nova proposta”.</div>`}`;
    bindSair();
    $("#nova").onclick = () => abrir(novaProposta());
    /* importa uma proposta pronta (arquivo .json) e abre no editor; ela só é gravada quando você clica em "Salvar proposta" */
    $("#imp-json").onclick = () => $("#imp-file").click();
    $("#ver-contratos").onclick = viewContratos;
    $("#imp-file").onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = "";
      if (!f) return;
      try {
        const j = JSON.parse(await f.text());
        if (!j || !Array.isArray(j.modulos) || !j.modulos.length) throw new Error("sem módulos");
        const b = window.PROPOSTA, usados = new Set(), idmap = {};
        const p = {
          slug: slugify(j.slug || j.titulo || j.cliente || ""), titulo: String(j.titulo || j.cliente || "").slice(0, 120), cliente: String(j.cliente || "").slice(0, 80),
          logo: typeof j.logo === "string" && j.logo.startsWith("data:image/") ? j.logo : "", validadeDias: Math.max(1, parseInt(j.validadeDias, 10) || b.validadeDias || 15),
          whatsapp: String(j.whatsapp || "").replace(/\D/g, ""), instagram: String(j.instagram || b.instagram || ""),
          logoFundo: j.logoFundo === "transparente" ? "transparente" : "branco",
          criadoEm: Date.now(),
          diferenciais: Array.isArray(j.diferenciais) ? j.diferenciais.filter((d) => d && d.titulo).map((d) => ({ titulo: String(d.titulo), texto: String(d.texto || "") })) : [],
          termos: Array.isArray(j.termos) && j.termos.length ? j.termos.map(String) : b.termos.slice(),
          modulos: j.modulos.map((m, i) => { let id = slugify(m.id || m.nome || "modulo") || "modulo"; while (usados.has(id)) id += "-" + uid().slice(0, 2); usados.add(id); idmap[String(m.id || m.nome)] = id;
            return { id, categoria: String(m.categoria || ""), icone: ICONES.includes(m.icone) ? m.icone : "page", nome: String(m.nome || "Módulo"), desc: String(m.desc || ""), detalhes: String(m.detalhes || ""),
              imagens: Array.isArray(m.imagens) ? m.imagens.filter((u) => typeof u === "string" && u.startsWith("data:image/")).slice(0, 4) : [], preco: Math.max(0, +m.preco || 0), mensal: Math.max(0, +m.mensal || 0),
              requer: Array.isArray(m.requer) ? m.requer.map(String) : [], padrao: !!m.padrao, aPartir: !!m.aPartir }; }),
        };
        p.modulos.forEach((m) => { m.requer = m.requer.map((x) => idmap[x]).filter((x) => x && x !== m.id); });
        if (!j.logoFundo && p.logo) p.logoFundo = (await logoEhClara(p.logo)) ? "transparente" : "branco";
        p.planos = (Array.isArray(j.planos) ? j.planos : []).map((pl) => ({
          id: slugify(pl.id || pl.nome || "plano") || "plano", nome: String(pl.nome || "Plano"), desc: String(pl.desc || ""), destaque: !!pl.destaque,
          preco: pl.preco == null || pl.preco === "" ? null : Math.max(0, +pl.preco || 0), mensal: pl.mensal == null || pl.mensal === "" ? null : Math.max(0, +pl.mensal || 0),
          modulos: (pl.modulos || []).map((x) => idmap[String(x)]).filter(Boolean),
        })).filter((pl) => pl.modulos.length);
        abrir(p, true); toast("Proposta importada: confira e clique em Salvar");
      } catch (err) { toast("Arquivo inválido: " + (err.message || "JSON")); }
    };
    app.querySelectorAll(".pcard").forEach((c) => {
      const p = lista.find((x) => x.slug === c.dataset.slug);
      c.addEventListener("click", async (e) => {
        const a = e.target.dataset.a;
        if (!a) return;
        if (a === "edit") abrir(JSON.parse(JSON.stringify(p)), false);
        if (a === "rel") window.Relatorio.abrir(p, linkDe(p.slug));
        if (a === "copy") { try { await navigator.clipboard.writeText(linkDe(p.slug)); toast("Link copiado"); } catch (_) { toast(linkDe(p.slug)); } }
        if (a === "dup") {
          const novo = JSON.parse(JSON.stringify(p));
          novo.slug = p.slug + "-copia-" + uid().slice(0, 3);
          novo.titulo = (p.titulo || p.slug) + " (cópia)"; novo.criadoEm = Date.now();
          abrir(novo, true);
        }
        if (a === "del" && confirm(`Excluir a proposta “${p.titulo || p.slug}”? Isso não pode ser desfeito.`)) {
          await S.deleteModelo(p.slug); toast("Proposta excluída"); viewLista();
        }
      });
    });
  }

  function bindSair() { const b = $("#sair"); if (b) b.onclick = () => S.signOut(); }

  /* ---------- Editor ---------- */
  function novaProposta() {
    const b = window.PROPOSTA;
    return { slug: "", titulo: "", cliente: "", logo: "", logoFundo: "branco", planos: [], diferenciais: [], criadoEm: Date.now(), validadeDias: b.validadeDias || 15, whatsapp: b.whatsapp || "", instagram: b.instagram || "", termos: b.termos.slice(), modulos: [] };
  }

  function abrir(p, novo = true) {
    ed = { p, novo, slugTocado: !novo };
    viewEditor();
  }

  async function viewContratos() {
    app.innerHTML = topo() + `<p class="empty">Carregando…</p>`; bindSair();
    let L = [];
    try { L = await S.listPropostas(); } catch (e) { console.error(e); toast("Não consegui ler os contratos"); return viewLista(); }
    const dt = (t) => (t ? new Date(t).toLocaleString("pt-BR") : "—");
    app.innerHTML = topo() + `
      <div class="sec-h" style="margin-top:0"><div><h1>Contratos fechados</h1><p class="sub" style="margin:0">Cada contrato fechado pelo cliente no site chega aqui, com os dados do contratante.</p></div>
      <button class="btn btn-ghost" id="voltar">← Propostas</button></div>
      ${L.length ? L.map((c, i) => `
        <article class="panel ccard" data-i="${i}">
          <div class="chead"><div><h3>${esc(c.cliente || "Cliente")}${c.plano ? ` <span class="tagp">${esc(c.plano)}</span>` : ""}</h3><small>${esc(c.protocolo)} · ${dt(c.criadoEm)}${c.modelo ? " · /" + esc(c.modelo) : ""}</small></div>
            <div class="ctot"><b>${brl((c.totalContrato || {}).unico)}</b>${(c.totalContrato || {}).mensal ? `<small>+ ${brl(c.totalContrato.mensal)}/mês</small>` : ""}</div></div>
          <div class="cdados"><span><small>Contratante</small>${esc(c.nome)}</span><span><small>CPF/CNPJ</small>${esc(c.documento)}</span><span><small>E-mail</small><a href="mailto:${esc(c.email || "")}">${esc(c.email || "—")}</a></span></div>
          <ul class="cmods">${(c.contrato || []).map((m) => `<li><span>${esc(m.nome)}</span><b>${m.preco ? brl(m.preco) : ""}${m.mensal ? (m.preco ? " + " : "") + brl(m.mensal) + "/mês" : ""}</b></li>`).join("")}</ul>
          ${(c.depois || []).length ? `<small class="sub">Reservado para depois: ${c.depois.map((m) => esc(m.nome)).join(", ")}</small>` : ""}
          <div class="row"><button class="btn btn-ghost btn-sm" data-a="copiar">Copiar resumo</button><button class="btn btn-ghost btn-sm" data-a="del">Excluir</button></div>
        </article>`).join("") : `<div class="panel empty">Nenhum contrato fechado ainda.</div>`}`;
    bindSair();
    $("#voltar").onclick = viewLista;
    app.querySelectorAll(".ccard").forEach((el) => {
      const c = L[+el.dataset.i];
      el.onclick = async (e) => {
        const a = e.target.dataset.a; if (!a) return;
        if (a === "copiar") {
          const t = `Contrato ${c.protocolo}\nCliente: ${c.cliente}\nContratante: ${c.nome} (${c.documento}) · ${c.email || ""}\nData: ${dt(c.criadoEm)}\n${c.plano ? "Plano: " + c.plano + "\n" : ""}\n${(c.contrato || []).map((m) => "• " + m.nome).join("\n")}\n\nTotal: ${brl((c.totalContrato || {}).unico)}${(c.totalContrato || {}).mensal ? " + " + brl(c.totalContrato.mensal) + "/mês" : ""}`;
          try { await navigator.clipboard.writeText(t); toast("Resumo copiado"); } catch (_) { toast("Não foi possível copiar"); }
        }
        if (a === "del" && confirm("Excluir este contrato?")) { await S.deleteProposta(c.id); toast("Contrato excluído"); viewContratos(); }
      };
    });
  }

  function viewEditor() {
    const p = ed.p;
    app.innerHTML = topo() + `
      <div class="sec-h" style="margin-top:0">
        <div><button class="link-btn" id="voltar">← Voltar às propostas</button><h1>${ed.novo ? "Nova proposta" : "Editar proposta"}</h1></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${!ed.novo ? `<a class="btn btn-ghost" href="${esc(linkDe(p.slug))}" target="_blank" rel="noopener">Ver proposta</a>` : ""}
          <button class="btn btn-ghost" id="relatorio">Relatório</button>
          <button class="btn btn-primary" id="salvar">Salvar proposta</button>
        </div>
      </div>
      ${!ed.novo ? `<div class="panel linkbox"><div><small>LINK PARA ENVIAR AO CLIENTE</small><code id="link-final">${esc(linkDe(p.slug))}</code></div><button class="btn btn-primary btn-sm" id="copiar-link">Copiar link</button></div>` : ""}
      <div class="panel">
        <div class="cols">
          <div class="field"><label for="f-titulo">Nome interno da proposta</label><input id="f-titulo" value="${esc(p.titulo)}" placeholder="Ex.: Proposta Clínica Vida"></div>
          <div class="field"><label for="f-slug">Endereço (slug)</label><input id="f-slug" value="${esc(p.slug)}" ${ed.novo ? "" : "disabled"} placeholder="clinica-vida"><small>Link do cliente: <b id="slug-prev">${esc(p.slug ? linkDe(p.slug) : "…")}</b></small></div>
        </div>
        <div class="cols3">
          <div class="field"><label for="f-cliente">Nome do cliente</label><input id="f-cliente" value="${esc(p.cliente)}" placeholder="Aparece na proposta"></div>
          <div class="field"><label for="f-val">Validade (dias)</label><input id="f-val" type="number" min="1" value="${esc(p.validadeDias)}"></div>
          <div class="field"><label for="f-wpp">WhatsApp (DDI+DDD)</label><input id="f-wpp" value="${esc(p.whatsapp)}" placeholder="5515999999999" inputmode="numeric"></div>
        </div>
        <div class="field"><label>Logo do cliente</label>
          <div class="logo-up">
            <div class="logo-prev ${p.logoFundo === "transparente" ? "dark" : ""}" id="logo-prev">${p.logo ? `<img alt="" src="${esc(p.logo)}">` : "<span>sem logo</span>"}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn btn-ghost btn-sm" id="logo-btn">Enviar logo</button>
              <button type="button" class="btn btn-ghost btn-sm" id="logo-del" ${p.logo ? "" : "hidden"}>Remover</button>
            </div>
            <input type="file" id="logo-file" accept="image/*" hidden>
          </div>
          <div class="field" style="margin:10px 0 0;max-width:340px"><label for="f-logofundo">Fundo atrás da logo</label>
            <select id="f-logofundo"><option value="branco" ${p.logoFundo !== "transparente" ? "selected" : ""}>Fundo branco (para logo escura)</option><option value="transparente" ${p.logoFundo === "transparente" ? "selected" : ""}>Sem fundo (logo transparente/clara)</option></select></div>
          <small>PNG com fundo transparente funciona. Ao enviar, o painel escolhe o fundo sozinho; você pode trocar.</small>
        </div>
        <div class="field"><label for="f-ig">Instagram</label><input id="f-ig" value="${esc(p.instagram)}" placeholder="@landora.ag"></div>
        <div class="field"><label for="f-termos">Condições (uma por linha)</label><textarea id="f-termos" rows="4">${esc((p.termos || []).join("\n"))}</textarea></div>
        <div class="field" style="margin:0"><label for="f-dif">Diferenciais (um por linha: Título | texto)</label><textarea id="f-dif" rows="4" placeholder="Vazio = usa os diferenciais padrão da Landora (dono de tudo no CNPJ e e-mail do contratante)">${esc((p.diferenciais || []).map((d) => d.titulo + " | " + (d.texto || "")).join("\n"))}</textarea></div>
      </div>

      <div class="sec-h"><h2>Módulos <small style="color:var(--muted);font-weight:400">(${p.modulos.length})</small></h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" id="import">Importar exemplos</button>
          <button class="btn btn-primary btn-sm" id="addmod">+ Novo módulo</button>
        </div>
      </div>
      <div class="mods" id="mods">
        ${p.modulos.length ? p.modulos.map((m, i) => `
          <div class="mrow" data-i="${i}">
            <div class="thumb">${m.imagens && m.imagens[0] ? `<img alt="" src="${esc(m.imagens[0])}">` : "sem foto"}</div>
            <div><b>${esc(m.nome)}</b><small>${esc(m.categoria || "Sem categoria")}${m.imagens && m.imagens.length ? " · " + m.imagens.length + " foto(s)" : ""}</small></div>
            <div class="price-s">${m.preco > 0 ? brl(m.preco) : ""}${m.preco > 0 && m.mensal > 0 ? "<br>" : ""}${m.mensal > 0 ? "+ " + brl(m.mensal) + "/mês" : ""}</div>
            <div class="acts">
              <button class="mini-b" data-a="up" title="Subir" aria-label="Subir">↑</button>
              <button class="mini-b" data-a="down" title="Descer" aria-label="Descer">↓</button>
              <button class="mini-b" data-a="edit" title="Editar" aria-label="Editar">✎</button>
              <button class="mini-b del" data-a="del" title="Remover" aria-label="Remover">×</button>
            </div>
          </div>`).join("") : `<div class="panel empty">Nenhum módulo. Cadastre um ou importe os exemplos.</div>`}
      </div>

      <div class="sec-h"><div><h2>Planos <small style="color:var(--muted);font-weight:400">(${(p.planos || []).length})</small></h2><p class="sub" style="margin:4px 0 0;font-size:13px">Pacotes com valor próprio que já selecionam módulos para o cliente.</p></div>
        <button class="btn btn-primary btn-sm" id="addplano">+ Novo plano</button>
      </div>
      <div class="mods" id="planos">
        ${(p.planos || []).length ? p.planos.map((pl, i) => { const s = somaMods(p, pl.modulos); const pu = pl.preco == null ? s.u : pl.preco, pm = pl.mensal == null ? s.m : pl.mensal; return `
          <div class="mrow plano-row" data-i="${i}">
            <div class="thumb">${pl.destaque ? "★" : ""}</div>
            <div><b>${esc(pl.nome)}</b><small>${pl.modulos.length} módulos${pl.preco != null || pl.mensal != null ? " · valor especial" : " · soma automática"}</small></div>
            <div class="price-s">${pu > 0 ? brl(pu) : ""}${pu > 0 && pm > 0 ? "<br>" : ""}${pm > 0 ? "+ " + brl(pm) + "/mês" : ""}</div>
            <div class="acts">
              <button class="mini-b" data-a="up" aria-label="Subir">↑</button>
              <button class="mini-b" data-a="down" aria-label="Descer">↓</button>
              <button class="mini-b" data-a="edit" aria-label="Editar">✎</button>
              <button class="mini-b del" data-a="del" aria-label="Remover">×</button>
            </div>
          </div>`; }).join("") : `<div class="panel empty">Nenhum plano. Sem planos, o cliente escolhe só módulos avulsos.</div>`}
      </div>`;
    bindSair();
    $("#voltar").onclick = () => { if (!confirm("Sair sem salvar as alterações?")) return; viewLista(); };
    $("#f-titulo").oninput = (e) => {
      if (ed.novo && !ed.slugTocado) { $("#f-slug").value = slugify(e.target.value); $("#slug-prev").textContent = $("#f-slug").value ? linkDe($("#f-slug").value) : "…"; }
    };
    $("#f-slug").oninput = (e) => { ed.slugTocado = true; e.target.value = slugify(e.target.value); $("#slug-prev").textContent = e.target.value ? linkDe(e.target.value) : "…"; };
    $("#addmod").onclick = () => drawerModulo(null);
    $("#import").onclick = () => {
      lerForm();
      const ja = new Set(p.modulos.map((m) => m.nome));
      window.PROPOSTA.modulos.filter((m) => !ja.has(m.nome)).forEach((m) => {
        const cat = (window.PROPOSTA.categorias.find((c) => c.id === m.categoria) || {}).nome || "";
        p.modulos.push({ id: slugify(m.nome) + "-" + uid(), categoria: cat, icone: m.icone, nome: m.nome, desc: m.desc, detalhes: "", imagens: [], preco: m.preco, mensal: m.mensal });
      });
      viewEditor(); toast("Exemplos importados");
    };
    $("#mods").onclick = (e) => {
      const a = e.target.dataset.a, row = e.target.closest(".mrow");
      if (!a || !row) return;
      lerForm();
      const i = +row.dataset.i;
      if (a === "edit") drawerModulo(i);
      if (a === "del" && confirm("Remover este módulo?")) { const rid = p.modulos[i].id; p.modulos.splice(i, 1); (p.planos || []).forEach((pl) => { pl.modulos = pl.modulos.filter((x) => x !== rid); }); p.planos = (p.planos || []).filter((pl) => pl.modulos.length); p.modulos.forEach((x) => { x.requer = (x.requer || []).filter((y) => y !== rid); }); viewEditor(); }
      if (a === "up" && i > 0) { [p.modulos[i - 1], p.modulos[i]] = [p.modulos[i], p.modulos[i - 1]]; viewEditor(); }
      if (a === "down" && i < p.modulos.length - 1) { [p.modulos[i + 1], p.modulos[i]] = [p.modulos[i], p.modulos[i + 1]]; viewEditor(); }
    };
    const pintaLogo = () => {
      $("#logo-prev").innerHTML = p.logo ? `<img alt="" src="${esc(p.logo)}">` : "<span>sem logo</span>";
      $("#logo-del").hidden = !p.logo;
    };
    $("#logo-btn").onclick = () => $("#logo-file").click();
    $("#logo-del").onclick = () => { p.logo = ""; pintaLogo(); };
    $("#f-logofundo").onchange = (e) => { p.logoFundo = e.target.value; $("#logo-prev").classList.toggle("dark", p.logoFundo === "transparente"); };
    $("#logo-file").onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = "";
      if (!f) return;
      try {
        p.logo = await comprimirLogo(f);
        p.logoFundo = await logoEhClara(p.logo) ? "transparente" : "branco";
        $("#f-logofundo").value = p.logoFundo; $("#logo-prev").classList.toggle("dark", p.logoFundo === "transparente");
        pintaLogo();
      } catch (_) { toast("Não consegui ler a imagem"); }
    };
    $("#addplano").onclick = () => { lerForm(); drawerPlano(null); };
    $("#planos").onclick = (e) => {
      const a = e.target.dataset.a, row = e.target.closest(".plano-row");
      if (!a || !row) return;
      lerForm();
      const i = +row.dataset.i, L = p.planos;
      if (a === "edit") drawerPlano(i);
      if (a === "del" && confirm("Remover este plano?")) { L.splice(i, 1); viewEditor(); }
      if (a === "up" && i > 0) { [L[i - 1], L[i]] = [L[i], L[i - 1]]; viewEditor(); }
      if (a === "down" && i < L.length - 1) { [L[i + 1], L[i]] = [L[i], L[i + 1]]; viewEditor(); }
    };
    $("#relatorio").onclick = () => { lerForm(); window.Relatorio.abrir(ed.p, ed.p.slug ? linkDe(ed.p.slug) : ""); };
    $("#salvar").onclick = salvar;
    const cl = $("#copiar-link");
    if (cl) cl.onclick = async () => { try { await navigator.clipboard.writeText(linkDe(p.slug)); toast("Link copiado"); } catch (_) { toast(linkDe(p.slug)); } };
  }

  function lerForm() {
    const p = ed.p;
    p.titulo = $("#f-titulo").value.trim();
    if (ed.novo) p.slug = $("#f-slug").value.trim();
    p.cliente = $("#f-cliente").value.trim();
    p.validadeDias = Math.max(1, parseInt($("#f-val").value, 10) || 15);
    p.whatsapp = $("#f-wpp").value.replace(/\D/g, "");
    p.instagram = $("#f-ig").value.trim();
    p.termos = $("#f-termos").value.split("\n").map((t) => t.trim()).filter(Boolean);
    p.diferenciais = $("#f-dif").value.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [t, ...r] = l.split("|"); return { titulo: t.trim(), texto: r.join("|").trim() }; }).filter((d) => d.titulo);
  }

  async function salvar() {
    lerForm();
    const p = ed.p;
    if (!p.titulo) return toast("Dê um nome à proposta");
    if (!p.slug) p.slug = slugify(p.titulo);
    if (!p.slug) return toast("Informe o endereço (slug)");
    if (RESERVADOS.includes(p.slug)) return toast("Esse endereço é reservado, escolha outro");
    if (!p.modulos.length) return toast("Cadastre ao menos um módulo");
    if (!p.criadoEm) p.criadoEm = Date.now();
    const ids = new Set(p.modulos.map((m) => m.id));
    p.planos = (p.planos || []).map((pl) => ({ ...pl, modulos: pl.modulos.filter((x) => ids.has(x)) })).filter((pl) => pl.modulos.length);
    const btn = $("#salvar"); btn.disabled = true; btn.textContent = "Salvando…";
    try {
      if (ed.novo) {
        const ja = await S.getModelo(p.slug).catch(() => null);
        if (ja && !confirm("Já existe uma proposta com esse endereço. Substituir?")) { btn.disabled = false; btn.textContent = "Salvar proposta"; return; }
      }
      const { slug, modulos, atualizadoEm, ...dados } = p;
      await S.saveModelo(slug, dados, modulos);
      ed.novo = false;
      toast("Proposta salva ✓");
      viewEditor();
    } catch (e) {
      console.error(e);
      btn.disabled = false; btn.textContent = "Salvar proposta";
      toast("Erro ao salvar: " + (e.code || e.message));
    }
  }

  /* ---------- Módulo (gaveta) ---------- */
  function drawerModulo(i) {
    const p = ed.p;
    const m = i == null ? { id: "", categoria: "", icone: "page", nome: "", desc: "", detalhes: "", imagens: [], preco: 0, mensal: 0, requer: [], padrao: false, aPartir: false } : JSON.parse(JSON.stringify(p.modulos[i]));
    const outros = p.modulos.filter((x) => x.id !== m.id);
    const cats = [...new Set(p.modulos.map((x) => x.categoria).filter(Boolean))];
    const d = document.createElement("div");
    d.className = "drawer";
    d.innerHTML = `
      <div class="drawer-in" role="dialog" aria-modal="true" aria-label="Módulo">
        <h2 style="margin-bottom:18px">${i == null ? "Novo módulo" : "Editar módulo"}</h2>
        <div class="field"><label for="m-nome">Nome</label><input id="m-nome" value="${esc(m.nome)}" placeholder="Ex.: Agendamento online"></div>
        <div class="cols">
          <div class="field"><label for="m-cat">Categoria</label><input id="m-cat" list="m-cats" value="${esc(m.categoria)}" placeholder="Ex.: Vendas"><datalist id="m-cats">${cats.map((c) => `<option value="${esc(c)}">`).join("")}</datalist></div>
          <div class="field"><label for="m-ico">Ícone</label><select id="m-ico">${ICONES.map((k) => `<option value="${k}" ${k === m.icone ? "selected" : ""}>${ICON_NOME[k]}</option>`).join("")}</select></div>
        </div>
        <div class="cols">
          <div class="field"><label for="m-preco">Valor único (R$)</label><input id="m-preco" type="number" min="0" step="0.01" value="${m.preco || 0}"></div>
          <div class="field"><label for="m-mensal">Valor mensal (R$)</label><input id="m-mensal" type="number" min="0" step="0.01" value="${m.mensal || 0}"></div>
        </div>
        <label class="check"><input type="checkbox" id="m-apartir" ${m.aPartir ? "checked" : ""}> Mostrar “A partir de” no valor mensal</label>
        <label class="check"><input type="checkbox" id="m-padrao" ${m.padrao ? "checked" : ""}> Já vem selecionado no contrato (ex.: hospedagem)</label>
        ${outros.length ? `<div class="field"><label>Este módulo é upgrade de… (o básico é selecionado junto)</label>
          <div class="pick" id="m-req">${outros.map((x) => `<label class="pickrow"><input type="checkbox" value="${esc(x.id)}" ${(m.requer || []).includes(x.id) ? "checked" : ""}><span>${esc(x.nome)}</span></label>`).join("")}</div>
          <small>Ex.: na “Vitrine completa”, marque “Vitrine simples”. O card passa a mostrar “Upgrade de Vitrine”, e ao escolher o upgrade o básico entra junto; se o básico sair, o upgrade sai.</small></div>` : ""}
        <div class="field"><label for="m-desc">Descrição curta (aparece no card)</label><textarea id="m-desc" rows="2">${esc(m.desc)}</textarea></div>
        <div class="field"><label for="m-det">Detalhes (aparece ao clicar em “Ver detalhes”)</label><textarea id="m-det" rows="5" placeholder="O que está incluso, como funciona, prazos…">${esc(m.detalhes)}</textarea></div>
        <div class="field"><label>Imagens (até 4)</label>
          <div class="imgs" id="m-imgs"></div>
          <input type="file" id="m-file" accept="image/*" multiple hidden>
          <small>As imagens são reduzidas automaticamente. A primeira vira a capa do card.</small>
        </div>
        <div class="drawer-foot"><button class="btn btn-ghost" id="m-cancel">Cancelar</button><button class="btn btn-primary" id="m-ok">Salvar módulo</button></div>
      </div>`;
    document.body.appendChild(d);
    const imgsBox = $("#m-imgs", d);
    const pintar = () => {
      imgsBox.innerHTML = m.imagens.map((u, k) => `<div class="im"><img alt="" src="${esc(u)}"><button type="button" data-k="${k}" aria-label="Remover imagem">×</button></div>`).join("") +
        (m.imagens.length < 4 ? `<div class="add" id="m-add" role="button" tabindex="0">+ Adicionar imagem</div>` : "");
      const add = $("#m-add", d); if (add) add.onclick = () => $("#m-file", d).click();
    };
    pintar();
    imgsBox.addEventListener("click", (e) => { const k = e.target.dataset.k; if (k != null) { m.imagens.splice(+k, 1); pintar(); } });
    $("#m-file", d).onchange = async (e) => {
      for (const f of Array.from(e.target.files)) {
        if (m.imagens.length >= 4) break;
        try { m.imagens.push(await comprimir(f)); } catch (_) { toast("Não consegui ler " + f.name); }
      }
      e.target.value = ""; pintar();
    };
    const fechar = () => d.remove();
    $("#m-cancel", d).onclick = fechar;
    d.addEventListener("mousedown", (e) => { if (e.target === d) fechar(); });
    $("#m-ok", d).onclick = () => {
      const nome = $("#m-nome", d).value.trim();
      if (!nome) return toast("Informe o nome do módulo");
      const total = m.imagens.reduce((a, u) => a + u.length, 0);
      if (total > 900000) return toast("Imagens muito pesadas; remova alguma.");
      Object.assign(m, {
        nome, categoria: $("#m-cat", d).value.trim(), icone: $("#m-ico", d).value,
        preco: Math.max(0, parseFloat($("#m-preco", d).value) || 0), mensal: Math.max(0, parseFloat($("#m-mensal", d).value) || 0),
        desc: $("#m-desc", d).value.trim(), detalhes: $("#m-det", d).value.trim(),
        aPartir: $("#m-apartir", d).checked, padrao: $("#m-padrao", d).checked,
        requer: Array.from(d.querySelectorAll("#m-req input:checked")).map((x) => x.value),
      });
      if (!m.id) m.id = (slugify(nome) || "modulo") + "-" + uid();
      if (i == null) p.modulos.push(m); else p.modulos[i] = m;
      fechar(); viewEditor();
    };
    $("#m-nome", d).focus();
  }

  const somaMods = (p, ids) => (ids || []).reduce((a, id) => { const m = p.modulos.find((x) => x.id === id); return m ? { u: a.u + (+m.preco || 0), m: a.m + (+m.mensal || 0) } : a; }, { u: 0, m: 0 });

  /* ---------- Plano (gaveta) ---------- */
  function drawerPlano(i) {
    const p = ed.p; p.planos = p.planos || [];
    const pl = i == null ? { id: "", nome: "", desc: "", destaque: false, preco: null, mensal: null, modulos: [] } : JSON.parse(JSON.stringify(p.planos[i]));
    const d = document.createElement("div");
    d.className = "drawer";
    d.innerHTML = `
      <div class="drawer-in" role="dialog" aria-modal="true" aria-label="Plano">
        <h2 style="margin-bottom:18px">${i == null ? "Novo plano" : "Editar plano"}</h2>
        <div class="field"><label for="pl-nome">Nome do plano</label><input id="pl-nome" value="${esc(pl.nome)}" placeholder="Ex.: Essential"></div>
        <div class="field"><label for="pl-desc">Descrição curta</label><textarea id="pl-desc" rows="2">${esc(pl.desc)}</textarea></div>
        <label class="check"><input type="checkbox" id="pl-dest" ${pl.destaque ? "checked" : ""}> Destacar como “Mais escolhido”</label>
        <div class="field"><label>Módulos incluídos</label>
          <div class="pick" id="pl-pick">${p.modulos.length ? p.modulos.map((m) => `<label class="pickrow"><input type="checkbox" value="${esc(m.id)}" ${pl.modulos.includes(m.id) ? "checked" : ""}><span>${esc(m.nome)}</span><small>${m.preco > 0 ? brl(m.preco) : ""}${m.mensal > 0 ? (m.preco > 0 ? " + " : "") + brl(m.mensal) + "/mês" : ""}</small></label>`).join("") : "<p class='empty'>Cadastre os módulos primeiro.</p>"}</div>
          <small id="pl-soma"></small>
        </div>
        <div class="cols">
          <div class="field"><label for="pl-preco">Valor único do plano (R$)</label><input id="pl-preco" type="number" min="0" step="0.01" value="${pl.preco == null ? "" : pl.preco}" placeholder="vazio = soma dos módulos"></div>
          <div class="field"><label for="pl-mensal">Valor mensal do plano (R$)</label><input id="pl-mensal" type="number" min="0" step="0.01" value="${pl.mensal == null ? "" : pl.mensal}" placeholder="vazio = soma dos módulos"></div>
        </div>
        <small>Deixe vazio para usar a soma dos módulos. Preencha para dar um valor especial (ex.: pacote com desconto).</small>
        <div class="drawer-foot"><button class="btn btn-ghost" id="pl-cancel">Cancelar</button><button class="btn btn-primary" id="pl-ok">Salvar plano</button></div>
      </div>`;
    document.body.appendChild(d);
    const marcados = () => Array.from(d.querySelectorAll("#pl-pick input:checked")).map((x) => x.value);
    const soma = () => { const s = somaMods(p, marcados()); $("#pl-soma", d).textContent = `Soma dos módulos marcados: ${brl(s.u)}${s.m ? " + " + brl(s.m) + "/mês" : ""} (${marcados().length} módulos)`; };
    d.addEventListener("change", soma); soma();
    const fechar = () => d.remove();
    $("#pl-cancel", d).onclick = fechar;
    d.addEventListener("mousedown", (e) => { if (e.target === d) fechar(); });
    $("#pl-ok", d).onclick = () => {
      const nome = $("#pl-nome", d).value.trim();
      if (!nome) return toast("Informe o nome do plano");
      const mods = marcados();
      if (!mods.length) return toast("Marque ao menos um módulo");
      const num = (id) => { const v = $(id, d).value.trim(); return v === "" ? null : Math.max(0, parseFloat(v) || 0); };
      Object.assign(pl, { nome, desc: $("#pl-desc", d).value.trim(), destaque: $("#pl-dest", d).checked, modulos: mods, preco: num("#pl-preco"), mensal: num("#pl-mensal") });
      if (!pl.id) pl.id = (slugify(nome) || "plano") + "-" + uid().slice(0, 3);
      if (i == null) p.planos.push(pl); else p.planos[i] = pl;
      fechar(); viewEditor();
    };
    $("#pl-nome", d).focus();
  }

  // decide se a logo é clara (precisa de fundo escuro) pela luminância média dos pixels visíveis
  function logoEhClara(url) {
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

  // logo: mantém transparência (PNG), máx. 480x240; se ficar pesada, converte
  function comprimirLogo(file) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const w0 = img.naturalWidth || img.width || 480, h0 = img.naturalHeight || img.height || 240;
        const k = Math.min(1, 480 / w0, 240 / h0);
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        let out = c.toDataURL("image/png");
        if (out.length > 180000) { const w = c.toDataURL("image/webp", 0.85); if (w.startsWith("data:image/webp")) out = w; }
        if (out.length > 180000) out = c.toDataURL("image/jpeg", 0.85);
        URL.revokeObjectURL(url); res(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("img")); };
      img.src = url;
    });
  }

  // reduz a imagem (máx. 1000px) e converte para JPEG, p/ caber no Firestore
  function comprimir(file) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        let max = 1000, q = 0.75, out = "";
        for (let t = 0; t < 5; t++) {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          const x = c.getContext("2d");
          x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
          x.drawImage(img, 0, 0, c.width, c.height);
          out = c.toDataURL("image/jpeg", q);
          if (out.length < 200000) break;
          max *= 0.85; q -= 0.08;
        }
        URL.revokeObjectURL(url); res(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("img")); };
      img.src = url;
    });
  }

  /* ---------- Início ---------- */
  app.innerHTML = `<p class="empty">Carregando…</p>`;
  S.onAuth((u) => {
    user = u;
    if (!u) return viewLogin();
    viewLista();
  });
})();
