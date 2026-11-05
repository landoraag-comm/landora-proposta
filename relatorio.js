/* LANDORA — relatório da proposta (abre em nova aba, pronto para imprimir / salvar em PDF) */
(function () {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const brl = (v) => (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="252.31 184.38 547.01 631.24"><defs><linearGradient id="lg-a" gradientUnits="userSpaceOnUse" x1="252.31276" y1="336.39911" x2="404.33191" y2="646.86389"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#0057ff"/></linearGradient><linearGradient id="lg-b" gradientUnits="userSpaceOnUse" x1="799.31927" y1="815.62048" x2="522.25476" y2="605.17554"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#0057ff"/></linearGradient></defs><path fill="url(#lg-a)" d="M 404.33191,184.37944 252.31276,336.3991 v 231.10941 0.13229 231.24222 L 404.33191,646.86388 V 567.6408 530.225 415.62166 v -0.0176 z"/><path fill="url(#lg-b)" d="M 522.25476,605.17553 311.8098,815.62049 v 0 h 487.50948 v 0 L 622.93839,605.17553 Z"/></svg>`;
  const ICON_URI = "data:image/svg+xml;utf8," + encodeURIComponent(ICON);

  function abrir(p, linkProposta) {
    const mods = p.modulos || [], planos = p.planos || [];
    const byId = Object.fromEntries(mods.map((m) => [m.id, m]));
    const soma = (ids) => (ids || []).reduce((a, id) => { const m = byId[id]; return m ? { u: a.u + (+m.preco || 0), m: a.m + (+m.mensal || 0) } : a; }, { u: 0, m: 0 });
    const total = soma(mods.map((m) => m.id));
    const nomeCli = p.cliente || p.titulo || p.slug || "Cliente";
    const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const noPlano = new Set(planos.flatMap((pl) => pl.modulos));
    const preco = (m) => (m.preco > 0 ? brl(m.preco) : "—");
    const mensal = (m) => (m.mensal > 0 ? brl(m.mensal) + "/mês" : "—");

    const planoHtml = planos.map((pl) => {
      const s = soma(pl.modulos);
      const pu = pl.preco == null ? s.u : pl.preco, pm = pl.mensal == null ? s.m : pl.mensal;
      const dif = s.u - pu;
      return `
      <section class="plano ${pl.destaque ? "dest" : ""}">
        <header>
          <div><h3>${esc(pl.nome)}${pl.destaque ? ' <span class="tag">Mais escolhido</span>' : ""}</h3>${pl.desc ? `<p>${esc(pl.desc)}</p>` : ""}</div>
          <div class="pv"><b>${brl(pu)}</b><small>único</small>${pm > 0 ? `<em>+ ${brl(pm)}/mês</em>` : ""}</div>
        </header>
        <table>
          <thead><tr><th>Módulo</th><th>Categoria</th><th class="r">Único</th><th class="r">Mensal</th></tr></thead>
          <tbody>${pl.modulos.map((id) => byId[id]).filter(Boolean).map((m) => `<tr><td>${esc(m.nome)}</td><td>${esc(m.categoria || "")}</td><td class="r">${preco(m)}</td><td class="r">${mensal(m)}</td></tr>`).join("")}</tbody>
          <tfoot>
            <tr><td colspan="2">Soma dos módulos (${pl.modulos.length})</td><td class="r">${brl(s.u)}</td><td class="r">${s.m > 0 ? brl(s.m) + "/mês" : "—"}</td></tr>
            ${pl.preco != null || pl.mensal != null ? `<tr class="esp"><td colspan="2">Valor do plano${dif > 0 ? ` · economia de ${brl(dif)}` : dif < 0 ? ` · acréscimo de ${brl(-dif)}` : ""}</td><td class="r">${brl(pu)}</td><td class="r">${pm > 0 ? brl(pm) + "/mês" : "—"}</td></tr>` : ""}
          </tfoot>
        </table>
      </section>`;
    }).join("");

    const cats = [...new Set(mods.map((m) => m.categoria || "Outros"))];
    const modsHtml = cats.map((c) => `
      <h4>${esc(c)}</h4>
      <table>
        <thead><tr><th>Módulo</th><th>Planos</th><th class="r">Único</th><th class="r">Mensal</th></tr></thead>
        <tbody>${mods.filter((m) => (m.categoria || "Outros") === c).map((m) => {
          const em = planos.filter((pl) => pl.modulos.includes(m.id)).map((pl) => `<i>${esc(pl.nome)}</i>`).join("");
          return `<tr><td><b>${esc(m.nome)}</b>${m.desc ? `<small>${esc(m.desc)}</small>` : ""}</td><td class="pl">${em || '<span class="mut">avulso</span>'}</td><td class="r">${preco(m)}</td><td class="r">${mensal(m)}</td></tr>`;
        }).join("")}</tbody>
      </table>`).join("");

    const avulsos = planos.length ? mods.filter((m) => !noPlano.has(m.id)) : [];
    const termos = (p.termos || []).filter(Boolean);
    const logoBg = p.logoFundo === "transparente" ? "transparent" : "#FFFFFF";

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark">
<title>Relatório · ${esc(nomeCli)} · Landora</title>
<link rel="icon" type="image/svg+xml" href="${ICON_URI}">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Michroma&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
<style>
:root{color-scheme:dark;--bg:#0A0A0A;--panel:#1F2937;--line:rgba(255,255,255,.12);--muted:rgba(255,255,255,.64);--blue:#0057FF;--navy:#1E3A8A}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#0A0A0A radial-gradient(ellipse 90% 480px at 50% 0,rgba(0,87,255,.16),rgba(30,58,138,.08) 45%,transparent 75%) no-repeat;color:#fff;font:14px/1.55 Inter,system-ui,sans-serif}
.wrap{max-width:900px;margin:0 auto;padding:32px 24px 60px}
h1,h2,h3,h4,.pv b,.kpi b{font-family:Sora,Inter,sans-serif;letter-spacing:-.02em;margin:0}
.top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-bottom:20px;border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:12px}.brand svg{height:34px;width:auto}.brand b{font:400 17px Michroma,Inter,sans-serif;letter-spacing:.3em}.brand small{display:block;font:500 7px Inter;letter-spacing:.32em;color:var(--muted);text-align:left;margin-top:3px}.top small{color:var(--muted);text-align:right;font-size:12px}
.hero{margin:28px 0 22px;display:flex;gap:22px;align-items:center;flex-wrap:wrap}
.clogo{width:150px;height:84px;border-radius:14px;background:${logoBg};display:grid;place-items:center;padding:10px;flex:none}
.clogo img{max-width:100%;max-height:100%;object-fit:contain}
.eyebrow{font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--muted)}
h1{font-size:34px;line-height:1.1;margin:6px 0}
h1 span{background:linear-gradient(90deg,#fff,#0057FF);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{color:var(--muted)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:22px 0 30px}
.kpi{background:linear-gradient(180deg,rgba(31,41,55,.72),rgba(10,10,10,.72));border:1px solid var(--line);border-radius:16px;padding:14px 16px}
.kpi small{display:block;color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.kpi b{font-size:20px;display:block;margin-top:4px}
h2{font-size:20px;margin:34px 0 14px;padding-left:12px;border-left:3px solid var(--blue)}
h4{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#fff;margin:22px 0 8px;opacity:.8}
.plano{background:linear-gradient(180deg,rgba(31,41,55,.72),rgba(10,10,10,.72));border:1px solid var(--line);border-radius:18px;padding:18px 18px 8px;margin-bottom:16px;break-inside:avoid}
.plano.dest{border-color:rgba(0,87,255,.7);box-shadow:0 0 0 1px rgba(0,87,255,.25)}
.plano header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:10px}
.plano h3{font-size:20px}.plano header p{margin:4px 0 0;color:var(--muted);font-size:13px}
.tag{font:600 10px Inter;letter-spacing:.06em;background:linear-gradient(135deg,var(--navy),var(--blue));padding:3px 9px;border-radius:999px;vertical-align:middle;margin-left:6px}
.pv{text-align:right;white-space:nowrap}.pv b{font-size:24px}.pv small{color:var(--muted);margin-left:4px}.pv em{display:block;font-style:normal;color:var(--muted);font-size:12px}
table{width:100%;border-collapse:collapse;margin-bottom:10px}
th{text-align:left;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600;padding:6px 8px;border-bottom:1px solid var(--line)}
td{padding:8px;border-bottom:1px solid rgba(255,255,255,.06);vertical-align:top}
td small{display:block;color:var(--muted);font-size:12px;margin-top:2px}
.r{text-align:right;white-space:nowrap}
tr{break-inside:avoid}
tfoot td{border-bottom:0;color:var(--muted)}tfoot .esp td{color:#fff;font-weight:600}
td.pl{white-space:nowrap;width:1%}
i{display:inline-block;font-style:normal;font-weight:600;font-size:11px;padding:3px 10px;margin:0 4px 0 0;border-radius:999px;background:linear-gradient(135deg,#1E3A8A,#0057FF);color:#fff}
.mut{color:var(--muted);font-size:12px}
ul.t{margin:0;padding-left:18px;color:var(--muted)}ul.t li{margin:5px 0}
.foot{margin-top:36px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:12px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.bar{position:sticky;top:0;z-index:5;display:flex;gap:10px;justify-content:flex-end;padding:12px 24px;background:#0A0A0A;border-bottom:1px solid var(--line)}
.bar button{font:600 13px Inter;color:#fff;border:1px solid var(--line);background:transparent;border-radius:999px;padding:9px 18px;cursor:pointer}
.bar button.p{background:linear-gradient(135deg,var(--navy),var(--blue));border:0}
@media(max-width:640px){.kpis{grid-template-columns:1fr 1fr}h1{font-size:26px}.plano header{flex-direction:column}.pv{text-align:left}th:nth-child(2),td:nth-child(2){display:none}.wrap{padding:20px 14px 50px}}
</style></head><body>
<div class="bar"><button onclick="window.close()">Fechar</button><button id="b-png">Baixar PNG</button><button class="p" id="b-pdf">Baixar PDF</button></div>
<div class="wrap">
  <div class="top"><div class="brand">${ICON}<div><b>LANDORA</b><small>LANDING PAGES BUILT TO CONVERT</small></div></div><small>Relatório da proposta<br>${esc(hoje)}</small></div>
  <div class="hero">
    ${p.logo ? `<div class="clogo"><img src="${esc(p.logo)}" alt=""></div>` : ""}
    <div><div class="eyebrow">Proposta preparada para</div><h1><span>${esc(nomeCli)}</span></h1><div class="sub">${esc(p.titulo || "")}${p.titulo ? " · " : ""}válida por ${esc(p.validadeDias || 15)} dias</div></div>
  </div>
  <div class="kpis">
    <div class="kpi"><small>Módulos</small><b>${mods.length}</b></div>
    <div class="kpi"><small>Planos</small><b>${planos.length || "—"}</b></div>
    <div class="kpi"><small>Todos os módulos</small><b>${brl(total.u)}</b></div>
    <div class="kpi"><small>Recorrência total</small><b>${brl(total.m)}/mês</b></div>
  </div>
  ${planos.length ? `<h2>Planos</h2>${planoHtml}` : ""}
  ${avulsos.length ? `<h2>Módulos avulsos <small class="mut">(fora dos planos)</small></h2><table><thead><tr><th>Módulo</th><th>Categoria</th><th class="r">Único</th><th class="r">Mensal</th></tr></thead><tbody>${avulsos.map((m) => `<tr><td>${esc(m.nome)}</td><td>${esc(m.categoria || "")}</td><td class="r">${preco(m)}</td><td class="r">${mensal(m)}</td></tr>`).join("")}</tbody></table>` : ""}
  <h2>Todos os módulos e valores</h2>
  ${modsHtml}
  ${termos.length ? `<h2>Condições</h2><ul class="t">${termos.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
  <div class="foot"><span>Landora · Landing pages built to convert${p.instagram ? " · " + esc(p.instagram) : ""}${p.whatsapp ? " · WhatsApp " + esc(p.whatsapp) : ""}</span><span>${linkProposta ? esc(linkProposta) : ""}</span></div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script>
(function(){
  var nome=${JSON.stringify("relatorio-" + (p.slug || "proposta"))};
  function cap(){
    var el=document.querySelector(".wrap");
    return (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){
      return html2canvas(el,{backgroundColor:"#0A0A0A",scale:2,useCORS:true,windowWidth:960,onclone:function(d){d.querySelector(".wrap").style.width="900px";var s=d.querySelector("h1 span");s.style.background="none";s.style.webkitTextFillColor="#fff";s.style.color="#fff"}});
    });
  }
  function busy(b,t){b.disabled=!!t;b.textContent=t||b.dataset.l}
  ["b-png","b-pdf"].forEach(function(id){var b=document.getElementById(id);b.dataset.l=b.textContent});
  document.getElementById("b-png").onclick=function(){var b=this;busy(b,"Gerando…");cap().then(function(c){var a=document.createElement("a");a.download=nome+".png";a.href=c.toDataURL("image/png");a.click();busy(b)}).catch(function(){busy(b);alert("Não foi possível gerar o PNG.")})};
  document.getElementById("b-pdf").onclick=function(){var b=this;busy(b,"Gerando…");cap().then(function(c){
    var w=c.width/2,h=c.height/2,P=window.jspdf.jsPDF;
    var d=new P({orientation:w>h?"l":"p",unit:"px",format:[w,h],hotfixes:["px_scaling"]});
    d.addImage(c.toDataURL("image/jpeg",.92),"JPEG",0,0,w,h);d.save(nome+".pdf");busy(b)}).catch(function(){busy(b);alert("Não foi possível gerar o PDF.")})};
})();
</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { alert("Permita pop-ups para abrir o relatório."); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }
  window.Relatorio = { abrir };
})();
