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
  const RESERVADOS = ["admin", "index", "proposta", "assets", "styles", "app", "data", "store", "firebase-config", "firebase", "404", "api"];
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
    try { lista = await S.listModelos(); }
    catch (e) {
      console.error(e);
      app.innerHTML = topo() + `<div class="panel"><b class="msg-err">Sem permissão ou erro ao ler.</b><p class="sub" style="margin-top:8px">Confirme que o seu e-mail está na lista <code>isAdmin()</code> do firestore.rules e que as regras foram publicadas. (${esc(e.code || e.message)})</p></div>`;
      bindSair(); return;
    }
    app.innerHTML = topo() + `
      <div class="sec-h" style="margin-top:0"><div><h1>Propostas</h1><p class="sub" style="margin:0">Cada proposta usa o site como base, com os módulos e valores que você cadastrar.</p></div>
      <button class="btn btn-primary" id="nova">+ Nova proposta</button></div>
      ${lista.length ? `<div class="grid-p">${lista.map((p) => `
        <article class="panel pcard" data-slug="${esc(p.slug)}">
          <h3>${esc(p.titulo || p.slug)}</h3>
          <small>${p.cliente ? "Cliente: " + esc(p.cliente) + " · " : ""}${(p.modulos || []).length} módulos</small>
          <code>${esc(linkDe(p.slug))}</code>
          <div class="row">
            <button class="btn btn-primary btn-sm" data-a="edit">Editar</button>
            <a class="btn btn-ghost btn-sm" href="${esc(linkDe(p.slug))}" target="_blank" rel="noopener">Abrir</a>
            <button class="btn btn-ghost btn-sm" data-a="copy">Copiar link</button>
            <button class="btn btn-ghost btn-sm" data-a="dup">Duplicar</button>
            <button class="btn btn-ghost btn-sm" data-a="del">Excluir</button>
          </div>
        </article>`).join("")}</div>` : `<div class="panel empty">Nenhuma proposta ainda. Clique em “Nova proposta”.</div>`}`;
    bindSair();
    $("#nova").onclick = () => abrir(novaProposta());
    app.querySelectorAll(".pcard").forEach((c) => {
      const p = lista.find((x) => x.slug === c.dataset.slug);
      c.addEventListener("click", async (e) => {
        const a = e.target.dataset.a;
        if (!a) return;
        if (a === "edit") abrir(JSON.parse(JSON.stringify(p)), false);
        if (a === "copy") { try { await navigator.clipboard.writeText(linkDe(p.slug)); toast("Link copiado"); } catch (_) { toast(linkDe(p.slug)); } }
        if (a === "dup") {
          const novo = JSON.parse(JSON.stringify(p));
          novo.slug = p.slug + "-copia-" + uid().slice(0, 3);
          novo.titulo = (p.titulo || p.slug) + " (cópia)";
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
    return { slug: "", titulo: "", cliente: "", validadeDias: b.validadeDias || 15, whatsapp: b.whatsapp || "", instagram: b.instagram || "", termos: b.termos.slice(), modulos: [] };
  }

  function abrir(p, novo = true) {
    ed = { p, novo, slugTocado: !novo };
    viewEditor();
  }

  function viewEditor() {
    const p = ed.p;
    app.innerHTML = topo() + `
      <div class="sec-h" style="margin-top:0">
        <div><button class="link-btn" id="voltar">← Voltar às propostas</button><h1>${ed.novo ? "Nova proposta" : "Editar proposta"}</h1></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${!ed.novo ? `<a class="btn btn-ghost" href="${esc(linkDe(p.slug))}" target="_blank" rel="noopener">Ver proposta</a>` : ""}
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
        <div class="field"><label for="f-ig">Instagram</label><input id="f-ig" value="${esc(p.instagram)}" placeholder="@landora.ag"></div>
        <div class="field" style="margin:0"><label for="f-termos">Condições (uma por linha)</label><textarea id="f-termos" rows="4">${esc((p.termos || []).join("\n"))}</textarea></div>
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
      if (a === "del" && confirm("Remover este módulo?")) { p.modulos.splice(i, 1); viewEditor(); }
      if (a === "up" && i > 0) { [p.modulos[i - 1], p.modulos[i]] = [p.modulos[i], p.modulos[i - 1]]; viewEditor(); }
      if (a === "down" && i < p.modulos.length - 1) { [p.modulos[i + 1], p.modulos[i]] = [p.modulos[i], p.modulos[i + 1]]; viewEditor(); }
    };
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
  }

  async function salvar() {
    lerForm();
    const p = ed.p;
    if (!p.titulo) return toast("Dê um nome à proposta");
    if (!p.slug) p.slug = slugify(p.titulo);
    if (!p.slug) return toast("Informe o endereço (slug)");
    if (RESERVADOS.includes(p.slug)) return toast("Esse endereço é reservado, escolha outro");
    if (!p.modulos.length) return toast("Cadastre ao menos um módulo");
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
    const m = i == null ? { id: "", categoria: "", icone: "page", nome: "", desc: "", detalhes: "", imagens: [], preco: 0, mensal: 0 } : JSON.parse(JSON.stringify(p.modulos[i]));
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
      });
      if (!m.id) m.id = (slugify(nome) || "modulo") + "-" + uid();
      if (i == null) p.modulos.push(m); else p.modulos[i] = m;
      fechar(); viewEditor();
    };
    $("#m-nome", d).focus();
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
