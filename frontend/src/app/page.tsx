'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MapPin, TrendingUp, Globe, Award } from 'lucide-react';

interface DashboardData {
  total_municipios: number;
  total_projecao: number;
  por_tipo: { tipo: string; total_projecao: number; total_registros: number }[];
  por_rm_ra: { rm_ra: string; total_projecao: number; total_municipios: number }[];
  top10_projecao: { id: string; nome: string; regiao: string; bloco: string; votos_22: number; projecao_votos: number; total_votos: number; tipos: { tipo: string; projecao: number }[] }[];
}

const CHART_COLORS = ['#0066cc', '#0071e3', '#2997ff', '#5ac8fa', '#34c759', '#ff9f0a', '#ff3b30', '#af52de', '#1d1d1f', '#7a7a7a'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64 text-ink-muted text-[17px]">Carregando...</div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-[34px] font-semibold text-ink" style={{ letterSpacing: '-0.374px' }}>Dashboard</h1>
          <p className="text-[17px] text-ink-muted mt-1">Visão geral dos cadastros</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-ink-muted text-[13px] mb-2">
              <MapPin size={15} />
              Municípios
            </div>
            <p className="text-[40px] font-semibold text-ink leading-none" style={{ letterSpacing: '-0.5px' }}>
              {data?.total_municipios?.toLocaleString('pt-BR') ?? '—'}
            </p>
            <p className="text-[13px] text-ink-muted mt-1">registros ativos</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 text-ink-muted text-[13px] mb-2">
              <TrendingUp size={15} />
              Projeção Total
            </div>
            <p className="text-[40px] font-semibold text-primary leading-none" style={{ letterSpacing: '-0.5px' }}>
              {data?.total_projecao?.toLocaleString('pt-BR') ?? '—'}
            </p>
            <p className="text-[13px] text-ink-muted mt-1">votos projetados</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 text-ink-muted text-[13px] mb-2">
              <Globe size={15} />
              RM/RA
            </div>
            <p className="text-[40px] font-semibold text-ink leading-none" style={{ letterSpacing: '-0.5px' }}>
              {data?.por_rm_ra?.length ?? '—'}
            </p>
            <p className="text-[13px] text-ink-muted mt-1">RM/RA cobertas</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 text-ink-muted text-[13px] mb-2">
              <Award size={15} />
              Top Município
            </div>
            <p className="text-[17px] font-semibold text-ink leading-snug mt-1">
              {data?.top10_projecao?.[0]?.nome ?? '—'}
            </p>
            <p className="text-[13px] text-ink-muted mt-1">
              {data?.top10_projecao?.[0]?.projecao_votos?.toLocaleString('pt-BR') ?? '—'} votos
            </p>
          </div>
        </div>

        {/* Cards por tipo de base */}
        {data?.por_tipo && data.por_tipo.length > 0 && (
          <div>
            <h2 className="text-[17px] font-semibold text-ink mb-3">Projeção por Base</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: 'EXTERNO', label: 'Base Externo', color: '#0066cc', bg: '#eff6ff' },
                { key: 'BASE - INSTITUIÇÃO', label: 'Base Instituição', color: '#059669', bg: '#ecfdf5' },
                { key: 'BASE APOIADORES', label: 'Base Apoiadores', color: '#d97706', bg: '#fffbeb' },
              ].map(({ key, label, color, bg }) => {
                const t = data.por_tipo.find(x => x.tipo === key);
                return (
                  <div key={key} className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
                    <div className="text-[12px] font-semibold uppercase tracking-widest mb-2" style={{ color }}>
                      {label}
                    </div>
                    <p className="text-[32px] font-semibold leading-none" style={{ color }}>
                      {t?.total_projecao?.toLocaleString('pt-BR') ?? '0'}
                    </p>
                    <p className="text-[13px] text-ink-muted mt-1">
                      votos · {t?.total_registros ?? 0} registro{(t?.total_registros ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Charts + Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="card">
            <h2 className="text-[21px] font-semibold text-ink mb-6" style={{ letterSpacing: '-0.022em' }}>
              Projeção por RM/RA
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.por_rm_ra} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="rm_ra" tick={{ fontSize: 12, fill: '#7a7a7a' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#7a7a7a' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 11, fontSize: 14 }}
                  cursor={{ fill: '#f5f5f7' }}
                />
                <Bar dataKey="total_projecao" name="Projeção" radius={[6, 6, 0, 0]}>
                  {data?.por_rm_ra?.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 10 Table */}
          <div className="card">
            <h2 className="text-[21px] font-semibold text-ink mb-4" style={{ letterSpacing: '-0.022em' }}>
              Top 10 Municípios
            </h2>
            <div className="space-y-2">
              {data?.top10_projecao.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-hairline last:border-0">
                  <span className="w-6 h-6 rounded-full bg-parchment flex items-center justify-center text-[12px] font-semibold text-ink-muted flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-ink truncate">{m.nome}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {m.tipos?.map((t, j) => (
                        <span key={j} className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-parchment text-ink-muted">
                          {t.tipo}: +{t.projecao.toLocaleString('pt-BR')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[15px] font-semibold text-primary">{(m.total_votos ?? m.projecao_votos).toLocaleString('pt-BR')}</p>
                    <p className="text-[11px] text-ink-muted">+{m.projecao_votos.toLocaleString('pt-BR')} proj.</p>
                    {m.votos_22 > 0 && <p className="text-[10px] text-ink-muted">2022: {m.votos_22.toLocaleString('pt-BR')}</p>}
                  </div>
                </div>
              ))}
              {data?.top10_projecao && data.top10_projecao.length > 0 && (
                <div className="flex items-center gap-3 pt-3 mt-1 font-semibold">
                  <span className="w-6 h-6 flex items-center justify-center text-[12px] font-semibold text-ink-muted flex-shrink-0">
                    {/* Empty spacer to align with items */}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-ink">Total do Top 10</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[15px] font-bold text-primary">
                      {data.top10_projecao.reduce((sum, m) => sum + (m.total_votos ?? m.projecao_votos), 0).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      +{data.top10_projecao.reduce((sum, m) => sum + m.projecao_votos, 0).toLocaleString('pt-BR')} proj.
                    </p>
                  </div>
                </div>
              )}
              {(!data?.top10_projecao?.length) && (
                <p className="text-[15px] text-ink-muted text-center py-8">Adicione cadastros para ver o ranking</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
