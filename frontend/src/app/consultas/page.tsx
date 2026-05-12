'use client';
import { useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { Search, MapPin, Users, TrendingUp, Award, AlertCircle, Loader2 } from 'lucide-react';

type Resultado = {
  tipo: 'municipio' | 'regiao' | 'coordenador' | 'ranking' | null;
  data: any;
  query: string;
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">{children}</span>
);

const Value = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[17px] font-semibold text-ink">{children}</span>
);

const InfoRow = ({ label, value }: { label: string; value: any }) => value != null && value !== '' ? (
  <div className="flex items-center justify-between py-2 border-b border-hairline last:border-0">
    <Label>{label}</Label>
    <Value>{value}</Value>
  </div>
) : null;

const EXEMPLOS = [
  'Campinas',
  'São Bernardo do Campo',
  'Guarulhos',
  'regiao LESTE',
  'coordenador EDER',
  'bloco CAMPINAS',
  'ranking top 10',
];

export default function ConsultasPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState('');

  const buscar = async (q?: string) => {
    const term = (q ?? query).trim();
    if (!term) return;
    setLoading(true);
    setErro('');
    setResultado(null);

    try {
      // Detectar tipo de consulta
      const lower = term.toLowerCase();

      if (lower.startsWith('regiao ') || lower.startsWith('região ')) {
        const regiao = term.replace(/^regi[aã]o\s+/i, '').toUpperCase();
        const r = await api.get(`/stats/regiao/${encodeURIComponent(regiao)}`);
        setResultado({ tipo: 'regiao', data: r.data, query: term });

      } else if (lower.startsWith('bloco ')) {
        const bloco = term.replace(/^bloco\s+/i, '').toUpperCase();
        const r = await api.get(`/stats/bloco/${encodeURIComponent(bloco)}`);
        setResultado({ tipo: 'regiao', data: { ...r.data, regiao: `Bloco: ${r.data.bloco}` }, query: term });

      } else if (lower.startsWith('coordenador ') || lower.startsWith('liderança ') || lower.startsWith('lideranca ')) {
        const nome = term.replace(/^(coordenador|lideran[çc]a)\s+/i, '').toUpperCase();
        const r = await api.get(`/stats/coordenador/${encodeURIComponent(nome)}`);
        setResultado({ tipo: 'coordenador', data: r.data, query: term });

      } else if (lower.includes('ranking') || lower.includes('top ')) {
        const limitMatch = term.match(/\d+/);
        const limit = limitMatch ? parseInt(limitMatch[0]) : 10;
        const r = await api.get(`/ranking?limit=${limit}`);
        setResultado({ tipo: 'ranking', data: r.data, query: term });

      } else {
        // Busca por município (full-text)
        const r = await api.get(`/busca?q=${encodeURIComponent(term)}&limit=10`);
        if (r.data.municipios.length === 0) {
          setErro(`Nenhum resultado para "${term}". Tente o nome exato do município, ou prefixe com "regiao", "bloco" ou "coordenador".`);
        } else {
          setResultado({ tipo: 'municipio', data: r.data, query: term });
        }
      }
    } catch (e: any) {
      setErro(e.response?.data?.message || 'Erro na consulta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-[34px] font-semibold text-ink" style={{ letterSpacing: '-0.374px' }}>Consultas</h1>
          <p className="text-[17px] text-ink-muted mt-1">Pesquise municípios, regiões, lideranças e projeções</p>
        </div>

        {/* Search */}
        <div className="card">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                className="input pl-11 text-[17px]"
                placeholder="Ex: Campinas, regiao LESTE, coordenador EDER..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscar()}
                autoFocus
              />
            </div>
            <button onClick={() => buscar()} disabled={loading || !query.trim()} className="btn-primary flex-shrink-0">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {/* Exemplos */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-[12px] text-ink-muted self-center">Exemplos:</span>
            {EXEMPLOS.map(ex => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); buscar(ex); }}
                className="px-3 py-1 text-[13px] bg-parchment text-ink rounded-pill hover:bg-primary hover:text-white transition-colors border border-hairline"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Guia de sintaxe */}
          <div className="mt-4 pt-4 border-t border-hairline grid grid-cols-2 gap-2 text-[13px] text-ink-muted">
            <div><span className="font-semibold text-ink">Campinas</span> → dados do município</div>
            <div><span className="font-semibold text-ink">regiao LESTE</span> → stats da região</div>
            <div><span className="font-semibold text-ink">bloco CAMPINAS</span> → stats do bloco</div>
            <div><span className="font-semibold text-ink">coordenador EDER</span> → municípios do coord.</div>
            <div><span className="font-semibold text-ink">ranking top 10</span> → ranking geral</div>
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div className="card border-red-200 bg-red-50 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[15px] text-red-700">{erro}</p>
          </div>
        )}

        {/* Resultado: Município */}
        {resultado?.tipo === 'municipio' && (
          <div className="space-y-4">
            <h2 className="text-[21px] font-semibold text-ink">
              {resultado.data.total === 1 ? resultado.data.municipios[0].nome : `${resultado.data.total} resultados para "${resultado.query}"`}
            </h2>
            {resultado.data.municipios.map((m: any) => (
              <div key={m.id} className="card space-y-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-[21px] font-semibold text-ink">{m.nome}</h3>
                    <p className="text-[14px] text-ink-muted">{m.regiao} · {m.rm_ra} · {m.mesorregiao}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[34px] font-semibold text-primary leading-none">{m.projecao_votos?.toLocaleString('pt-BR')}</p>
                    <p className="text-[12px] text-ink-muted">votos projetados</p>
                  </div>
                </div>
                <InfoRow label="Bloco" value={m.bloco} />
                <InfoRow label="Mesorregião" value={m.mesorregiao} />
                <InfoRow label="Microrregião" value={m.microrregiao} />
                <InfoRow label="Coordenação" value={m.coordenacao} />
                {m.lideranca && (
                  <div className="flex items-center justify-between py-2 border-b border-hairline">
                    <Label>Liderança</Label>
                    <div className="text-right">
                      <Value>{m.lideranca}</Value>
                      {m.funcao_cargo && <p className="text-[12px] text-ink-muted">{m.funcao_cargo}</p>}
                    </div>
                  </div>
                )}
                <InfoRow label="Eleitores 2022" value={m.eleitores_22?.toLocaleString('pt-BR')} />
                {m.observacoes && <InfoRow label="Observações" value={m.observacoes} />}
              </div>
            ))}
          </div>
        )}

        {/* Resultado: Região/Bloco */}
        {resultado?.tipo === 'regiao' && (
          <div className="space-y-4">
            <h2 className="text-[21px] font-semibold text-ink">{resultado.data.regiao || resultado.data.bloco}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="stat-card">
                <Label>Municípios</Label>
                <p className="text-[40px] font-semibold text-ink leading-none mt-1">{resultado.data.total_municipios}</p>
              </div>
              <div className="stat-card">
                <Label>Total Projeção</Label>
                <p className="text-[40px] font-semibold text-primary leading-none mt-1">{resultado.data.total_projecao?.toLocaleString('pt-BR')}</p>
              </div>
              {resultado.data.media_projecao !== undefined && (
                <div className="stat-card">
                  <Label>Média / Município</Label>
                  <p className="text-[34px] font-semibold text-ink leading-none mt-1">{resultado.data.media_projecao?.toLocaleString('pt-BR')}</p>
                </div>
              )}
            </div>
            {resultado.data.top5 && (
              <div className="card">
                <h3 className="text-[17px] font-semibold text-ink mb-4">Top 5 nesta região</h3>
                {resultado.data.top5.map((m: any, i: number) => (
                  <div key={m.id} className="flex items-center gap-3 py-2 border-b border-hairline last:border-0">
                    <span className="w-6 h-6 rounded-full bg-parchment flex items-center justify-center text-[12px] font-semibold text-ink-muted flex-shrink-0">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-[15px] font-semibold text-ink">{m.nome}</p>
                      {m.lideranca && <p className="text-[12px] text-ink-muted">{m.lideranca} · {m.coordenacao}</p>}
                    </div>
                    <span className="text-[15px] font-semibold text-primary">{m.projecao_votos?.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            )}
            {resultado.data.municipios && resultado.data.municipios.length > 5 && (
              <div className="card">
                <h3 className="text-[17px] font-semibold text-ink mb-4">Todos os municípios ({resultado.data.municipios.length})</h3>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {resultado.data.municipios.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-hairline/50 last:border-0">
                      <div>
                        <span className="text-[14px] font-semibold text-ink">{m.nome}</span>
                        {m.lideranca && <span className="text-[12px] text-ink-muted ml-2">{m.lideranca}</span>}
                      </div>
                      <span className="text-[14px] font-semibold text-primary">{m.projecao_votos?.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resultado: Coordenador */}
        {resultado?.tipo === 'coordenador' && (
          <div className="space-y-4">
            <h2 className="text-[21px] font-semibold text-ink">{resultado.data.coordenador}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="stat-card">
                <Label>Municípios</Label>
                <p className="text-[40px] font-semibold text-ink leading-none mt-1">{resultado.data.total_municipios}</p>
              </div>
              <div className="stat-card">
                <Label>Total Projeção</Label>
                <p className="text-[40px] font-semibold text-primary leading-none mt-1">{resultado.data.total_projecao?.toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <div className="card">
              <h3 className="text-[17px] font-semibold text-ink mb-4">Municípios ({resultado.data.municipios.length})</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {resultado.data.municipios.map((m: any) => (
                  <div key={m.id} className="flex items-start justify-between py-2 border-b border-hairline last:border-0">
                    <div>
                      <p className="text-[15px] font-semibold text-ink">{m.nome}</p>
                      <p className="text-[12px] text-ink-muted">{m.regiao} · {m.lideranca}{m.funcao_cargo ? ` (${m.funcao_cargo})` : ''}</p>
                    </div>
                    <span className="text-[15px] font-semibold text-primary ml-4">{m.projecao_votos?.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Resultado: Ranking */}
        {resultado?.tipo === 'ranking' && (
          <div className="space-y-4">
            <h2 className="text-[21px] font-semibold text-ink">Ranking — Top {resultado.data.ranking.length}</h2>
            <div className="card p-0 overflow-hidden">
              {resultado.data.ranking.map((m: any) => (
                <div key={m.id} className="flex items-center gap-4 px-6 py-3 border-b border-hairline last:border-0 hover:bg-parchment/40 transition-colors">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-semibold flex-shrink-0"
                    style={{ background: m.posicao <= 3 ? '#0066cc' : '#f5f5f7', color: m.posicao <= 3 ? 'white' : '#7a7a7a' }}>
                    {m.posicao}
                  </span>
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold text-ink">{m.nome}</p>
                    <p className="text-[12px] text-ink-muted">{m.regiao} · {m.lideranca || m.coordenacao}</p>
                  </div>
                  <span className="text-[17px] font-semibold text-primary">{m.projecao_votos?.toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
