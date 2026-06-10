'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LabelList,
} from 'recharts';
import {
  Activity, TrendingUp, Vote, Map, Users, UserCheck, AlertTriangle, Target,
  FileSpreadsheet, FileText, ShieldAlert, Lightbulb, ThumbsUp,
} from 'lucide-react';
import { fmt, downloadRaioX } from '../_shared/exportUtils';

const COR = { verde: '#34c759', amarelo: '#ff9f0a', vermelho: '#ff3b30', primary: '#0066cc' };
const MIX_CORES: Record<string, string> = { 'EXTERNO': '#5ac8fa', 'BASE - INSTITUIÇÃO': '#0066cc', 'BASE APOIADORES': '#34c759' };
const pct = (x: number | null | undefined) => x == null ? '—' : `${(x * 100).toFixed(1).replace('.', ',')}%`;
const clean = (s: string) => s.replace(/\*/g, '');

export default function RaioXPage() {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/relatorios/raio-x').then(r => setD(r.data)).catch(() => setD(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="flex items-center justify-center h-64 text-ink-muted text-[17px]">Gerando DNA da Campanha...</div></Layout>;
  if (!d) return <Layout><div className="card text-center py-12 text-ink-muted">Não foi possível gerar o DNA da Campanha.</div></Layout>;

  const k = d.kpis;
  const corSaude = (COR as any)[d.saude.nivel] || COR.primary;
  const labelTerr: Record<string, string> = Object.fromEntries((d.territorio || []).map((t: any) => [t.key, t.divisao]));

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[34px] font-semibold text-ink" style={{ letterSpacing: '-0.374px' }}>DNA da Campanha</h1>
            <p className="text-[17px] text-ink-muted mt-1">Cenário de projeção com o trabalho atual · Milton Vieira 2026</p>
            <p className="text-[12px] text-ink-muted mt-1">Relatório gerado em: {d.gerado_em}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => downloadRaioX('xlsx')} className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px] font-medium bg-[#1d7a44] text-white hover:opacity-90"><FileSpreadsheet size={16} /> Excel</button>
            <button onClick={() => downloadRaioX('pdf')} className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px] font-medium bg-[#c0392b] text-white hover:opacity-90"><FileText size={16} /> PDF</button>
          </div>
        </div>

        {/* Saúde da Campanha */}
        <div className="card">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
                <svg width="96" height="96" className="-rotate-90">
                  <circle cx="48" cy="48" r="42" fill="none" stroke="#ececec" strokeWidth="10" />
                  <circle cx="48" cy="48" r="42" fill="none" stroke={corSaude} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(d.saude.score / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`} />
                </svg>
                <div className="absolute text-center">
                  <div className="text-[26px] font-semibold leading-none" style={{ color: corSaude }}>{d.saude.score}</div>
                  <div className="text-[10px] text-ink-muted">/100</div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-ink-muted text-[13px]"><Activity size={15} /> Índice de Saúde</div>
                <p className="text-[22px] font-semibold capitalize" style={{ color: corSaude }}>
                  {d.saude.nivel === 'verde' ? 'Saudável' : d.saude.nivel === 'amarelo' ? 'Atenção' : 'Crítico'}
                </p>
              </div>
            </div>
            <div className="flex-1 min-w-[280px] grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {d.saude.componentes.map((c: any) => (
                <div key={c.nome}>
                  <div className="flex justify-between text-[12px] text-ink-muted mb-1">
                    <span>{c.nome} <span className="text-[10px] opacity-70">· peso {c.peso}</span></span>
                    <span className="font-medium text-ink">{c.valor}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#ececec] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${c.valor}%`, background: COR.primary }} /></div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-ink-muted mt-4 leading-snug">
            <strong>Como é calculado:</strong> média ponderada dos 5 fatores (pesos somam 100) → cada fator (0–100%) × seu peso. Faixas: <span style={{ color: '#34c759' }}>≥70 saudável</span> · <span style={{ color: '#ff9f0a' }}>50–69 atenção</span> · <span style={{ color: '#ff3b30' }}>&lt;50 crítico</span>.
            Diversificação = 1 − concentração das 10 maiores cidades · Mix = 1 − % da base Externo · Crescimento = projeção vs 2022 (teto em +40%).
          </p>
        </div>

        {/* KPIs — 2022 e projeção SEPARADOS */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <Kpi icon={TrendingUp} label="Projeção 2026 (cenário atual)" value={fmt(k.projecao_total)} color={COR.primary}
            badge={`${k.variacao_vs_2022 >= 0 ? '+' : ''}${pct(k.variacao_vs_2022)} vs 2022`} />
          <Kpi icon={Vote} label="Votos 2022 (referência)" value={fmt(k.votos_2022)} hint="Base histórica — não somada" />
          <Kpi icon={Map} label="Cobertura de Municípios" value={`${k.municipios_cadastro}/${k.total_sp}`} hint={pct(k.cobertura_pct)} />
          <Kpi icon={AlertTriangle} label="Municípios em Zona Branca" value={fmt(k.zonas_brancas)} color={COR.vermelho} hint="sem cadastro" />
          <Kpi icon={UserCheck} label="Municípios com liderança" value={fmt(k.municipios_com_lideranca)} />
          <Kpi icon={Users} label="Lideranças e Coordenadores" value={`${fmt(k.lideres)} · ${fmt(k.coordenadores)}`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funil */}
          <div className="card">
            <h2 className="text-[17px] font-semibold text-ink mb-4">Funil de Cobertura Territorial</h2>
            <div className="space-y-3">
              {d.funil.map((f: any, i: number) => {
                const base = d.funil[0].valor || 1;
                const w = Math.max(6, (f.valor / base) * 100);
                return (
                  <div key={f.etapa}>
                    <div className="flex justify-between text-[13px] mb-1"><span className="text-ink">{f.etapa}</span><span className="font-semibold text-ink">{fmt(f.valor)}</span></div>
                    <div className="h-7 rounded-lg bg-[#f0f0f0] overflow-hidden">
                      <div className="h-full rounded-lg flex items-center" style={{ width: `${w}%`, background: `${COR.primary}${['', 'cc', '99', '66'][i] || '66'}` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mix por base */}
          <div className="card">
            <h2 className="text-[17px] font-semibold text-ink mb-4">Mix por Tipo de Base</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={d.mix} dataKey="projecao" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {d.mix.map((m: any) => <Cell key={m.tipo} fill={MIX_CORES[m.tipo] || COR.primary} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v as number)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1 min-w-[160px]">
                {d.mix.map((m: any) => (
                  <div key={m.tipo} className="flex items-center justify-between text-[14px]">
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: MIX_CORES[m.tipo] || COR.primary }} />{m.label}</span>
                    <span className="font-semibold text-ink">{fmt(m.projecao)} <span className="text-ink-muted font-normal">({pct(m.pct)})</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Território */}
        <div className="card">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="text-[17px] font-semibold text-ink">PROJEÇÕES</h2>
            <div className="flex items-center gap-4 text-[12px] text-ink-muted">
              {([['EXTERNO', 'Externo'], ['BASE - INSTITUIÇÃO', 'Base Instituição'], ['BASE APOIADORES', 'Base Apoiadores']] as const).map(([key, lbl]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: MIX_CORES[key] }} />{lbl}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(220, d.territorio.length * 28)}>
            <BarChart data={d.territorio} layout="vertical" margin={{ left: 10, right: 56 }}>
              <XAxis type="number" tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11, fill: '#86868b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="key" tickFormatter={(v) => labelTerr[v] ?? v} tick={{ fontSize: 11, fill: '#1d1d1f' }} axisLine={false} tickLine={false} width={200} />
              <Tooltip formatter={(v: any) => fmt(v as number)} labelFormatter={(v: any) => labelTerr[v] ?? v} />
              <Bar dataKey="projecao" name="Projeção" radius={[0, 6, 6, 0]}>
                {d.territorio.map((e: any, i: number) => <Cell key={i} fill={MIX_CORES[e.tipo] || COR.primary} />)}
                <LabelList dataKey="projecao" position="right" formatter={(v: any) => fmt(v as number)} style={{ fontSize: 11, fill: '#1d1d1f', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Concentração / Risco */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <RiscoCard label="Concentração Top 10 cidades" value={pct(d.concentracao.pareto_top10)} alerta={d.concentracao.pareto_top10 > 0.6} />
          <RiscoCard label="Concentração Top 20 cidades" value={pct(d.concentracao.pareto_top20)} alerta={d.concentracao.pareto_top20 > 0.8} />
          <RiscoCard label="Dependência maior coord." value={pct(d.concentracao.dep_maior_coordenador)} alerta={d.concentracao.dep_maior_coordenador > 0.25} />
        </div>

        <div className="grid grid-cols-1 gap-6">

          {/* Coordenadores */}
          <div className="card">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="text-[17px] font-semibold text-ink">Projeção por Coordenador</h2>
              <div className="flex items-center gap-4 text-[12px] text-ink-muted">
                {([['EXTERNO', 'Externo'], ['BASE - INSTITUIÇÃO', 'Base Instituição'], ['BASE APOIADORES', 'Base Apoiadores']] as const).map(([key, lbl]) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: MIX_CORES[key] }} />{lbl}
                  </span>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(220, d.coordenadores.length * 26)}>
              <BarChart data={d.coordenadores} layout="vertical" margin={{ left: 10, right: 56 }}>
                <XAxis type="number" tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11, fill: '#86868b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: '#1d1d1f' }} axisLine={false} tickLine={false} width={130} />
                <Tooltip formatter={(v: any) => fmt(v as number)} />
                <Bar dataKey="projecao" name="Projeção" radius={[0, 6, 6, 0]}>
                  {d.coordenadores.map((e: any, i: number) => <Cell key={i} fill={MIX_CORES[e.tipo] || COR.primary} />)}
                  <LabelList dataKey="projecao" position="right" formatter={(v: any) => fmt(v as number)} style={{ fontSize: 11, fill: '#1d1d1f', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SWOT */}
        <div>
          <h2 className="text-[21px] font-semibold text-ink mb-4" style={{ letterSpacing: '-0.022em' }}>Análise SWOT</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SwotCard titulo="Forças" icon={ThumbsUp} cor="#34c759" itens={d.swot.forcas} />
            <SwotCard titulo="Fraquezas" icon={ShieldAlert} cor="#ff3b30" itens={d.swot.fraquezas} />
            <SwotCard titulo="Oportunidades" icon={Lightbulb} cor="#0066cc" itens={d.swot.oportunidades} />
            <SwotCard titulo="Ameaças" icon={AlertTriangle} cor="#ff9f0a" itens={d.swot.ameacas} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Kpi({ icon: Icon, label, value, color, hint, badge }: { icon: any; label: string; value: string; color?: string; hint?: string; badge?: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 text-ink-muted text-[12px] mb-2"><Icon size={14} />{label}</div>
      <p className="text-[26px] font-semibold leading-none" style={{ letterSpacing: '-0.5px', color: color || '#1d1d1f' }}>{value}</p>
      {badge && <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#eef5ff', color: '#0066cc' }}>{badge}</span>}
      {hint && <p className="text-[11px] text-ink-muted mt-1.5">{hint}</p>}
    </div>
  );
}

function RiscoCard({ label, value, alerta }: { label: string; value: string; alerta: boolean }) {
  return (
    <div className="stat-card" style={alerta ? { borderColor: '#ffd9d6' } : undefined}>
      <div className="flex items-center gap-1.5 text-ink-muted text-[12px] mb-2">{alerta && <AlertTriangle size={13} className="text-[#ff3b30]" />}{label}</div>
      <p className="text-[24px] font-semibold leading-none" style={{ color: alerta ? '#ff3b30' : '#1d1d1f' }}>{value}</p>
    </div>
  );
}

function SwotCard({ titulo, icon: Icon, cor, itens }: { titulo: string; icon: any; cor: string; itens: string[] }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${cor}` }}>
      <div className="flex items-center gap-2 mb-3"><Icon size={18} style={{ color: cor }} /><h3 className="text-[16px] font-semibold text-ink">{titulo}</h3></div>
      <ul className="space-y-2">
        {itens.map((it, i) => (
          <li key={i} className="text-[13px] text-ink-muted leading-snug flex gap-2">
            <span style={{ color: cor }}>•</span><span>{clean(it)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
