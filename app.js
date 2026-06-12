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
  Check_Sanidade_Grupo: "Sanidade"
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
