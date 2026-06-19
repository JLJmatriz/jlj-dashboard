
let currentOp = "sp";
let currentData = {};
let currentTab = "";

const tabMap = {
  CEO_Dashboard:        "Visão Geral",
  ROI_Plano:            "ROI Plano",
  Comparativo_Diario:   "Comparativo Diário",
  Plano_Acao_Semanal:   "Plano de Ação",
  Efetividade_Acoes:    "Efetividade",
  Analise_ABC:          "Curva ABC",
  Analise_ABC_Grupo:    "Curva ABC",
  Migracao_ABC:         "Migração ABC",
  Migracao_ABC_Grupo:   "Migração ABC",
  Capital_Investido:    "Capital",
  Capital_Grupo:        "Capital",
  CHECK_SANIDADE:       "Sanidade",
  Check_Sanidade_Grupo: "Sanidade",
  Tops_Executivos:      "Tops Executivos",
  Portfolio_Produtos:   "Portfólio",
  Criterios_Decisao:    "📘 Critérios de Decisão",
};

function fmt(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    if (Math.abs(v) < 1 && v !== 0) return (v * 100).toFixed(1) + "%";
    return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
  return v;
}

function num(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  return Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;
}

async function loadOp(op) {
  currentOp = op;
  document.querySelectorAll("#ops button").forEach(b =>
    b.classList.toggle("active", b.dataset.op === op)
  );
  const res = await fetch(`data/${op}.json`);
  currentData = await res.json();
  buildTabs();
}

function buildTabs() {
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

function renderTab(key) {
  currentTab = key;
  const rows = currentData[key] || [];
  const content = document.getElementById("content");
  if (!rows.length) { content.innerHTML = "Sem dados."; return; }
  if (key === "CEO_Dashboard") { renderCEO(rows); return; }
  if (key === "Capital_Investido" || key === "Capital_Grupo") { renderCapital(rows); return; }
  if (key === "CHECK_SANIDADE" || key === "Check_Sanidade_Grupo") { renderSanidade(rows); return; }
  if (key === "Plano_Acao_Semanal") { renderFiltroGenerico(rows, "Frente", "plano"); return; }
  if (key === "Efetividade_Acoes") { renderFiltroGenerico(rows, "Leitura_Efetividade", "efetividade"); return; }
  if (key === "Migracao_ABC" || key === "Migracao_ABC_Grupo") { renderFiltroGenerico(rows, "Movimento_ABC", "migracao"); return; }
  if (key === "Portfolio_Produtos") { renderFiltroGenerico(rows, "Acao_Portfolio", "portfolio"); return; }
  if (key === "Tops_Executivos") { renderFiltroGenerico(rows, "Lista", "tops"); return; }
  if (key === "Curva_ABC" || key === "Analise_ABC" || key === "Analise_ABC_Grupo") { renderFiltroGenerico(rows, "Curva", "abc"); return; }
  renderTable(rows);
}

// ── FILTRO GENÉRICO ──────────────────────────────────────────
function renderFiltroGenerico(rows, campoFiltro, id) {
  const content = document.getElementById("content");

  // Valores únicos do campo de filtro (preservando ordem de aparição)
  const valores = [...new Set(rows.map(r => String(r[campoFiltro] || "")).filter(Boolean))];

  const btnColor = {
    // Plano
    "ADS - PARAR SANGRIA": "#ef4444", "ESCALAR": "#22c55e", "ESTOQUE - RUPTURA": "#f97316",
    "LISTING": "#3b82f6", "PREÇO": "#8b5cf6", "SAZONAL": "#f59e0b",
    // Efetividade
    "🏆 AÇÃO VENCEDORA": "#16a34a", "✅ ESCALA SAUDÁVEL": "#22c55e",
    "⚠️ ESCALA PERIGOSA": "#f97316", "🟡 VENDE MAIS / LUCRA MENOS": "#f59e0b",
    "📦 LIQUIDAÇÃO EFETIVA": "#3b82f6", "🔴 ADS DESTRÓI MARGEM": "#ef4444",
    "❌ AÇÃO NÃO FUNCIONOU": "#dc2626", "➡️ NEUTRO / INCONCLUSIVO": "#6b7280",
    "🔻 PREÇO DESTRUIU GIRO": "#a855f7",
    // Migração ABC
    "SUBIU": "#22c55e", "MANTEVE": "#6b7280", "CAIU": "#ef4444",
    "NOVO / REATIVADO": "#3b82f6", "SAIU / SEM VENDA": "#f97316",
    // Curva
    "A": "#16a34a", "B": "#3b82f6", "C": "#f59e0b",
  };

  content.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <button class="filtro-btn active" id="${id}-todos" onclick="filtroClick('${id}','__todos__','${campoFiltro}')"
        style="padding:6px 14px;border-radius:20px;border:2px solid #1f4e78;background:#1f4e78;color:#fff;cursor:pointer;font-size:13px">
        Todos (${rows.length})
      </button>
      ${valores.map(v => {
        const qtd = rows.filter(r => String(r[campoFiltro] || "") === v).length;
        const cor = btnColor[v] || "#64748b";
        return `<button class="filtro-btn" id="${id}-${btoa(encodeURIComponent(v)).replace(/=/g,'')}"
          onclick="filtroClick('${id}','${v.replace(/'/g,"\\'")}','${campoFiltro}')"
          style="padding:6px 14px;border-radius:20px;border:2px solid ${cor};background:#fff;color:${cor};cursor:pointer;font-size:13px;font-weight:600">
          ${v} (${qtd})
        </button>`;
      }).join("")}
    </div>
    <div id="${id}-tabela">${tableHtml(rows)}</div>
  `;

  window[`_filtro_${id}_rows`] = rows;
  window[`_filtro_${id}_campo`] = campoFiltro;
}

function filtroClick(id, valor, campo) {
  // Highlight do botão
  document.querySelectorAll(".filtro-btn").forEach(b => {
    b.style.background = "#fff";
    b.style.color = b.style.borderColor;
    b.classList.remove("active");
  });
  const btnId = valor === "__todos__" ? `${id}-todos` : `${id}-${btoa(encodeURIComponent(valor)).replace(/=/g,'')}`;
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.style.background = btn.style.borderColor || "#1f4e78";
    btn.style.color = "#fff";
    btn.classList.add("active");
  }

  const rows = window[`_filtro_${id}_rows`] || [];
  const filtered = valor === "__todos__" ? rows : rows.filter(r => String(r[campo] || "") === valor);
  document.getElementById(`${id}-tabela`).innerHTML = tableHtml(filtered);
}

// ── SANIDADE INTERATIVA ──────────────────────────────────────
function renderSanidade(rows) {
  const content = document.getElementById("content");
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

function sanidadeFiltro(filtro) {
  ["critico","atencao","ok","todos"].forEach(f => {
    const el = document.getElementById("btn-" + f);
    if (el) el.classList.toggle("selected", f === filtro);
  });
  const checks = window._sanidadeChecks || [];
  let filtered = checks;
  if (filtro === "critico") filtered = checks.filter(r => String(r.Status || "").includes("🔴"));
  else if (filtro === "atencao") filtered = checks.filter(r => String(r.Status || "").includes("🟡"));
  else if (filtro === "ok") filtered = checks.filter(r => String(r.Status || "").includes("🟢"));

  const tabela = document.getElementById("sanidade-tabela");
  if (!tabela) return;
  if (!filtered.length) {
    tabela.innerHTML = "<div class='card' style='color:#666;padding:20px'>Nenhum check nessa categoria.</div>";
    document.getElementById("sanidade-skus").innerHTML = "";
    return;
  }

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

function sanidadeMostrarSkus(idx) {
  const row = (window._sanidadeFiltrada || [])[idx];
  const el = document.getElementById("sanidade-skus");
  if (!el || !row) return;
  if (!row.SKUs_Afetados) {
    el.innerHTML = "<div class='card' style='color:#666;padding:12px'>Nenhum SKU registrado para este check.</div>";
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

function renderCEO(rows) {
  const content = document.getElementById("content");
  const principais = ["Faturamento", "Lucro Pós Ads", "MPA", "TACOS", "ROAS", "Investimento Ads"];
  const cards = rows.filter(r => principais.includes(r.KPI));
  content.innerHTML = `
    <div class="grid">
      ${cards.map(r => `
        <div class="kpi">
          <div class="label">${r.KPI}</div>
          <div class="value">${fmt(r.Valor)}</div>
          <div>${r.Status || ""}</div>
        </div>`).join("")}
    </div>
    ${tableHtml(rows)}
  `;
}

function capitalStatus(row) {
  const diag   = String(row.Diagnostico_Estoque || "").toUpperCase();
  const status = String(row.Status_Capital      || "").toUpperCase();
  const dias   = num(row.Dias_Estoque);
  if (diag.includes("RISCO RUPTURA") || dias < 15) return "⚠️ RUPTURA / PROTEGER";
  if (status.includes("PROBLEMÁTICO"))              return "🔴 CAPITAL PROBLEMÁTICO";
  if (status.includes("OVERSTOCK"))                 return "🟠 OVERSTOCK";
  if (status.includes("ESTOQUE ALTO"))              return "🟡 ESTOQUE ALTO";
  if (status.includes("ESTRATÉGICO"))               return "🟢 ESTRATÉGICO";
  return status || diag || "MONITORAR";
}

function renderCapital(rows) {
  const capitalCol = "Capital_Estimado_Preco_Venda";
  const base = [...rows].sort((a, b) => num(b[capitalCol]) - num(a[capitalCol]));

  const isProblematico = r => capitalStatus(r).includes("PROBLEMÁTICO");
  const isRuptura      = r => capitalStatus(r).includes("RUPTURA");
  const isOverstock    = r => capitalStatus(r).includes("OVERSTOCK");
  const isEstrategico  = r => capitalStatus(r).includes("ESTRATÉGICO");

  const soma = fn => base.filter(fn).reduce((s, r) => s + num(r[capitalCol]), 0);
  const total          = base.reduce((s, r) => s + num(r[capitalCol]), 0);
  const problematico   = soma(isProblematico);
  const ruptura        = soma(isRuptura);
  const overstock      = soma(isOverstock);
  const estrategico    = soma(isEstrategico);
  const potencialCaixa = problematico * 0.40;

  function tabelaCapital(lista, titulo) {
    return `
      <div class="card">
        <b>${titulo}</b>
        ${tableHtml(lista.map(r => ({
          Status_Executivo:     capitalStatus(r),
          SKU:                  r.SKU,
          Produto:              r.Produto,
          Capital:              r[capitalCol],
          Estoque:              r.Estoque,
          Dias_Estoque:         r.Dias_Estoque,
          Venda_Dia_30d:        r.Venda_Dia_30d,
          Diagnostico_Estoque:  r.Diagnostico_Estoque,
          Status_Capital:       r.Status_Capital,
          Acao_Capital:         r.Acao_Capital,
          MPA:                  r.MPA,
          Lucro_Pos_Ads:        r.Lucro_Pos_Ads,
        })))}
      </div>`;
  }

  document.getElementById("content").innerHTML = `
    <div class="grid">
      <div id="card-total" class="kpi capital-card" onclick="renderCapitalFiltro('total')" style="cursor:pointer">
        <div class="label">Capital Total</div>
        <div class="value">R$ ${fmt(total)}</div>
        <div>Clique para ver tudo</div>
      </div>
      <div id="card-problematico" class="kpi capital-card" onclick="renderCapitalFiltro('problematico')" style="cursor:pointer">
        <div class="label">Capital Problemático</div>
        <div class="value">R$ ${fmt(problematico)}</div>
        <div>Prioridade: destravar caixa</div>
      </div>
      <div id="card-ruptura" class="kpi capital-card" onclick="renderCapitalFiltro('ruptura')" style="cursor:pointer">
        <div class="label">Ruptura / Proteger</div>
        <div class="value">R$ ${fmt(ruptura)}</div>
        <div>Não liquidar sem análise</div>
      </div>
      <div id="card-overstock" class="kpi capital-card" onclick="renderCapitalFiltro('overstock')" style="cursor:pointer">
        <div class="label">Overstock</div>
        <div class="value">R$ ${fmt(overstock)}</div>
        <div>Girar com controle</div>
      </div>
      <div id="card-estrategico" class="kpi capital-card" onclick="renderCapitalFiltro('estrategico')" style="cursor:pointer">
        <div class="label">Capital Estratégico</div>
        <div class="value">R$ ${fmt(estrategico)}</div>
        <div>Proteger / escalar</div>
      </div>
      <div id="card-potencial" class="kpi capital-card" onclick="renderCapitalFiltro('potencial')" style="cursor:pointer">
        <div class="label">Potencial Caixa</div>
        <div class="value">R$ ${fmt(potencialCaixa)}</div>
        <div>Estimativa 40% problemático</div>
      </div>
    </div>
    <div class="card">
      <b>Leitura executiva:</b>
      clique em um card para filtrar a tabela abaixo.
      Capital problemático é prioridade de caixa; ruptura deve ser protegida.
    </div>
    <div id="capital-table">
      ${tabelaCapital(base, "Todos os SKUs por capital")}
    </div>
  `;

  window.capitalBase    = base;
  window.tabelaCapital  = tabelaCapital;
  window.isProblematico = isProblematico;
  window.isRuptura      = isRuptura;
  window.isOverstock    = isOverstock;
  window.isEstrategico  = isEstrategico;
}

function renderCapitalFiltro(tipo) {
  document.querySelectorAll(".capital-card").forEach(c => c.classList.remove("selected"));
  const cardMap = {
    total: "card-total", potencial: "card-potencial",
    problematico: "card-problematico", ruptura: "card-ruptura",
    overstock: "card-overstock", estrategico: "card-estrategico",
  };
  if (cardMap[tipo]) document.getElementById(cardMap[tipo])?.classList.add("selected");
  const base = window.capitalBase || [];
  let lista = base, titulo = "Todos os SKUs por capital";
  if (tipo === "problematico") { lista = base.filter(window.isProblematico); titulo = "🔴 Capital Problemático"; }
  if (tipo === "ruptura")      { lista = base.filter(window.isRuptura);      titulo = "⚠️ Ruptura / Proteger"; }
  if (tipo === "overstock")    { lista = base.filter(window.isOverstock);    titulo = "🟠 Overstock"; }
  if (tipo === "estrategico")  { lista = base.filter(window.isEstrategico);  titulo = "🟢 Capital Estratégico"; }
  if (tipo === "potencial")    { lista = base.filter(window.isProblematico); titulo = "💰 Potencial Caixa Destravável"; }
  document.getElementById("capital-table").innerHTML = window.tabelaCapital(lista, titulo);
}

function renderTable(rows) {
  document.getElementById("content").innerHTML = tableHtml(rows);
}

function tableHtml(rows) {
  const cols = Object.keys(rows[0] || {});
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr>${cols.map(c => `<td>${fmt(r[c])}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

document.querySelectorAll("#ops button").forEach(btn => {
  btn.onclick = () => loadOp(btn.dataset.op);
});

loadOp("sp");
