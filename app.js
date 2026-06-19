let currentOp = "sp";
let currentData = {};
let currentTab = "";

const tabMap = {
  CEO_Dashboard: "Visão Geral",
  ROI_Plano: "ROI Plano",
  Comparativo_Diario: "Comparativo Diário",
  Plano_Acao_Semanal: "Plano de Ação",
  Efetividade_Acoes: "Efetividade",
  Analise_ABC: "Curva ABC",
  Analise_ABC_Grupo: "Curva ABC",
  Migracao_ABC: "Migração ABC",
  Migracao_ABC_Grupo: "Migração ABC",
  Capital_Investido: "Capital",
  Capital_Grupo: "Capital",
  CHECK_SANIDADE: "Sanidade",
  Check_Sanidade_Grupo: "Sanidade",
  Criterios_Decisao: "📘 Critérios de Decisão",
};

function fmt(v){
  if(v === null || v === undefined) return "";
  if(typeof v === "number"){
    if(Math.abs(v) < 1 && v !== 0) return (v*100).toFixed(1) + "%";
    return v.toLocaleString("pt-BR", {maximumFractionDigits:2});
  }
  return v;
}

async function loadOp(op){
  currentOp = op;
  document.querySelectorAll("#ops button").forEach(b => b.classList.toggle("active", b.dataset.op === op));
  const res = await fetch(`${op}.json`);
  currentData = await res.json();
  buildTabs();
}

function buildTabs(){
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";

  const keys = Object.keys(currentData).filter(k => currentData[k]?.length);
  keys.forEach(k => {
    const btn = document.createElement("button");
    btn.textContent = tabMap[k] || k;
    btn.onclick = () => renderTab(k);
    tabs.appendChild(btn);
  });

  renderTab(keys[0]);
}

function renderTab(key){
  currentTab = key;
  const rows = currentData[key] || [];
  const content = document.getElementById("content");

  if(!rows.length){
    content.innerHTML = "<div class='card'>Sem dados.</div>";
    return;
  }

   if(key === "CEO_Dashboard"){
    renderCEO(rows);
    return;
  }

  if(key === "Capital_Investido" || key === "Capital_Grupo"){
    renderCapital(rows);
    return;
  }

  if(key === "CHECK_SANIDADE" || key === "Check_Sanidade_Grupo"){
    renderSanidade(rows);
    return;
  }

  renderTable(rows);
}

// ── SANIDADE INTERATIVA ──────────────────────────────────────
function renderSanidade(rows){
  const content = document.getElementById("content");

  const resumo = rows.filter(r => r.Bloco === "RESUMO");
  const checks  = rows.filter(r => r.Bloco !== "RESUMO");

  const criticos = checks.filter(r => String(r.Status || "").includes("🔴")).length;
  const atencao  = checks.filter(r => String(r.Status || "").includes("🟡")).length;
  const ok       = checks.filter(r => String(r.Status || "").includes("🟢")).length;

  content.innerHTML = `
    <div class="grid" style="margin-bottom:16px">
      <div class="kpi capital-card" id="btn-critico" style="cursor:pointer;border-color:#ef4444" onclick="sanidadeFiltro('critico')">
        <div class="label">🔴 Críticos</div>
        <div class="value" style="color:#ef4444">${criticos}</div>
        <div style="font-size:11px;color:#888">Clique para filtrar</div>
      </div>
      <div class="kpi capital-card" id="btn-atencao" style="cursor:pointer;border-color:#f59e0b" onclick="sanidadeFiltro('atencao')">
        <div class="label">🟡 Atenção</div>
        <div class="value" style="color:#f59e0b">${atencao}</div>
        <div style="font-size:11px;color:#888">Clique para filtrar</div>
      </div>
      <div class="kpi capital-card" id="btn-ok" style="cursor:pointer;border-color:#22c55e" onclick="sanidadeFiltro('ok')">
        <div class="label">🟢 OK</div>
        <div class="value" style="color:#22c55e">${ok}</div>
        <div style="font-size:11px;color:#888">Clique para filtrar</div>
      </div>
      <div class="kpi capital-card" id="btn-todos" style="cursor:pointer" onclick="sanidadeFiltro('todos')">
        <div class="label">📋 Todos</div>
        <div class="value">${checks.length}</div>
        <div style="font-size:11px;color:#888">Ver lista completa</div>
      </div>
    </div>

    <div id="sanidade-tabela"></div>
    <div id="sanidade-skus" style="margin-top:16px"></div>
  `;

  window._sanidadeChecks = checks;
  sanidadeFiltro("todos");
}

function sanidadeFiltro(filtro){
  ["critico","atencao","ok","todos"].forEach(f => {
    const el = document.getElementById("btn-" + f);
    if(el) el.classList.toggle("selected", f === filtro);
  });

  const checks = window._sanidadeChecks || [];
  let filtered = checks;
  if(filtro === "critico") filtered = checks.filter(r => String(r.Status || "").includes("🔴"));
  else if(filtro === "atencao") filtered = checks.filter(r => String(r.Status || "").includes("🟡"));
  else if(filtro === "ok") filtered = checks.filter(r => String(r.Status || "").includes("🟢"));

  const tabela = document.getElementById("sanidade-tabela");
  if(!tabela) return;

  if(!filtered.length){
    tabela.innerHTML = "<div class='card' style='color:#666;padding:20px'>Nenhum check nessa categoria.</div>";
    document.getElementById("sanidade-skus").innerHTML = "";
    return;
  }

  // Renderizar tabela com linhas clicáveis
  const cols = ["Bloco","Check","Valor","Leitura","Status"];
  tabela.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}<th>SKUs</th></tr></thead>
        <tbody>
          ${filtered.map((r, i) => `
            <tr style="cursor:pointer" onclick="sanidadeMostrarSkus(${i})" title="Clique para ver SKUs">
              ${cols.map(c => `<td>${fmt(r[c])}</td>`).join("")}
              <td style="color:#2563eb;font-size:12px">${r.SKUs_Afetados ? "Ver ▼" : "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  window._sanidadeFiltrada = filtered;
  document.getElementById("sanidade-skus").innerHTML = "";
}

function sanidadeMostrarSkus(idx){
  const row = (window._sanidadeFiltrada || [])[idx];
  const el = document.getElementById("sanidade-skus");
  if(!el || !row) return;

  if(!row.SKUs_Afetados){
    el.innerHTML = "<div class='card' style='color:#666;padding:12px'>Nenhum SKU individual registrado para este check.</div>";
    return;
  }

  const skus = row.SKUs_Afetados.split(",").map(s => s.trim()).filter(Boolean);
  el.innerHTML = `
    <div class="card">
      <b>${row.Check}</b> — ${skus.length} SKU(s) afetado(s):
      <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">
        ${skus.map(s => `<span style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:4px;padding:3px 8px;font-size:12px;font-family:monospace">${s}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderCEO(rows){
  const content = document.getElementById("content");
  const principais = ["Faturamento","Lucro Pós Ads","MPA","TACOS","ROAS","Investimento Ads"];
  const cards = rows.filter(r => principais.includes(r.KPI));

  content.innerHTML = `
    <div class="grid">
      ${cards.map(r => `
        <div class="kpi">
          <div class="label">${r.KPI}</div>
          <div class="value">${fmt(r.Valor)}</div>
          <div>${r.Status || ""}</div>
        </div>
      `).join("")}
    </div>
    ${tableHtml(rows)}
  `;
}
function num(v){
  if(v === null || v === undefined || v === "") return 0;
  if(typeof v === "number") return v;
  return Number(String(v).replace(/\./g,"").replace(",", ".")) || 0;
}

function capitalStatus(row){
  const diag = String(row.Diagnostico_Estoque || "").toUpperCase();
  const status = String(row.Status_Capital || "").toUpperCase();
  const dias = num(row.Dias_Estoque);

  if(diag.includes("RISCO RUPTURA") || dias < 15){
    return "⚠️ RUPTURA / PROTEGER";
  }
  if(status.includes("PROBLEMÁTICO")){
    return "🔴 CAPITAL PROBLEMÁTICO";
  }
  if(status.includes("OVERSTOCK")){
    return "🟠 OVERSTOCK";
  }
  if(status.includes("ESTOQUE ALTO")){
    return "🟡 ESTOQUE ALTO";
  }
  if(status.includes("ESTRATÉGICO")){
    return "🟢 ESTRATÉGICO";
  }
  return status || diag || "MONITORAR";
}

function renderCapital(rows){
  const capitalCol = "Capital_Estimado_Preco_Venda";

  const ordenado = [...rows].sort((a,b) => num(b[capitalCol]) - num(a[capitalCol]));

  const total = ordenado.reduce((s,r) => s + num(r[capitalCol]), 0);
  const problematico = ordenado
    .filter(r => capitalStatus(r).includes("PROBLEMÁTICO"))
    .reduce((s,r) => s + num(r[capitalCol]), 0);

  const ruptura = ordenado
    .filter(r => capitalStatus(r).includes("RUPTURA"))
    .reduce((s,r) => s + num(r[capitalCol]), 0);

  const potencialCaixa = problematico * 0.40;

  document.getElementById("content").innerHTML = `
    <div class="grid">
      <div class="kpi">
        <div class="label">Capital Total</div>
        <div class="value">R$ ${fmt(total)}</div>
      </div>
      <div class="kpi">
        <div class="label">Capital Problemático</div>
        <div class="value">R$ ${fmt(problematico)}</div>
      </div>
      <div class="kpi">
        <div class="label">Capital em Ruptura / Proteger</div>
        <div class="value">R$ ${fmt(ruptura)}</div>
      </div>
      <div class="kpi">
        <div class="label">Potencial Caixa Destravável</div>
        <div class="value">R$ ${fmt(potencialCaixa)}</div>
      </div>
    </div>

    <div class="card">
      <b>Leitura executiva:</b>
      capital problemático é prioridade de destravar caixa, mas itens em ruptura devem ser protegidos antes de qualquer liquidação.
    </div>

    ${tableHtml(
      ordenado.map(r => ({
        Status_Executivo: capitalStatus(r),
        SKU: r.SKU,
        Produto: r.Produto,
        Capital: r[capitalCol],
        Estoque: r.Estoque,
        Dias_Estoque: r.Dias_Estoque,
        Venda_Dia_30d: r.Venda_Dia_30d,
        Diagnostico_Estoque: r.Diagnostico_Estoque,
        Status_Capital: r.Status_Capital,
        Acao_Capital: r.Acao_Capital,
        MPA: r.MPA,
        Lucro_Pos_Ads: r.Lucro_Pos_Ads,
      }))
    )}
  `;
}
function renderTable(rows){
  document.getElementById("content").innerHTML = tableHtml(rows);
}

function tableHtml(rows){
  const cols = Object.keys(rows[0] || {});
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>${cols.map(c => `<td>${fmt(r[c])}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

document.querySelectorAll("#ops button").forEach(btn => {
  btn.onclick = () => loadOp(btn.dataset.op);
});

loadOp("sp");
