'use client';
import { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { Search, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface Municipio {
  id: string; nome: string; uf: string; bloco: string; regiao: string;
  rm_ra: string; mesorregiao: string; microrregiao: string; projecao_votos: number;
  coordenacao: string; lideranca: string; observacoes: string;
}

interface Meta { total: number; page: number; limit: number; pages: number; }

const REGIOES = ['NOROESTE', 'SUL', 'NORTE', 'CENTRO', 'CENTRO LESTE', 'LESTE', 'OESTE', 'SUDESTE', 'NORDESTE'];

export default function MunicipiosPage() {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regiao, setRegiao] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Municipio | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm<Municipio>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.nome = search;
      if (regiao) params.regiao = regiao;
      const r = await api.get('/municipios', { params });
      setMunicipios(r.data.data);
      setMeta(r.data.meta);
    } finally {
      setLoading(false);
    }
  }, [page, search, regiao]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, regiao]);

  const openEdit = (m: Municipio) => {
    setEditing(m);
    Object.entries(m).forEach(([k, v]) => setValue(k as any, v));
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    reset();
    setShowForm(true);
  };

  const onSubmit = async (data: Municipio) => {
    try {
      if (editing) {
        await api.put(`/municipios/${editing.id}`, data);
      } else {
        await api.post('/municipios', data);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Confirmar exclusão?')) return;
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
            <p className="text-[17px] text-ink-muted mt-1">{meta.total.toLocaleString('pt-BR')} municípios cadastrados</p>
          </div>
          <button onClick={openNew} className="btn-primary flex-shrink-0">
            <Plus size={16} /> Novo
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                className="input pl-10"
                placeholder="Buscar município..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input sm:w-48"
              value={regiao}
              onChange={e => setRegiao(e.target.value)}
            >
              <option value="">Todas as regiões</option>
              {REGIOES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {(search || regiao) && (
              <button onClick={() => { setSearch(''); setRegiao(''); }} className="btn-utility flex-shrink-0">
                <X size={14} /> Limpar
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-parchment">
                <tr>
                  <th className="table-th">Município</th>
                  <th className="table-th hidden md:table-cell">Região</th>
                  <th className="table-th hidden lg:table-cell">Bloco</th>
                  <th className="table-th hidden xl:table-cell">RM/RA</th>
                  <th className="table-th text-right">Projeção</th>
                  <th className="table-th w-20"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="table-td text-center text-ink-muted py-16">Carregando...</td></tr>
                ) : municipios.length === 0 ? (
                  <tr><td colSpan={6} className="table-td text-center text-ink-muted py-16">Nenhum município encontrado</td></tr>
                ) : municipios.map((m, i) => (
                  <tr key={m.id} className={`border-t border-hairline hover:bg-parchment/50 transition-colors ${i % 2 === 0 ? '' : 'bg-pearl/30'}`}>
                    <td className="table-td font-semibold">{m.nome}</td>
                    <td className="table-td hidden md:table-cell text-ink-muted text-[14px]">{m.regiao}</td>
                    <td className="table-td hidden lg:table-cell text-ink-muted text-[14px]">{m.bloco}</td>
                    <td className="table-td hidden xl:table-cell text-ink-muted text-[14px]">{m.rm_ra}</td>
                    <td className="table-td text-right font-semibold text-primary">{m.projecao_votos?.toLocaleString('pt-BR')}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(m)} className="p-2 rounded-[8px] text-ink-muted hover:bg-parchment hover:text-ink transition-colors">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="p-2 rounded-[8px] text-ink-muted hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-hairline">
              <p className="text-[14px] text-ink-muted">
                Página {meta.page} de {meta.pages} · {meta.total} municípios
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-[8px] text-ink-muted hover:bg-parchment disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                  disabled={page === meta.pages}
                  className="p-2 rounded-[8px] text-ink-muted hover:bg-parchment disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-hairline flex items-center justify-between">
              <h2 className="text-[21px] font-semibold text-ink">
                {editing ? 'Editar Município' : 'Novo Município'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-ink-muted hover:text-ink rounded-[8px] hover:bg-parchment">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Nome do Município *</label>
                  <input {...register('nome', { required: true })} className="input" />
                </div>
                <div>
                  <label className="label">Bloco</label>
                  <input {...register('bloco')} className="input" />
                </div>
                <div>
                  <label className="label">Região</label>
                  <select {...register('regiao')} className="input">
                    <option value="">Selecione</option>
                    {REGIOES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">RM/RA</label>
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
                  <label className="label">Projeção de Votos</label>
                  <input {...register('projecao_votos')} type="number" className="input" />
                </div>
                <div>
                  <label className="label">Coordenação</label>
                  <input {...register('coordenacao')} className="input" />
                </div>
                <div>
                  <label className="label">Liderança</label>
                  <input {...register('lideranca')} className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Observações</label>
                  <textarea {...register('observacoes')} className="input resize-none" rows={3} />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
