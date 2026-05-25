'use client';
import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { Plus, Trash2, Search } from 'lucide-react';
import { MUNICIPIOS_SP } from '@/lib/municipios-sp';

interface Dobrada {
  id: string;
  nome: string;
  cidade: string;
  projecao_votos: number;
}

type SortDir = 'asc' | 'desc';

export default function DobradaPage() {
  const PAGE_SIZE = 25;
  const [dobradas, setDobradas] = useState<Dobrada[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [projecao, setProjecao] = useState('');
  const [sortField, setSortField] = useState<keyof Dobrada>('cidade');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = useCallback(async (p = page, cidade = busca, orderBy = sortField, order = sortDir) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: PAGE_SIZE, orderBy, order };
      if (cidade) params.cidade = cidade;
      const r = await api.get('/dobradas', { params });
      setDobradas(r.data.data);
      setTotal(r.data.meta.total);
      setPages(r.data.meta.pages || 1);
    } finally { setLoading(false); }
  }, [busca, page, sortField, sortDir]);

  useEffect(() => { setPage(1); }, [busca]);
  useEffect(() => { load(page); }, [page, busca, sortField, sortDir, load]);

  const handleSave = async () => {
    if (!nome || !cidade) return alert('Preencha Nome e Cidade');
    try {
      await api.post('/dobradas', { nome: nome.toUpperCase(), cidade, projecao_votos: projecao ? Number(projecao) : 0 });
      setNome(''); setCidade(''); setProjecao(''); setShowForm(false);
      setPage(1);
      load(1);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erro ao salvar dobrada');
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Excluir dobrada "${nome}"?`)) return;
    await api.delete(`/dobradas/${id}`);
    setPage(1);
  };

  const toggleSort = (field: keyof Dobrada) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const SortTh = ({ field, label, className = '' }: { field: keyof Dobrada; label: string; className?: string }) => (
    <th className={`table-th cursor-pointer select-none ${className}`} onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">
        {label}
        {sortField === field
          ? <span className="text-primary text-[11px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
          : <span className="text-[#c7c7cc] text-[11px]">↕</span>}
      </span>
    </th>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-semibold text-ink" style={{ letterSpacing: '-0.374px' }}>Dobradas</h1>
            <p className="text-[17px] text-ink-muted mt-1">
              {loading ? '...' : `${total} registro${total !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary flex-shrink-0">
            <Plus size={16} /> Nova Dobrada
          </button>
        </div>

        {/* Busca */}
        <div className="card">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              className="input pl-9 text-[15px]"
              placeholder="Filtrar por cidade..."
              value={busca}
              onChange={e => { setBusca(e.target.value); }}
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-parchment">
              <tr>
                <SortTh field="nome" label="Nome" />
                <SortTh field="cidade" label="Cidade" />
                <SortTh field="projecao_votos" label="Projeção" className="text-right" />
                <th className="table-th w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading && (
                <tr><td colSpan={4} className="table-td text-center text-ink-muted py-10">Carregando...</td></tr>
              )}
              {!loading && dobradas.length === 0 && (
                <tr><td colSpan={4} className="table-td text-center text-ink-muted py-10">Nenhuma dobrada cadastrada</td></tr>
              )}
              {dobradas.map(d => (
                <tr key={d.id} className="hover:bg-parchment/50 transition-colors">
                  <td className="table-td font-semibold text-ink uppercase">{d.nome}</td>
                  <td className="table-td text-ink-muted">{d.cidade}</td>
                  <td className="table-td text-right font-semibold text-primary">{d.projecao_votos.toLocaleString('pt-BR')}</td>
                  <td className="table-td">
                    <button
                      onClick={() => handleDelete(d.id, d.nome)}
                      className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border border-hairline rounded-[14px] bg-parchment/40">
            <p className="text-[13px] text-ink-muted">
              Mostrando {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} de {total.toLocaleString('pt-BR')}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-[8px] text-ink-muted hover:bg-white disabled:opacity-30 border border-hairline transition-colors">
                ←
              </button>
              <span className="text-[13px] text-ink px-2">Pág {page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-2 rounded-[8px] text-ink-muted hover:bg-white disabled:opacity-30 border border-hairline transition-colors">
                →
              </button>
            </div>
          </div>
        )}

        {/* Modal novo */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md p-6 space-y-4">
              <h2 className="text-[21px] font-semibold text-ink">Nova Dobrada</h2>
              <div>
                <label className="label">Nome</label>
                <input className="input uppercase" placeholder="Nome da dobrada" value={nome} onChange={e => setNome(e.target.value)} />
              </div>
              <div>
                <label className="label">Cidade</label>
                <select className="input" value={cidade} onChange={e => setCidade(e.target.value)}>
                  <option value="">Selecione o município</option>
                  {MUNICIPIOS_SP.map(n => <option key={n} value={n.toUpperCase()}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Projeção de Votos</label>
                <input type="number" className="input" placeholder="0" value={projecao} onChange={e => setProjecao(e.target.value)} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="button" onClick={handleSave} className="btn-primary">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
