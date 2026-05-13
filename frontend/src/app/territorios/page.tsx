'use client';
import { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { MUNICIPIOS_SP } from '@/lib/municipios-sp';

const RM_RA_OPCOES = ['ARAÇATUBA','BAIXADA SANTISTA','BARRETOS','BAURU','CAMPINAS','CENTRAL','FRANCA','ITAPEVA','MARÍLIA','PRESIDENTE PRUDENTE','REGISTRO','RIBEIRÃO PRETO','SÃO JOSÉ DO RIO PRETO','SÃO PAULO','SOROCABA','VALE E LITORAL'];
const MESORREGIAO_OPCOES = ['ARAÇATUBA','ARARAQUARA','ASSIS','BAURU','CAMPINAS','ITAPETININGA','LITORAL SUL','MACRO METROPOLITANA','MARILIA','METROPOLITANA SP','PIRACICABA','PRESIDENTE PRUDENTE','RIBEIRÃO PRETO','SÃO JOSÉ DO RIO PRETO','VALE DO PARAIBA'];
const MICRORREGIAO_OPCOES = ['ADAMANTINA','AMPARO','ANDRADINA','ARAÇATUBA','ARARAQUARA','ASSIS','AURIFLAMA','AVARÉ','BANANAL','BARRETOS','BATATAIS','BAURU','BIRIGUI','BOTUCATU','BRAGANÇA PAULISTA','CAMPINAS','CAMPOS DO JORDÃO','CAPÃO BONITO','CARAGUATATUBA','CATANDUVA','DRACENA','FERNANDÓPOLIS','FRANCA','FRANCO DA ROCHA','GUARATINGUETA','GUARULHOS','ITANHAÉM','ITAPECERICA DA SERRA','ITAPETININGA','ITAPEVA','ITUVERAVA','JABOTICABAL','JALES','JAÚ','JUNDIAI','LIMEIRA','LINS','MARÍLIA','MOGI DAS CRUZES','MOGI MIRIM','NHANDEARA','NOVO HORIZONTE','OSASCO','OURINHOS','PARAIBUNA/PARAITINGA','PIEDADE','PIRACICABA','PIRASSUNUNGA','PRESIDENTE PRUDENTE','REGISTRO','RIBEIRÃO PRETO','RIO CLARO','SANTOS','SÃO CARLOS','SÃO JOÃO DA BOA VISTA','SÃO JOAQUIM DA BARRA','SÃO JOSÉ DO RIO PRETO','SÃO JOSÉ DOS CAMPOS','SÃO PAULO','SOROCABA','TATUÍ','TUPÃ','VOTUPORANGA'];
const DIVISAO_REGIONAL_OPCOES = ['ALTO TIETE','BRAGANTINA','LITORAL NORTE','SAO JOSE DOS CAMPOS','SERRA DA MANTIQUEIRA','TAUBATE','VALE DA FÉ','VALE HISTORICO'];

interface Territorio {
  id: string;
  nome: string;
  rm_ra: string;
  mesorregiao: string;
  microrregiao: string;
  divisao_regional: string;
}

export default function TerritoriosPage() {
  const [territorios, setTerritorios] = useState<Territorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Territorio | null>(null);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset } = useForm<Territorio>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/territorios', { params: { nome: search || undefined, limit: 200 } });
      setTerritorios(r.data.data);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); reset({ nome: '', rm_ra: '', mesorregiao: '', microrregiao: '', divisao_regional: '' }); setShowForm(true); };
  const openEdit = (t: Territorio) => { setEditing(t); reset(t); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const onSubmit = async (data: Territorio) => {
    if (editing) await api.put(`/territorios/${editing.id}`, data);
    else await api.post('/territorios', data);
    closeForm();
    load();
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Remover território de "${nome}"?`)) return;
    await api.delete(`/territorios/${id}`);
    load();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[34px] font-semibold text-ink" style={{ letterSpacing: '-0.374px' }}>Territórios</h1>
            <p className="text-[17px] text-ink-muted mt-1">{territorios.length} configurações</p>
          </div>
          <button onClick={openNew} className="btn-primary">
            <Plus size={18} /> Novo
          </button>
        </div>

        {/* Search */}
        <div className="card p-4">
          <input
            className="input"
            placeholder="Buscar município..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-parchment">
              <tr>
                <th className="table-th">Município</th>
                <th className="table-th hidden md:table-cell">RM / RA</th>
                <th className="table-th hidden lg:table-cell">Mesorregião</th>
                <th className="table-th hidden lg:table-cell">Microrregião</th>
                <th className="table-th hidden xl:table-cell">Divisão Regional</th>
                <th className="table-th text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-td text-center text-ink-muted py-16">Carregando...</td></tr>
              ) : territorios.length === 0 ? (
                <tr><td colSpan={6} className="table-td text-center text-ink-muted py-16">Nenhum território cadastrado</td></tr>
              ) : territorios.map(t => (
                <tr key={t.id} className="border-t border-hairline hover:bg-parchment/40 transition-colors">
                  <td className="table-td font-semibold uppercase">{t.nome}</td>
                  <td className="table-td hidden md:table-cell text-[13px] text-ink-muted uppercase">{t.rm_ra || '—'}</td>
                  <td className="table-td hidden lg:table-cell text-[13px] text-ink-muted uppercase">{t.mesorregiao || '—'}</td>
                  <td className="table-td hidden lg:table-cell text-[13px] text-ink-muted uppercase">{t.microrregiao || '—'}</td>
                  <td className="table-td hidden xl:table-cell text-[13px] text-ink-muted uppercase">{t.divisao_regional || '—'}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(t)} className="p-2 rounded-[8px] text-ink-muted hover:bg-parchment hover:text-ink transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(t.id, t.nome)} className="p-2 rounded-[8px] text-ink-muted hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-hairline">
              <h2 className="text-[21px] font-semibold text-ink">{editing ? 'Editar Território' : 'Novo Território'}</h2>
              <button onClick={closeForm} className="p-2 rounded-full hover:bg-parchment text-ink-muted"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="label">Município *</label>
                <select {...register('nome', { required: true })} className="input bg-white">
                  <option value="">Selecione o município ({MUNICIPIOS_SP.length})</option>
                  {MUNICIPIOS_SP.map(nome => <option key={nome} value={nome}>{nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
