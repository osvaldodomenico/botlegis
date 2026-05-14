'use client';
import { useEffect, useState } from 'react';
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

export default function DobradaPage() {
  const [dobradas, setDobradas] = useState<Dobrada[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [projecao, setProjecao] = useState('');

  const load = async (cidade = busca) => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (cidade) params.cidade = cidade;
      const r = await api.get('/dobradas', { params });
      setDobradas(r.data.data);
      setTotal(r.data.meta.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!nome || !cidade) return alert('Preencha Nome e Cidade');
    await api.post('/dobradas', { nome: nome.toUpperCase(), cidade, projecao_votos: projecao ? Number(projecao) : 0 });
    setNome(''); setCidade(''); setProjecao(''); setShowForm(false);
    load();
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Excluir dobrada "${nome}"?`)) return;
    await api.delete(`/dobradas/${id}`);
    load();
  };

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
              onChange={e => { setBusca(e.target.value); load(e.target.value); }}
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-parchment">
              <tr>
                <th className="table-th">Nome</th>
                <th className="table-th">Cidade</th>
                <th className="table-th text-right">Projeção</th>
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
