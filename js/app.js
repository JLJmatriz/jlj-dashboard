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

function num(v){
  if(v === null || v === undefined || v === "") return 0;
  if(typeof v === "number") return v;
  return Number(String(v).replace(/\./g,"").replace(",", ".")) || 0;
}

async function loadOp(op){
  currentOp = op;
  document.querySelectorAll("#ops button").forEach(b => b.classList.toggle("active", b.dataset.op === op));
  const res = await fetch(`data/${op}.json`);
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

  renderTable(rows);
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
  const base = [...rows].sort((a,b) => num(b[capitalCol]) - num(a[capitalCol]));

  function isProblematico(r){
    return capitalStatus(r).includes("PROBLEMÁTICO");
  }

  function isRuptura(r){
    return capitalStatus(r).includes("RUPTURA");
  }

  function isOverstock(r){
    return capitalStatus(r).includes("OVERSTOCK");
  }

  function isEstrategico(r){
    return capitalStatus(r).includes("ESTRATÉGICO");
  }

  const total = base.reduce((s,r) => s + num(r[capitalCol]), 0);

  const problematico = base
    .filter(isProblematico)
    .reduce((s,r) => s + num(r[capitalCol]), 0);

  const ruptura = base
    .filter(isRuptura)
    .reduce((s,r) => s + num(r[capitalCol]), 0);

  const overstock = base
    .filter(isOverstock)
    .reduce((s,r) => s + num(r[capitalCol]), 0);

  const estrategico = base
    .filter(isEstrategico)
    .reduce((s,r) => s + num(r[capitalCol]), 0);

  const potencialCaixa = problematico * 0.40;

  function tabelaCapital(lista, titulo){
    return `
      <div class="card">
        <b>${titulo}</b>
        ${tableHtml(
          lista.map(r => ({
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
      </div>
    `;
  }

  document.getElementById("content").innerHTML = `
    <div class="grid">
      <div class="kpi" onclick="renderCapitalFiltro('total')" style="cursor:pointer">
        <div class="label">Capital Total</div>
        <div class="value">R$ ${fmt(total)}</div>
        <div>Clique para ver tudo</div>
      </div>

      <div class="kpi" onclick="renderCapitalFiltro('problematico')" style="cursor:pointer">
        <div class="label">Capital Problemático</div>
        <div class="value">R$ ${fmt(problematico)}</div>
        <div>Prioridade: destravar caixa</div>
      </div>

      <div class="kpi" onclick="renderCapitalFiltro('ruptura')" style="cursor:pointer">
        <div class="label">Ruptura / Proteger</div>
        <div class="value">R$ ${fmt(ruptura)}</div>
        <div>Não liquidar sem análise</div>
      </div>

      <div class="kpi" onclick="renderCapitalFiltro('overstock')" style="cursor:pointer">
        <div class="label">Overstock</div>
        <div class="value">R$ ${fmt(overstock)}</div>
        <div>Girar com controle</div>
      </div>

      <div class="kpi" onclick="renderCapitalFiltro('estrategico')" style="cursor:pointer">
        <div class="label">Capital Estratégico</div>
        <div class="value">R$ ${fmt(estrategico)}</div>
        <div>Proteger / escalar</div>
      </div>

      <div class="kpi" onclick="renderCapitalFiltro('problematico')" style="cursor:pointer">
        <div class="label">Potencial Caixa</div>
        <div class="value">R$ ${fmt(potencialCaixa)}</div>
        <div>Estimativa 40%</div>
      </div>
    </div>

    <div class="card">
      <b>Leitura executiva:</b>
      clique em um card para filtrar a tabela abaixo. Capital problemático é prioridade de caixa; ruptura deve ser protegida.
    </div>

    <div id="capital-table">
      ${tabelaCapital(base, "Todos os SKUs por capital")}
    </div>
  `;

  window.capitalBase = base;
  window.tabelaCapital = tabelaCapital;
  window.isProblematico = isProblematico;
  window.isRuptura = isRuptura;
  window.isOverstock = isOverstock;
  window.isEstrategico = isEstrategico;
}
function renderCapitalFiltro(tipo){
  const base = window.capitalBase || [];
  let lista = base;
  let titulo = "Todos os SKUs por capital";

  if(tipo === "problematico"){
    lista = base.filter(window.isProblematico);
    titulo = "🔴 Capital Problemático — ação para destravar caixa";
  }

  if(tipo === "ruptura"){
    lista = base.filter(window.isRuptura);
    titulo = "⚠️ Ruptura / Proteger Estoque — não liquidar automaticamente";
  }

  if(tipo === "overstock"){
    lista = base.filter(window.isOverstock);
    titulo = "🟠 Overstock — girar com controle";
  }

  if(tipo === "estrategico"){
    lista = base.filter(window.isEstrategico);
    titulo = "🟢 Capital Estratégico — proteger e escalar";
  }

  document.getElementById("capital-table").innerHTML =
    window.tabelaCapital(lista, titulo);
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
