const fs = require('fs');
const path = require('path');
const mysql = require('../backend/node_modules/mysql2/promise');

const rootDir = path.resolve(__dirname, '..');
const reportsDir = path.join(rootDir, 'reports');
const today = new Date().toISOString().slice(0, 10);
const outputHtml = path.join(reportsDir, `dashboard-mv2026-${today}.html`);

const totalExpr = `
  COALESCE(projecao_votos,0)
  + COALESCE(projecao_base,0)
  + COALESCE(projecao_2,0)
  + COALESCE(projecao_apoio_iurd,0)
`;

const connectionConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'mv2026',
  database: process.env.MYSQL_DATABASE || 'mv2026_db',
};

function fmt(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function pct(value, total) {
  if (!total) return '0,0%';
  return `${((Number(value || 0) / Number(total)) * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function clean(value, fallback = 'Sem classificação') {
  return value == null || String(value).trim() === '' ? fallback : String(value).trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function barRows(rows, total, labelKey, valueKey, countKey) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  return rows
    .map((row) => {
      const value = Number(row[valueKey] || 0);
      const width = Math.max((value / max) * 100, 2);
      const count = countKey ? `<span>${fmt(row[countKey])} mun.</span>` : '';
      return `
        <div class="bar-row">
          <div class="bar-label">${escapeHtml(clean(row[labelKey]))}</div>
          <div class="bar-track"><span style="width:${width}%"></span></div>
          <div class="bar-value"><strong>${fmt(value)}</strong><span>${pct(value, total)}</span>${count}</div>
        </div>`;
    })
    .join('');
}

function tableRows(rows, cells) {
  return rows
    .map((row, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        ${cells.map((cell) => `<td class="${cell.className || ''}">${cell.render(row)}</td>`).join('')}
      </tr>`)
    .join('');
}

async function main() {
  fs.mkdirSync(reportsDir, { recursive: true });
  const db = await mysql.createConnection(connectionConfig);

  const [[summary]] = await db.query(`
    SELECT
      COUNT(*) AS total_cidades,
      SUM(${totalExpr}) AS total_projecao,
      SUM(COALESCE(votos_22,0)) AS votos_2022,
      SUM(COALESCE(projecao_votos,0)) AS projecao_principal,
      SUM(COALESCE(projecao_base,0)) AS projecao_base,
      SUM(COALESCE(projecao_2,0)) AS projecao_2,
      SUM(COALESCE(projecao_apoio_iurd,0)) AS apoio_iurd,
      COUNT(DISTINCT regiao) AS total_regioes,
      COUNT(DISTINCT rm_ra) AS total_rm_ra
    FROM municipios
  `);

  const [tipoCadastro] = await db.query(`
    SELECT COALESCE(tipo_cadastro, 'Sem tipo informado') AS tipo, COUNT(*) AS total_registros, SUM(${totalExpr}) AS total_projecao
    FROM municipios
    GROUP BY COALESCE(tipo_cadastro, 'Sem tipo informado')
    ORDER BY total_projecao DESC
  `);

  const [porRmRa] = await db.query(`
    SELECT COALESCE(rm_ra, 'Sem RM/RA') AS rm_ra, COUNT(*) AS total_municipios, SUM(${totalExpr}) AS total_projecao
    FROM municipios
    GROUP BY COALESCE(rm_ra, 'Sem RM/RA')
    ORDER BY total_projecao DESC
    LIMIT 12
  `);

  const [porRegiao] = await db.query(`
    SELECT COALESCE(regiao, 'Sem região') AS regiao, COUNT(*) AS total_municipios, SUM(${totalExpr}) AS total_projecao
    FROM municipios
    GROUP BY COALESCE(regiao, 'Sem região')
    ORDER BY total_projecao DESC
    LIMIT 12
  `);

  const [porBloco] = await db.query(`
    SELECT COALESCE(bloco, 'Sem bloco') AS bloco, COUNT(*) AS total_municipios, SUM(${totalExpr}) AS total_projecao
    FROM municipios
    GROUP BY COALESCE(bloco, 'Sem bloco')
    ORDER BY total_projecao DESC
    LIMIT 12
  `);

  const [topMunicipios] = await db.query(`
    SELECT
      nome,
      COALESCE(regiao, 'Sem região') AS regiao,
      COALESCE(bloco, 'Sem bloco') AS bloco,
      COALESCE(votos_22,0) AS votos_2022,
      ${totalExpr} AS total_projecao,
      COALESCE(votos_22,0) + ${totalExpr} AS potencial_total
    FROM municipios
    ORDER BY total_projecao DESC
    LIMIT 15
  `);

  await db.end();

  const total = Number(summary.total_projecao || 0);
  const generatedAt = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório Dashboard MV2026</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #152018;
      font: 13px/1.42 -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      background: #f6f7f4;
    }
    .page {
      width: 100%;
      min-height: 100vh;
      padding: 0;
      background: #f6f7f4;
    }
    header {
      padding: 26px 30px 22px;
      color: #fff;
      background: linear-gradient(135deg, #163624 0%, #255f43 55%, #bd8f2c 100%);
      border-radius: 0 0 18px 18px;
    }
    .eyebrow { margin: 0 0 8px; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #dbe9ce; }
    h1 { margin: 0; font-size: 30px; line-height: 1.05; letter-spacing: 0; }
    .subtitle { width: 75%; margin: 10px 0 0; color: #eef5ea; font-size: 13px; }
    .meta { margin-top: 14px; color: #dbe9ce; font-size: 11px; }
    section { padding: 18px 30px 0; }
    h2 { margin: 0 0 10px; font-size: 16px; color: #163624; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .card {
      background: #fff;
      border: 1px solid #dde3d8;
      border-radius: 8px;
      padding: 13px;
      min-height: 88px;
    }
    .card .label { color: #5f6e61; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .card .value { margin-top: 6px; color: #163624; font-size: 24px; font-weight: 850; }
    .card .note { margin-top: 4px; color: #6f7c70; font-size: 11px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .panel {
      background: #fff;
      border: 1px solid #dde3d8;
      border-radius: 8px;
      padding: 14px;
      page-break-inside: avoid;
    }
    .bar-row { display: grid; grid-template-columns: 132px 1fr 82px; align-items: center; gap: 8px; margin: 8px 0; }
    .bar-label { font-size: 10.5px; font-weight: 750; color: #26372a; overflow-wrap: anywhere; }
    .bar-track { height: 10px; overflow: hidden; background: #edf1e8; border-radius: 999px; }
    .bar-track span { display: block; height: 100%; background: linear-gradient(90deg, #2f7d55, #c79b37); border-radius: 999px; }
    .bar-value { text-align: right; color: #667366; font-size: 9.5px; line-height: 1.2; }
    .bar-value strong, .bar-value span { display: block; }
    .bar-value strong { color: #163624; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #dde3d8; border-radius: 8px; overflow: hidden; }
    th { color: #fff; background: #234b34; font-size: 10px; text-align: left; text-transform: uppercase; padding: 8px 7px; }
    td { border-top: 1px solid #e6eadf; padding: 7px; vertical-align: top; font-size: 11px; }
    .rank { width: 26px; color: #7c887b; text-align: center; font-weight: 800; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .muted { color: #667366; font-size: 10px; }
    .callout {
      margin-top: 8px;
      padding: 10px 12px;
      background: #fff8e7;
      border: 1px solid #ead8aa;
      border-radius: 8px;
      color: #55451f;
      font-size: 11px;
    }
    footer { padding: 16px 30px 0; color: #6c776b; font-size: 10px; }
    .break { page-break-before: always; }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <p class="eyebrow">Eco Sistema Legis · Dashboard eleitoral</p>
      <h1>Relatório Executivo MV2026</h1>
      <p class="subtitle">Consolidação das projeções por município, região, bloco e RM/RA com base no banco local <strong>mv2026_db</strong>.</p>
      <div class="meta">Gerado em ${generatedAt} · Fonte: tabela municipios · UF SP</div>
    </header>

    <section>
      <div class="cards">
        <div class="card"><div class="label">Municípios</div><div class="value">${fmt(summary.total_cidades)}</div><div class="note">Base territorial cadastrada</div></div>
        <div class="card"><div class="label">Projeção total</div><div class="value">${fmt(summary.total_projecao)}</div><div class="note">Soma das quatro projeções</div></div>
        <div class="card"><div class="label">Votos 2022</div><div class="value">${fmt(summary.votos_2022)}</div><div class="note">Histórico disponível</div></div>
        <div class="card"><div class="label">Potencial combinado</div><div class="value">${fmt(Number(summary.total_projecao || 0) + Number(summary.votos_2022 || 0))}</div><div class="note">Votos 2022 + projeção</div></div>
      </div>
      <div class="cards" style="margin-top:10px">
        <div class="card"><div class="label">Projeção principal</div><div class="value">${fmt(summary.projecao_principal)}</div><div class="note">${pct(summary.projecao_principal, total)} do total</div></div>
        <div class="card"><div class="label">Base</div><div class="value">${fmt(summary.projecao_base)}</div><div class="note">${pct(summary.projecao_base, total)} do total</div></div>
        <div class="card"><div class="label">Projeção 2</div><div class="value">${fmt(summary.projecao_2)}</div><div class="note">${pct(summary.projecao_2, total)} do total</div></div>
        <div class="card"><div class="label">Apoio IURD</div><div class="value">${fmt(summary.apoio_iurd)}</div><div class="note">${pct(summary.apoio_iurd, total)} do total</div></div>
      </div>
      <div class="callout">Observação: no banco local consultado, o campo <strong>tipo_cadastro</strong> está nulo para todos os ${fmt(summary.total_cidades)} municípios. Por isso, o relatório registra a ausência dessa segmentação e prioriza os agrupamentos territoriais disponíveis.</div>
    </section>

    <section>
      <div class="grid-2">
        <div class="panel">
          <h2>Top RM/RA por Projeção</h2>
          ${barRows(porRmRa, total, 'rm_ra', 'total_projecao', 'total_municipios')}
        </div>
        <div class="panel">
          <h2>Top Regiões por Projeção</h2>
          ${barRows(porRegiao, total, 'regiao', 'total_projecao', 'total_municipios')}
        </div>
      </div>
    </section>

    <section>
      <div class="grid-2">
        <div class="panel">
          <h2>Top Blocos por Projeção</h2>
          ${barRows(porBloco, total, 'bloco', 'total_projecao', 'total_municipios')}
        </div>
        <div class="panel">
          <h2>Tipo de Cadastro</h2>
          ${barRows(tipoCadastro, total, 'tipo', 'total_projecao', 'total_registros')}
        </div>
      </div>
    </section>

    <section class="break">
      <h2>Municípios com Maior Projeção</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Município</th>
            <th>Região</th>
            <th>Bloco</th>
            <th class="num">Votos 2022</th>
            <th class="num">Projeção</th>
            <th class="num">Potencial</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows(topMunicipios, [
            { render: (row) => `<strong>${escapeHtml(clean(row.nome))}</strong>` },
            { render: (row) => escapeHtml(clean(row.regiao)) },
            { render: (row) => escapeHtml(clean(row.bloco)) },
            { className: 'num', render: (row) => fmt(row.votos_2022) },
            { className: 'num', render: (row) => `<strong>${fmt(row.total_projecao)}</strong>` },
            { className: 'num', render: (row) => fmt(row.potencial_total) },
          ])}
        </tbody>
      </table>
    </section>

    <footer>
      Relatório gerado automaticamente a partir do MySQL local. Total de projeção = projecao_votos + projecao_base + projecao_2 + projecao_apoio_iurd.
    </footer>
  </main>
</body>
</html>`;

  fs.writeFileSync(outputHtml, html, 'utf8');
  console.log(outputHtml);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
