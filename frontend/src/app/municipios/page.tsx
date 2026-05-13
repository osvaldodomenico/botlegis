'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { Search, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, Filter, ChevronDown, ExternalLink } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';

interface Municipio {
  id: string; nome: string; uf: string; tipo_cadastro: string; bloco: string; regiao: string;
  rm_ra: string; mesorregiao: string; microrregiao: string; divisao_regional: string;
  projecao_votos: number; coordenacao: string; lideranca: string; funcao_cargo: string;
  projecao_2: number; coord_lideranca_2: string; funcao_cargo_2: string;
  projecao_apoio_iurd: number; projecao_base: number; eleitores_22: number;
  votos_validos_22: number; percentual_mv: number; votos_22: number;
  percentual_perda: number; observacoes: string;
}
interface Meta { total: number; page: number; limit: number; pages: number; }
interface Opcoes { regioes: string[]; blocos: string[]; rm_ras: string[]; mesorregioes: string[]; microrregioes: string[]; }

const EMPTY_FILTERS = { nome: '', regiao: '', bloco: '', rm_ra: '', mesorregiao: '', microrregiao: '', coordenacao: '', projecao_min: '', projecao_max: '' };

export default function MunicipiosPage() {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [opcoes, setOpcoes] = useState<Opcoes>({ regioes: [], blocos: [], rm_ras: [], mesorregioes: [], microrregioes: [] });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Municipio | null>(null);
  const [orderBy, setOrderBy] = useState('nome');
  const [order, setOrder] = useState<'asc'|'desc'>('asc');
  const debounceRef = useRef<any>(null);

  const { register, handleSubmit, reset, setValue } = useForm<Municipio>();

  // Load filter options
  useEffect(() => {
    api.get('/filtros/opcoes').then(r => setOpcoes(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async (f = filters, p = page, ob = orderBy, o = order) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: 20, orderBy: ob, order: o };
      if (f.nome) params.nome = f.nome;
      if (f.regiao) params.regiao = f.regiao;
      if (f.bloco) params.bloco = f.bloco;
      if (f.rm_ra) params.rm_ra = f.rm_ra;
      if (f.mesorregiao) params.mesorregiao = f.mesorregiao;
      if (f.microrregiao) params.microrregiao = f.microrregiao;
      if (f.coordenacao) params.coordenacao = f.coordenacao;
      if (f.projecao_min) params.projecao_min = f.projecao_min;
      if (f.projecao_max) params.projecao_max = f.projecao_max;
      const r = await api.get('/municipios', { params });
      setMunicipios(r.data.data);
      setMeta(r.data.meta);
    } finally { setLoading(false); }
  }, [filters, page, orderBy, order]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key: string, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(next, 1, orderBy, order), 400);
  };

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    load(EMPTY_FILTERS, 1, orderBy, order);
  };

  const activeFilters = Object.entries(filters).filter(([, v]) => v !== '');

  const sortBy = (field: string) => {
    const newOrder = orderBy === field && order === 'asc' ? 'desc' : 'asc';
    setOrderBy(field);
    setOrder(newOrder);
    load(filters, page, field, newOrder);
  };

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <th className="table-th cursor-pointer select-none" onClick={() => sortBy(field)}>
      <span className="flex items-center gap-1">
        {label}
        {orderBy === field && <span className="text-primary">{order === 'asc' ? '↑' : '↓'}</span>}
      </span>
    </th>
  );

  const openEdit = (m: Municipio) => {
    setEditing(m);
    Object.entries(m).forEach(([k, v]) => setValue(k as any, v as any));
    setShowForm(true);
  };

  const openNew = () => { setEditing(null); reset(); setShowForm(true); };

  const onSubmit = async (data: Municipio) => {
    try {
      if (editing) await api.put(`/municipios/${editing.id}`, data);
      else await api.post('/municipios', data);
      setShowForm(false);
      load();
    } catch (e: any) { alert(e.response?.data?.message || 'Erro ao salvar'); }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Excluir "${nome}"?`)) return;
    await api.delete(`/municipios/${id}`);
    load();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-semibold text-ink" style={{ letterSpacing: '-0.374px' }}>Municípios</h1>
            <p className="text-[17px] text-ink-muted mt-1">
              {loading ? '...' : `${meta.total.toLocaleString('pt-BR')} municípios`}
              {activeFilters.length > 0 && ` · ${activeFilters.length} filtro${activeFilters.length > 1 ? 's' : ''} ativo${activeFilters.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={openNew} className="btn-primary flex-shrink-0">
            <Plus size={16} /> Novo
          </button>
        </div>

        {/* Filters card */}
        <div className="card space-y-4">
          {/* Row 1: busca + região + bloco + botão avançado */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                className="input pl-9 text-[15px]"
                placeholder="Buscar município..."
                value={filters.nome}
                onChange={e => setFilter('nome', e.target.value)}
              />
            </div>
            <select className="input w-48 text-[15px]" value={filters.bloco} onChange={e => setFilter('bloco', e.target.value)}>
              <option value="">Bloco</option>
              {opcoes.blocos.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`btn-utility flex items-center gap-1 ${showAdvanced ? 'bg-primary text-white' : ''}`}
            >
              <Filter size={13} /> Filtros avançados <ChevronDown size={13} className={showAdvanced ? 'rotate-180' : ''} />
            </button>
            {activeFilters.length > 0 && (
              <button onClick={clearAll} className="btn-utility bg-red-600 text-white">
                <X size={13} /> Limpar tudo
              </button>
            )}
          </div>

          {/* Row 2: filtros avançados */}
          {showAdvanced && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-3 border-t border-hairline">
              <div>
                <label className="label text-[12px]">RM/RA</label>
                <select className="input text-[14px]" value={filters.rm_ra} onChange={e => setFilter('rm_ra', e.target.value)}>
                  <option value="">Todas</option>
                  {opcoes.rm_ras.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-[12px]">Mesorregião</label>
                <select className="input text-[14px]" value={filters.mesorregiao} onChange={e => setFilter('mesorregiao', e.target.value)}>
                  <option value="">Todas</option>
                  {opcoes.mesorregioes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-[12px]">Microrregião</label>
                <select className="input text-[14px]" value={filters.microrregiao} onChange={e => setFilter('microrregiao', e.target.value)}>
                  <option value="">Todas</option>
                  {opcoes.microrregioes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-[12px]">Coordenador / Liderança</label>
                <input
                  className="input text-[14px]"
                  placeholder="Ex: EDER ANTENISTA"
                  value={filters.coordenacao}
                  onChange={e => setFilter('coordenacao', e.target.value)}
                />
              </div>
              <div>
                <label className="label text-[12px]">Projeção mínima</label>
                <input type="number" className="input text-[14px]" placeholder="0" value={filters.projecao_min} onChange={e => setFilter('projecao_min', e.target.value)} />
              </div>
              <div>
                <label className="label text-[12px]">Projeção máxima</label>
                <input type="number" className="input text-[14px]" placeholder="999999" value={filters.projecao_max} onChange={e => setFilter('projecao_max', e.target.value)} />
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {activeFilters.map(([key, val]) => (
                <span key={key} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-primary text-[13px] rounded-pill border border-blue-200">
                  <span className="text-[11px] text-blue-400 uppercase">{key.replace('_', ' ')}</span>
                  <span className="font-semibold">{val}</span>
                  <button onClick={() => setFilter(key, '')} className="ml-1 hover:text-red-500">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-parchment border-b border-hairline">
                <tr>
                  <th className="table-th">Tipo</th>
                  <SortHeader field="nome" label="Município" />
                  <SortHeader field="regiao" label="Região" />
                  <th className="table-th hidden md:table-cell">Bloco</th>
                  <th className="table-th hidden lg:table-cell">RM/RA</th>
                  <th className="table-th hidden xl:table-cell">Coordenação</th>
                  <th className="table-th hidden xl:table-cell">Liderança</th>
                  <th className="table-th hidden xl:table-cell">Cargo</th>
                  <SortHeader field="projecao_votos" label="Projeção" />
                  <th className="table-th hidden lg:table-cell">Eleitores 22</th>
                  <th className="table-th w-20"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="table-td text-center text-ink-muted py-16">Carregando...</td></tr>
                ) : municipios.length === 0 ? (
                  <tr><td colSpan={11} className="table-td text-center text-ink-muted py-16">Nenhum município encontrado</td></tr>
                ) : municipios.map((m) => (
                  <tr key={m.id} className="border-t border-hairline hover:bg-parchment/40 transition-colors">
                    <td className="table-td text-[12px] font-medium text-ink-muted whitespace-nowrap">{m.tipo_cadastro || '—'}</td>
                    <td className="table-td font-semibold">{m.nome}</td>
                    <td className="table-td text-[14px] text-ink-muted">{m.regiao}</td>
                    <td className="table-td hidden md:table-cell text-[13px] text-ink-muted truncate max-w-[120px]">{m.bloco}</td>
                    <td className="table-td hidden lg:table-cell text-[13px] text-ink-muted">{m.rm_ra}</td>
                    <td className="table-td hidden xl:table-cell text-[13px] text-ink-muted truncate max-w-[150px]">{m.coordenacao}</td>
                    <td className="table-td hidden xl:table-cell text-[13px]">{m.lideranca}</td>
                    <td className="table-td hidden xl:table-cell text-[13px] text-ink-muted">{m.funcao_cargo}</td>
                    <td className="table-td font-semibold text-primary text-right">{m.projecao_votos?.toLocaleString('pt-BR')}</td>
                    <td className="table-td hidden lg:table-cell text-[13px] text-ink-muted text-right">{m.eleitores_22?.toLocaleString('pt-BR')}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(m)} className="p-2 rounded-[8px] text-ink-muted hover:bg-parchment hover:text-ink transition-colors" title="Editar">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(m.id, m.nome)} className="p-2 rounded-[8px] text-ink-muted hover:bg-red-50 hover:text-red-600 transition-colors" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-hairline bg-parchment/40">
              <p className="text-[13px] text-ink-muted">
                Mostrando {((page - 1) * 20) + 1}–{Math.min(page * 20, meta.total)} de {meta.total.toLocaleString('pt-BR')}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-[8px] text-ink-muted hover:bg-white disabled:opacity-30 border border-hairline transition-colors">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-[13px] text-ink px-2">Pág {page} / {meta.pages}</span>
                <button onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page === meta.pages}
                  className="p-2 rounded-[8px] text-ink-muted hover:bg-white disabled:opacity-30 border border-hairline transition-colors">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal cadastro/edição */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-card w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-hairline flex items-center justify-between z-10">
              <h2 className="text-[21px] font-semibold text-ink">{editing ? `Editar: ${editing.nome}` : 'Novo Município'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-ink-muted hover:text-ink rounded-[8px] hover:bg-parchment"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6">

              {/* Seção: Identificação */}
              <div className="mb-6">
                <h3 className="text-[14px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Identificação</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">Tipo de Cadastro</label>
                    <select {...register('tipo_cadastro')} className="input">
                      <option value="">Selecione</option>
                      <option value="EXTERNO">EXTERNO</option>
                      <option value="BASE - INSTITUIÇÃO">BASE - INSTITUIÇÃO</option>
                      <option value="BASE APOIADORES">BASE APOIADORES</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Nome do Município *</label>
                    <input {...register('nome', { required: true })} className="input" placeholder="Ex: São Paulo" />
                  </div>
                  <div>
                    <label className="label">Bloco</label>
                    <input {...register('bloco')} className="input" />
                  </div>
                  <div>
                    <label className="label">Região</label>
                    <select {...register('regiao')} className="input">
                      <option value="">Selecione</option>
                      {opcoes.regioes.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">RM / RA</label>
                    <input {...register('rm_ra')} className="input" />
                  </div>
                  <div>
                    <label className="label">Mesorregião</label>
                    <input {...register('mesorregiao')} className="input" />
                  </div>
                  <div>
                    <label className="label">Microrregião</label>
                    <input {...register('microrregiao')} className="input" />
                  </div>
                  <div>
                    <label className="label">Divisão Regional</label>
                    <input {...register('divisao_regional')} className="input" />
                  </div>
                </div>
              </div>

              {/* Seção: Coordenação */}
              <div className="mb-6">
                <h3 className="text-[14px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Coordenação e Liderança</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Coordenação</label>
                    <input {...register('coordenacao')} className="input" placeholder="Nome do coordenador" />
                  </div>
                  <div>
                    <label className="label">Liderança</label>
                    <input {...register('lideranca')} className="input" placeholder="Nome da liderança" />
                  </div>
                  <div>
                    <label className="label">Função / Cargo</label>
                    <input {...register('funcao_cargo')} className="input" placeholder="Ex: Ex-Prefeito" />
                  </div>
                  <div>
                    <label className="label">Coordenação / Liderança 2</label>
                    <input {...register('coord_lideranca_2')} className="input" />
                  </div>
                  <div>
                    <label className="label">Função / Cargo 2</label>
                    <input {...register('funcao_cargo_2')} className="input" />
                  </div>
                </div>
              </div>

              {/* Seção: Projeções */}
              <div className="mb-6">
                <h3 className="text-[14px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Projeções de Votos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Projeção Principal</label>
                    <input {...register('projecao_votos')} type="number" className="input" placeholder="0" />
                  </div>
                  <div>
                    <label className="label">Projeção 2</label>
                    <input {...register('projecao_2')} type="number" className="input" placeholder="0" />
                  </div>
                  <div>
                    <label className="label">Projeção Base</label>
                    <input {...register('projecao_base')} type="number" className="input" placeholder="0" />
                  </div>
                  <div>
                    <label className="label">Projeção Apoio IURD</label>
                    <input {...register('projecao_apoio_iurd')} type="number" className="input" placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Seção: Dados Eleitorais 2022 */}
              <div className="mb-6">
                <h3 className="text-[14px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Dados Eleitorais 2022</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Eleitores 2022</label>
                    <input {...register('eleitores_22')} type="number" className="input" />
                  </div>
                  <div>
                    <label className="label">Votos Válidos 2022</label>
                    <input {...register('votos_validos_22')} type="number" className="input" />
                  </div>
                  <div>
                    <label className="label">Votos MV 2022</label>
                    <input {...register('votos_22')} type="number" className="input" />
                  </div>
                  <div>
                    <label className="label">% MV</label>
                    <input {...register('percentual_mv')} type="number" step="0.01" className="input" />
                  </div>
                  <div>
                    <label className="label">% Perda</label>
                    <input {...register('percentual_perda')} type="number" step="0.01" className="input" />
                  </div>
                </div>
              </div>

              {/* Seção: Observações */}
              <div className="mb-6">
                <h3 className="text-[14px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Observações</h3>
                <textarea {...register('observacoes')} className="input resize-none" rows={3} placeholder="Notas internas..." />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-hairline">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">{editing ? 'Salvar Alterações' : 'Criar Município'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
