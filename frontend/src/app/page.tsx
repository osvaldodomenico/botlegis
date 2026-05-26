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
  por_divisao_regional: { divisao_regional: string; total_projecao: number; total_municipios: number }[];
  top10_projecao: { id: string; nome: string; regiao: string; bloco: string; votos_22: number; projecao_votos: number; total_votos: number; tipos: { tipo: string; projecao: number }[] }[];
  top10_por_tipo: Record<string, { id: string; nome: string; regiao: string; bloco: string; votos_22: number; projecao_votos: number; total_votos: number; tipos: { tipo: string; projecao: number }[] }[]>;
}

const CHART_COLORS = ['#0066cc', '#0071e3', '#2997ff', '#5ac8fa', '#34c759', '#ff9f0a', '#ff3b30', '#af52de', '#1d1d1f', '#7a7a7a'];
const TIPO_CARDS = [
  { key: 'EXTERNO', label: 'Externo', color: '#0066cc' },
  { key: 'BASE - INSTITUIÇÃO', label: 'Base Instituição', color: '#059669' },
  { key: 'BASE APOIADORES', label: 'Base Apoiadores', color: '#d97706' },
];

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
            <p className="text-[13px] text-ink-muted mt-1">em algum dos 3 tipos</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 text-ink-muted text-[13px] mb-2">
              <TrendingUp size={15} />
              Projeção Total
      </div>
            <p className="text-[40px] font-semibold text-primary leading-none" style={{ letterSpacing: '-0.5px' }}>
              {data?.total_projecao?.toLocaleString('pt-BR') ?? '—'}
            </p>
            <p className="text-[13px] text-ink-muted mt-1">votos dos cadastros</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 text-ink-muted text-[13px] mb-2">
              <Globe size={15} />
              Divisão Regional
            </div>
            <p className="text-[40px] font-semibold text-ink leading-none" style={{ letterSpacing: '-0.5px' }}>
              {data?.por_divisao_regional?.length ?? '—'}
            </p>
            <p className="text-[13px] text-ink-muted mt-1">divisões com cadastro</p>
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
              ].map(({ key, label, color }) => {
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

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6">
          {/* Bar Chart */}
          <div className="card">
            <h2 className="text-[21px] font-semibold text-ink mb-6" style={{ letterSpacing: '-0.022em' }}>
              Projeção por Divisão Regional
            </h2>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={data?.por_divisao_regional} barSize={32} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="divisao_regional" tick={{ fontSize: 11, fill: '#7a7a7a' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 12, fill: '#7a7a7a' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 11, fontSize: 14 }}
                  cursor={{ fill: '#f5f5f7' }}
                />
                <Bar dataKey="total_projecao" name="Projeção" radius={[6, 6, 0, 0]}>
                  {data?.por_divisao_regional?.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h2 className="text-[21px] font-semibold text-ink mb-4" style={{ letterSpacing: '-0.022em' }}>
            Top 10 por Tipo de Cadastro
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {TIPO_CARDS.map(({ key, label, color }) => {
              const ranking = data?.top10_por_tipo?.[key] || [];
              const totalTop = ranking.reduce((sum, m) => sum + m.projecao_votos, 0);
              return (
                <div key={key} className="card p-0 overflow-hidden h-full flex flex-col">
                  <div className="px-5 py-4 border-b border-hairline" style={{ borderTop: `4px solid ${color}` }}>
                    <p className="text-[12px] font-semibold uppercase tracking-widest" style={{ color }}>{label}</p>
                    <p className="text-[13px] text-ink-muted mt-1">Ranking dos 10 maiores municípios por projeção</p>
                  </div>
                  <div className="px-5 flex-1">
                    {ranking.map((m, i) => (
                      <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-hairline last:border-0">
                        <span className="w-7 h-7 rounded-full bg-parchment flex items-center justify-center text-[12px] font-semibold text-ink-muted flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-ink truncate">{m.nome}</p>
                          {(m.regiao || m.bloco) && (
                            <p className="text-[11px] text-ink-muted truncate">{m.bloco || m.regiao}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[15px] font-semibold" style={{ color }}>{m.projecao_votos.toLocaleString('pt-BR')}</p>
                          <p className="text-[11px] text-ink-muted">proj.</p>
                        </div>
                      </div>
                    ))}
                    {ranking.length === 0 && (
                      <p className="text-[14px] text-ink-muted text-center py-10">Sem projeções cadastradas</p>
                    )}
                  </div>
                  <div className="mt-auto border-t px-5 py-3" style={{ backgroundColor: `${color}10`, borderColor: `${color}35` }}>
                    <div className="flex items-center justify-end gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">Total:</p>
                      <p className="text-[18px] font-semibold leading-none" style={{ color }}>
                        {totalTop.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-[11px] font-semibold text-ink-muted uppercase">votos</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
