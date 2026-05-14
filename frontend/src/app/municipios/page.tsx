'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { Search, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, Filter, ChevronDown, ExternalLink } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { MUNICIPIOS_SP } from '@/lib/municipios-sp';

const RM_RA_OPCOES = ['ARAÇATUBA','BAIXADA SANTISTA','BARRETOS','BAURU','CAMPINAS','CENTRAL','FRANCA','ITAPEVA','MARÍLIA','PRESIDENTE PRUDENTE','REGISTRO','RIBEIRÃO PRETO','SÃO JOSÉ DO RIO PRETO','SÃO PAULO','SOROCABA','VALE E LITORAL'];
const MESORREGIAO_OPCOES = ['ARAÇATUBA','ARARAQUARA','ASSIS','BAURU','CAMPINAS','ITAPETININGA','LITORAL SUL','MACRO METROPOLITANA','MARILIA','METROPOLITANA SP','PIRACICABA','PRESIDENTE PRUDENTE','RIBEIRÃO PRETO','SÃO JOSÉ DO RIO PRETO','VALE DO PARAIBA'];
const MICRORREGIAO_OPCOES = ['ADAMANTINA','AMPARO','ANDRADINA','ARAÇATUBA','ARARAQUARA','ASSIS','AURIFLAMA','AVARÉ','BANANAL','BARRETOS','BATATAIS','BAURU','BIRIGUI','BOTUCATU','BRAGANÇA PAULISTA','CAMPINAS','CAMPOS DO JORDÃO','CAPÃO BONITO','CARAGUATATUBA','CATANDUVA','DRACENA','FERNANDÓPOLIS','FRANCA','FRANCO DA ROCHA','GUARATINGUETA','GUARULHOS','ITANHAÉM','ITAPECERICA DA SERRA','ITAPETININGA','ITAPEVA','ITUVERAVA','JABOTICABAL','JALES','JAÚ','JUNDIAI','LIMEIRA','LINS','MARÍLIA','MOGI DAS CRUZES','MOGI MIRIM','NHANDEARA','NOVO HORIZONTE','OSASCO','OURINHOS','PARAIBUNA/PARAITINGA','PIEDADE','PIRACICABA','PIRASSUNUNGA','PRESIDENTE PRUDENTE','REGISTRO','RIBEIRÃO PRETO','RIO CLARO','SANTOS','SÃO CARLOS','SÃO JOÃO DA BOA VISTA','SÃO JOAQUIM DA BARRA','SÃO JOSÉ DO RIO PRETO','SÃO JOSÉ DOS CAMPOS','SÃO PAULO','SOROCABA','TATUÍ','TUPÃ','VOTUPORANGA'];
const DIVISAO_REGIONAL_OPCOES = ['ALTO TIETE','BRAGANTINA','LITORAL NORTE','SAO JOSE DOS CAMPOS','SERRA DA MANTIQUEIRA','TAUBATE','VALE DA FÉ','VALE HISTORICO'];
import Link from 'next/link';

interface Municipio {
  id: string; nome: string; uf: string; tipo_cadastro: string; funcao: string; distrito: string; bloco: string; regiao: string;
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

  const { register, handleSubmit, reset, setValue, watch } = useForm<Municipio>();
  const tipoCadastro = watch('tipo_cadastro');
  const nomeWatch = watch('nome');
  useEffect(() => {
    if (!nomeWatch || !showForm) return;
    api.get('/territorios/por-municipio', { params: { nome: nomeWatch } })
      .then(r => {
        if (r.data.length === 1) {
          const t = r.data[0];
          if (t.rm_ra) setValue('rm_ra', t.rm_ra);
          if (t.mesorregiao) setValue('mesorregiao', t.mesorregiao);
          if (t.microrregiao) setValue('microrregiao', t.microrregiao);
          if (t.divisao_regional) setValue('divisao_regional', t.divisao_regional);
        }
      }).catch(() => {});
  }, [nomeWatch, showForm]);
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
                  <th className="table-th hidden md:table-cell">Bloco</th>
                  <th className="table-th hidden lg:table-cell">Função</th>
                  <th className="table-th hidden lg:table-cell">Coordenador / Liderança</th>
                  <SortHeader field="projecao_votos" label="Projeção" />
                  <th className="table-th w-20"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="table-td text-center text-ink-muted py-16">Carregando...</td></tr>
                ) : municipios.length === 0 ? (
                  <tr><td colSpan={7} className="table-td text-center text-ink-muted py-16">Nenhum município encontrado</td></tr>
                ) : municipios.map((m) => (
                  <tr key={m.id} className="border-t border-hairline hover:bg-parchment/40 transition-colors">
                    <td className="table-td">
                      {m.tipo_cadastro ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                          m.tipo_cadastro === 'EXTERNO' ? 'bg-blue-100 text-blue-700' :
                          m.tipo_cadastro === 'BASE - INSTITUIÇÃO' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>{m.tipo_cadastro}</span>
                      ) : <span className="text-ink-muted text-[12px]">—</span>}
                    </td>
                    <td className="table-td font-semibold uppercase">{m.nome}</td>
                    <td className="table-td hidden md:table-cell text-[13px] text-ink-muted uppercase">{m.bloco || '—'}</td>
                    <td className="table-td hidden lg:table-cell text-[13px] text-ink-muted uppercase">{(m as any).funcao || '—'}</td>
                    <td className="table-td hidden lg:table-cell text-[13px] text-ink-muted truncate max-w-[160px] uppercase">
                      {m.tipo_cadastro === 'BASE - INSTITUIÇÃO' ? (m.coordenacao || '—') : (m.lideranca || '—')}
                    </td>
                    <td className="table-td font-semibold text-primary text-right">{m.projecao_votos?.toLocaleString('pt-BR') || '—'}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">

            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-6 py-5 border-b border-hairline flex items-center justify-between z-10 rounded-t-[20px]">
              <div>
                <h2 className="text-[21px] font-semibold text-ink tracking-tight">
                  {editing ? 'Editar Cadastro' : 'Novo Cadastro'}
                </h2>
                {editing && <p className="text-[13px] text-ink-muted mt-0.5">{editing.nome}</p>}
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-ink-muted hover:text-ink rounded-full hover:bg-parchment transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">

              {/* Tipo de Cadastro — segmented control */}
              <div>
                <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-widest mb-3">Tipo de Cadastro</p>
                <input type="hidden" {...register('tipo_cadastro')} />
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'EXTERNO', label: 'Externo' },
                    { value: 'BASE - INSTITUIÇÃO', label: 'Base Instituição' },
                    { value: 'BASE APOIADORES', label: 'Base Apoiadores' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setValue('tipo_cadastro', value, { shouldDirty: true })}
                      className={`px-3 py-3 rounded-[12px] text-[13px] font-semibold border-2 transition-all text-center leading-snug
                        ${tipoCadastro === value
                          ? value === 'EXTERNO'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : value === 'BASE - INSTITUIÇÃO'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-[#e5e5ea] bg-white text-ink-muted hover:border-[#c7c7cc] hover:text-ink'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt quando nenhum tipo selecionado */}
              {!tipoCadastro && (
                <div className="py-10 text-center text-ink-muted text-[15px] border-2 border-dashed border-[#e5e5ea] rounded-[14px]">
                  Selecione o tipo de cadastro acima para continuar
                </div>
              )}

              {/* Identificação — sempre visível após tipo escolhido */}
              {tipoCadastro && (
                <div className="bg-parchment rounded-[14px] p-5 space-y-4">
                  <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-widest">Identificação</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="label">Município *</label>
                      <select {...register('nome', { required: true })} className="input bg-white">
                        <option value="">Selecione o município ({MUNICIPIOS_SP.length})</option>
                        {MUNICIPIOS_SP.map(nome => <option key={nome} value={nome}>{nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">RM / RA</label>
                      <select {...register('rm_ra')} className="input bg-white">
                        <option value="">Selecione</option>
                        {RM_RA_OPCOES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Mesorregião</label>
                      <select {...register('mesorregiao')} className="input bg-white">
                        <option value="">Selecione</option>
                        {MESORREGIAO_OPCOES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Microrregião</label>
                      <select {...register('microrregiao')} className="input bg-white">
                        <option value="">Selecione</option>
                        {MICRORREGIAO_OPCOES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Divisão Regional</label>
                      <select {...register('divisao_regional')} className="input bg-white">
                        <option value="">Selecione</option>
                        {DIVISAO_REGIONAL_OPCOES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* EXTERNO */}
              {tipoCadastro === 'EXTERNO' && (
                <div className="border-l-4 border-blue-500 pl-5 space-y-4">
                  <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest">Dados Externos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="label">Coordenador(a)</label>
                      <input {...register('coordenacao')} className="input uppercase" placeholder="Nome do(a) coordenador(a)" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Nome da Liderança</label>
                      <input {...register('lideranca')} className="input uppercase" placeholder="Nome da liderança" />
                    </div>
                    <div>
                      <label className="label">Função</label>
                      <select {...register('funcao')} className="input">
                        <option value="">Selecione</option>
                        <option value="Ex-Prefeito">Ex-Prefeito</option>
                        <option value="Liderança">Liderança</option>
                        <option value="Pastor">Pastor</option>
                        <option value="Prefeito">Prefeito</option>
                        <option value="Secretário">Secretário</option>
                        <option value="Vereador">Vereador</option>
                        <option value="Vice">Vice</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Projeção de Votos</label>
                      <input {...register('projecao_votos')} type="number" className="input" placeholder="0" />
                    </div>
                  </div>
                </div>
              )}

              {/* BASE - INSTITUIÇÃO */}
              {tipoCadastro === 'BASE - INSTITUIÇÃO' && (
                <div className="border-l-4 border-emerald-500 pl-5 space-y-4">
                  <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest">Dados Instituição</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="label">Coordenador</label>
                      <input {...register('coordenacao')} className="input uppercase" placeholder="Nome do coordenador" />
                    </div>
                    <div>
                      <label className="label">Bloco</label>
                      <select {...register('bloco')} className="input">
                        <option value="">Selecione</option>
                        <option value="Jundiaí">Jundiaí</option>
                        <option value="São José dos Campos">São José dos Campos</option>
                        <option value="Zona Sul">Zona Sul</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Cidade</label>
                      <select {...register('distrito')} className="input">
                        <option value="">Selecione o município</option>
                        {MUNICIPIOS_SP.map(nome => <option key={nome} value={nome}>{nome}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* BASE APOIADORES */}
              {tipoCadastro === 'BASE APOIADORES' && (
                <div className="border-l-4 border-orange-500 pl-5 space-y-4">
                  <p className="text-[11px] font-semibold text-orange-600 uppercase tracking-widest">Dados Apoiadores</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Bloco</label>
                      <select {...register('bloco')} className="input">
                        <option value="">Selecione</option>
                        <option value="Jundiaí">Jundiaí</option>
                        <option value="São José dos Campos">São José dos Campos</option>
                        <option value="Zona Sul">Zona Sul</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Distrito</label>
                      <input {...register('distrito')} className="input" placeholder="Ex: Centro" />
                    </div>
                    <div>
                      <label className="label">Função</label>
                      <select {...register('funcao')} className="input">
                        <option value="">Selecione</option>
                        <option value="Ex-Prefeito">Ex-Prefeito</option>
                        <option value="Liderança">Liderança</option>
                        <option value="Pastor">Pastor</option>
                        <option value="Prefeito">Prefeito</option>
                        <option value="Secretário">Secretário</option>
                        <option value="Vereador">Vereador</option>
                        <option value="Vice">Vice</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Nome</label>
                      <input {...register('lideranca')} className="input uppercase" placeholder="Nome do apoiador" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Projeção de Votos</label>
                      <input {...register('projecao_votos')} type="number" className="input" placeholder="0" />
                    </div>
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 justify-end pt-2 border-t border-hairline">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={!tipoCadastro}>
                  {editing ? 'Salvar Alterações' : 'Criar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
