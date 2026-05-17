'use client';
import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';

type EvolutionCfg = {
  baseUrl: string;
  instanceName: string;
  apiKeySet: boolean;
  webhookTokenSet?: boolean;
  webhookUrl?: string;
};

type OpenAICfg = {
  model: string;
  apiKeySet: boolean;
};

type BiCfg = {
  host: string;
  port: number;
  database: string;
  user: string;
  passwordSet: boolean;
  table: string;
  colMunicipio: string;
  colCandidato: string;
  colVotos: string;
  colEleitores: string;
  colValidos: string;
  colCargo: string;
  colUf: string;
  colAno: string;
  candidatoNome: string;
  cargo: string;
  uf: string;
  ano: number;
};

type MiltonRow = {
  municipio: string;
  eleitores_22: number;
  validos_22: number;
  votos_22: number;
  percentual_mv: number;
  posicao: number | null;
};

export default function IntegracoesPage() {
  const PAGE_SIZE = 25;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const [evolutionBaseUrl, setEvolutionBaseUrl] = useState('');
  const [evolutionInstanceName, setEvolutionInstanceName] = useState('');
  const [evolutionApiKey, setEvolutionApiKey] = useState('');
  const [evolutionApiKeySet, setEvolutionApiKeySet] = useState(false);
  const [evolutionWebhookToken, setEvolutionWebhookToken] = useState('');
  const [evolutionWebhookTokenSet, setEvolutionWebhookTokenSet] = useState(false);
  const [evolutionWebhookUrl, setEvolutionWebhookUrl] = useState('');
  const [configuringWebhook, setConfiguringWebhook] = useState(false);
  const [webhookOk, setWebhookOk] = useState<string | null>(null);

  const [openAiModel, setOpenAiModel] = useState('');
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const [openAiApiKeySet, setOpenAiApiKeySet] = useState(false);

  const [biHost, setBiHost] = useState('');
  const [biPort, setBiPort] = useState('3306');
  const [biDatabase, setBiDatabase] = useState('');
  const [biUser, setBiUser] = useState('');
  const [biPassword, setBiPassword] = useState('');
  const [biPasswordSet, setBiPasswordSet] = useState(false);

  const [biTable, setBiTable] = useState('');
  const [biColMunicipio, setBiColMunicipio] = useState('');
  const [biColCandidato, setBiColCandidato] = useState('');
  const [biColVotos, setBiColVotos] = useState('');
  const [biColEleitores, setBiColEleitores] = useState('');
  const [biColValidos, setBiColValidos] = useState('');
  const [biColCargo, setBiColCargo] = useState('');
  const [biColUf, setBiColUf] = useState('');
  const [biColAno, setBiColAno] = useState('');
  const [biCandidatoNome, setBiCandidatoNome] = useState('MILTON VIEIRA');
  const [biCargo, setBiCargo] = useState('DEPUTADO FEDERAL');
  const [biUf, setBiUf] = useState('SP');
  const [biAno, setBiAno] = useState('2022');

  const [biTesting, setBiTesting] = useState(false);
  const [biTestOk, setBiTestOk] = useState<string | null>(null);

  const [miltonLoading, setMiltonLoading] = useState(false);
  const [miltonRows, setMiltonRows] = useState<MiltonRow[]>([]);
  const [miltonFiltro, setMiltonFiltro] = useState('');
  const [miltonPage, setMiltonPage] = useState(1);
  const [miltonMeta, setMiltonMeta] = useState<{ total: number; page: number; limit: number; pages: number }>({ total: 0, page: 1, limit: PAGE_SIZE, pages: 1 });
  const [miltonLoaded, setMiltonLoaded] = useState(false);

  const [qrBase64, setQrBase64] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [qrRaw, setQrRaw] = useState('');
  const [connecting, setConnecting] = useState(false);

  const qrSrc = useMemo(() => {
    const v = (qrBase64 || '').trim();
    if (!v) return '';
    if (v.startsWith('data:image/')) return v;
    return `data:image/png;base64,${v}`;
  }, [qrBase64]);

  const load = async () => {
    setLoading(true);
    setErro('');
    try {
      const [ev, oa, bi] = await Promise.all([
        api.get('/integracoes/evolution'),
        api.get('/integracoes/openai'),
        api.get('/integracoes/bi'),
      ]);
      const e: EvolutionCfg = ev.data;
      const o: OpenAICfg = oa.data;
      const b: BiCfg = bi.data;

      setEvolutionBaseUrl(e.baseUrl || '');
      setEvolutionInstanceName(e.instanceName || '');
      setEvolutionApiKey('');
      setEvolutionApiKeySet(!!e.apiKeySet);
      setEvolutionWebhookToken('');
      setEvolutionWebhookTokenSet(!!(e as any).webhookTokenSet);
      setEvolutionWebhookUrl(e.webhookUrl || '');

      setOpenAiModel(o.model || '');
      setOpenAiApiKey('');
      setOpenAiApiKeySet(!!o.apiKeySet);

      setBiHost(b.host || '');
      setBiPort(String(b.port || 3306));
      setBiDatabase(b.database || '');
      setBiUser(b.user || '');
      setBiPassword('');
      setBiPasswordSet(!!b.passwordSet);

      setBiTable(b.table || '');
      setBiColMunicipio(b.colMunicipio || '');
      setBiColCandidato(b.colCandidato || '');
      setBiColVotos(b.colVotos || '');
      setBiColEleitores(b.colEleitores || '');
      setBiColValidos(b.colValidos || '');
      setBiColCargo(b.colCargo || '');
      setBiColUf(b.colUf || '');
      setBiColAno(b.colAno || '');
      setBiCandidatoNome(b.candidatoNome || 'MILTON VIEIRA');
      setBiCargo(b.cargo || 'DEPUTADO FEDERAL');
      setBiUf(b.uf || 'SP');
      setBiAno(String(b.ano || 2022));
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao carregar integrações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const salvar = async () => {
    setSaving(true);
    setErro('');
    try {
      const [ev, oa, bi] = await Promise.all([
        api.put('/integracoes/evolution', {
          baseUrl: evolutionBaseUrl,
          instanceName: evolutionInstanceName,
          apiKey: evolutionApiKey || undefined,
          webhookToken: evolutionWebhookToken || undefined,
          webhookUrl: evolutionWebhookUrl,
        }),
        api.put('/integracoes/openai', {
          model: openAiModel,
          apiKey: openAiApiKey || undefined,
        }),
        api.put('/integracoes/bi', {
          host: biHost,
          port: biPort,
          database: biDatabase,
          user: biUser,
          password: biPassword || undefined,
          table: biTable,
          colMunicipio: biColMunicipio,
          colCandidato: biColCandidato,
          colVotos: biColVotos,
          colEleitores: biColEleitores,
          colValidos: biColValidos,
          colCargo: biColCargo,
          colUf: biColUf,
          colAno: biColAno,
          candidatoNome: biCandidatoNome,
          cargo: biCargo,
          uf: biUf,
          ano: biAno,
        }),
      ]);

      setEvolutionApiKeySet(!!ev.data?.apiKeySet);
      setEvolutionApiKey('');
      setEvolutionWebhookTokenSet(!!ev.data?.webhookTokenSet);
      setEvolutionWebhookToken('');
      setOpenAiApiKeySet(!!oa.data?.apiKeySet);
      setOpenAiApiKey('');
      setBiPasswordSet(!!bi.data?.passwordSet);
      setBiPassword('');
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao salvar integrações');
    } finally {
      setSaving(false);
    }
  };

  const testarBI = async () => {
    setBiTesting(true);
    setBiTestOk(null);
    setErro('');
    try {
      const r = await api.post('/integracoes/bi/testar');
      setBiTestOk(r.data?.version ? `OK (MySQL ${r.data.version})` : 'OK');
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao testar conexão do BI');
      setBiTestOk(null);
    } finally {
      setBiTesting(false);
    }
  };

  const carregarMilton = async (p = miltonPage, filtro = miltonFiltro) => {
    setMiltonLoading(true);
    setErro('');
    try {
      const r = await api.get('/integracoes/bi/milton-2022', { params: { page: p, limit: PAGE_SIZE, nome: filtro || undefined } });
      setMiltonRows(r.data.data || []);
      setMiltonMeta(r.data.meta || { total: 0, page: p, limit: PAGE_SIZE, pages: 1 });
      setMiltonLoaded(true);
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao carregar relatório do BI');
    } finally {
      setMiltonLoading(false);
    }
  };

  useEffect(() => { if (miltonLoaded) { setMiltonPage(1); carregarMilton(1, miltonFiltro); } }, [miltonFiltro]);
  useEffect(() => { if (miltonLoaded) carregarMilton(miltonPage, miltonFiltro); }, [miltonPage]);

  const configurarWebhook = async () => {
    setConfiguringWebhook(true);
    setWebhookOk(null);
    setErro('');
    try {
      await api.post('/integracoes/evolution/configurar-webhook');
      setWebhookOk('Webhook configurado com sucesso na Evolution!');
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao configurar webhook');
    } finally {
      setConfiguringWebhook(false);
    }
  };

  const conectar = async () => {
    setConnecting(true);
    setErro('');
    setQrBase64('');
    setPairingCode('');
    setQrRaw('');
    try {
      const r = await api.post('/integracoes/evolution/conectar');
      const data = r.data || {};
      setPairingCode(data.pairingCode || data.pairing_code || '');
      setQrBase64(data.base64 || data.qrcode?.base64 || '');
      setQrRaw(data.code || '');
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao gerar QR Code');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold text-ink">Integrações</h1>
            <p className="text-[15px] text-ink-muted mt-1">Configuração do WhatsApp (Evolution) e IA (ChatGPT)</p>
          </div>
          <button onClick={salvar} disabled={loading || saving} className="btn-primary">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        {erro && (
          <div className="card border border-red-200 bg-red-50 text-red-700">
            <p className="text-[14px] font-semibold">Erro</p>
            <p className="text-[13px] mt-1">{erro}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <div>
              <h2 className="text-[17px] font-semibold text-ink">Evolution (WhatsApp)</h2>
              <p className="text-[13px] text-ink-muted mt-0.5">Salve a config e gere o QR Code para conectar o número</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Base URL</label>
                <input className="input" placeholder="https://seu-evolution.com" value={evolutionBaseUrl} onChange={e => setEvolutionBaseUrl(e.target.value)} />
              </div>
              <div>
                <label className="label">Instance Name</label>
                <input className="input uppercase" placeholder="minha_instancia" value={evolutionInstanceName} onChange={e => setEvolutionInstanceName(e.target.value)} />
              </div>
              <div>
                <label className="label">API Key {evolutionApiKeySet ? <span className="text-ink-muted">(já configurada)</span> : null}</label>
                <input className="input" type="password" placeholder="cole a API Key (opcional se já estiver salva)" value={evolutionApiKey} onChange={e => setEvolutionApiKey(e.target.value)} />
              </div>
              <div>
                <label className="label">Webhook Token {evolutionWebhookTokenSet ? <span className="text-ink-muted">(já configurado)</span> : null}</label>
                <input className="input" type="password" placeholder="token para validar o webhook (recomendado)" value={evolutionWebhookToken} onChange={e => setEvolutionWebhookToken(e.target.value)} />
              </div>
              <div>
                <label className="label">Webhook URL (nosso servidor)</label>
                <input className="input" placeholder="https://seudominio.com/webhooks/evolution" value={evolutionWebhookUrl} onChange={e => setEvolutionWebhookUrl(e.target.value)} />
                <p className="text-[11px] text-ink-muted mt-1">URL pública que a Evolution usará para enviar mensagens recebidas</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <button onClick={conectar} disabled={loading || connecting} className="btn-primary">
                {connecting ? 'Gerando...' : 'Gerar QR Code'}
              </button>
              <button onClick={configurarWebhook} disabled={loading || configuringWebhook} className="btn-secondary">
                {configuringWebhook ? 'Configurando...' : 'Configurar Webhook'}
              </button>
              <button onClick={load} disabled={loading} className="btn-secondary">Recarregar</button>
            </div>
            {webhookOk && <p className="text-[13px] text-green-600">{webhookOk}</p>}

            {(qrSrc || pairingCode || qrRaw) && (
              <div className="border border-hairline rounded-[14px] p-4 bg-parchment/40 space-y-3">
                {pairingCode && (
                  <div>
                    <p className="text-[12px] text-ink-muted uppercase tracking-widest">Pairing Code</p>
                    <p className="text-[16px] font-semibold text-ink mt-1">{pairingCode}</p>
                  </div>
                )}
                {qrSrc && (
                  <div className="flex items-center justify-center bg-white rounded-[12px] p-4 border border-hairline">
                    <img src={qrSrc} alt="QR Code Evolution" className="w-56 h-56" />
                  </div>
                )}
                {!qrSrc && qrRaw && (
                  <div>
                    <p className="text-[12px] text-ink-muted uppercase tracking-widest">QR (raw)</p>
                    <textarea className="input h-24" readOnly value={qrRaw} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card space-y-4">
            <div>
              <h2 className="text-[17px] font-semibold text-ink">OpenAI (ChatGPT)</h2>
              <p className="text-[13px] text-ink-muted mt-0.5">Chave e modelo para ativar respostas com IA</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Modelo</label>
                <input className="input" placeholder="gpt-4.1-mini" value={openAiModel} onChange={e => setOpenAiModel(e.target.value)} />
              </div>
              <div>
                <label className="label">API Key {openAiApiKeySet ? <span className="text-ink-muted">(já configurada)</span> : null}</label>
                <input className="input" type="password" placeholder="cole a API Key (opcional se já estiver salva)" value={openAiApiKey} onChange={e => setOpenAiApiKey(e.target.value)} />
              </div>
            </div>

            <div className="text-[12px] text-ink-muted">
              {loading ? 'Carregando...' : 'Pronto para integrar o bot com IA na próxima etapa.'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <div>
              <h2 className="text-[17px] font-semibold text-ink">BI (Consulta 2022)</h2>
              <p className="text-[13px] text-ink-muted mt-0.5">Configuração de acesso ao banco do BI (somente leitura)</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label">Host</label>
                <input className="input" placeholder="db-bi.seudominio.com" value={biHost} onChange={e => setBiHost(e.target.value)} />
              </div>
              <div>
                <label className="label">Porta</label>
                <input className="input" placeholder="3306" value={biPort} onChange={e => setBiPort(e.target.value)} />
              </div>
              <div>
                <label className="label">Database</label>
                <input className="input" placeholder="bi" value={biDatabase} onChange={e => setBiDatabase(e.target.value)} />
              </div>
              <div>
                <label className="label">User</label>
                <input className="input" placeholder="readonly" value={biUser} onChange={e => setBiUser(e.target.value)} />
              </div>
              <div>
                <label className="label">Password {biPasswordSet ? <span className="text-ink-muted">(já configurada)</span> : null}</label>
                <input className="input" type="password" placeholder="cole a senha (opcional se já estiver salva)" value={biPassword} onChange={e => setBiPassword(e.target.value)} />
              </div>
            </div>

            <div className="border border-hairline rounded-[14px] p-4 bg-parchment/40 space-y-3">
              <p className="text-[12px] text-ink-muted uppercase tracking-widest">Mapeamento da tabela</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Tabela</label>
                  <input className="input" placeholder="tse_resultados_2022" value={biTable} onChange={e => setBiTable(e.target.value)} />
                </div>
                <div>
                  <label className="label">Coluna Município</label>
                  <input className="input" placeholder="municipio" value={biColMunicipio} onChange={e => setBiColMunicipio(e.target.value)} />
                </div>
                <div>
                  <label className="label">Coluna Candidato</label>
                  <input className="input" placeholder="candidato" value={biColCandidato} onChange={e => setBiColCandidato(e.target.value)} />
                </div>
                <div>
                  <label className="label">Coluna Votos</label>
                  <input className="input" placeholder="votos" value={biColVotos} onChange={e => setBiColVotos(e.target.value)} />
                </div>
                <div>
                  <label className="label">Coluna Eleitores</label>
                  <input className="input" placeholder="eleitores_22" value={biColEleitores} onChange={e => setBiColEleitores(e.target.value)} />
                </div>
                <div>
                  <label className="label">Coluna Válidos</label>
                  <input className="input" placeholder="validos_22" value={biColValidos} onChange={e => setBiColValidos(e.target.value)} />
                </div>
                <div>
                  <label className="label">Coluna Cargo</label>
                  <input className="input" placeholder="cargo" value={biColCargo} onChange={e => setBiColCargo(e.target.value)} />
                </div>
                <div>
                  <label className="label">Coluna UF</label>
                  <input className="input" placeholder="uf" value={biColUf} onChange={e => setBiColUf(e.target.value)} />
                </div>
                <div>
                  <label className="label">Coluna Ano</label>
                  <input className="input" placeholder="ano" value={biColAno} onChange={e => setBiColAno(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="border border-hairline rounded-[14px] p-4 bg-parchment/40 space-y-3">
              <p className="text-[12px] text-ink-muted uppercase tracking-widest">Filtro do relatório</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Candidato</label>
                  <input className="input uppercase" placeholder="MILTON VIEIRA" value={biCandidatoNome} onChange={e => setBiCandidatoNome(e.target.value)} />
                </div>
                <div>
                  <label className="label">Cargo</label>
                  <input className="input uppercase" placeholder="DEPUTADO FEDERAL" value={biCargo} onChange={e => setBiCargo(e.target.value)} />
                </div>
                <div>
                  <label className="label">UF</label>
                  <input className="input uppercase" placeholder="SP" value={biUf} onChange={e => setBiUf(e.target.value)} />
                </div>
                <div>
                  <label className="label">Ano</label>
                  <input className="input" placeholder="2022" value={biAno} onChange={e => setBiAno(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <button onClick={testarBI} disabled={loading || biTesting} className="btn-secondary">
                {biTesting ? 'Testando...' : 'Testar Conexão'}
              </button>
              {biTestOk && <span className="text-[13px] text-ink-muted">{biTestOk}</span>}
            </div>
          </div>

          <div className="card space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-semibold text-ink">Relatório 2022 — Milton Vieira</h2>
                <p className="text-[13px] text-ink-muted mt-0.5">Eleitores, válidos, votos, % e colocação por município</p>
              </div>
              <button onClick={() => carregarMilton(1, miltonFiltro)} disabled={miltonLoading} className="btn-primary">
                {miltonLoading ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>

            <div className="flex gap-3">
              <input
                className="input flex-1"
                placeholder="Filtrar município..."
                value={miltonFiltro}
                onChange={e => setMiltonFiltro(e.target.value)}
              />
            </div>

            <div className="border border-hairline rounded-[14px] overflow-hidden">
              <table className="w-full">
                <thead className="bg-parchment">
                  <tr>
                    <th className="table-th">Município</th>
                    <th className="table-th text-right">Eleitores</th>
                    <th className="table-th text-right">Válidos</th>
                    <th className="table-th text-right">Votos</th>
                    <th className="table-th text-right">%</th>
                    <th className="table-th text-right">Posição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {miltonLoading ? (
                    <tr><td colSpan={6} className="table-td text-center text-ink-muted py-10">Carregando...</td></tr>
                  ) : miltonRows.length === 0 ? (
                    <tr><td colSpan={6} className="table-td text-center text-ink-muted py-10">Sem dados</td></tr>
                  ) : miltonRows.map((r) => (
                    <tr key={r.municipio}>
                      <td className="table-td font-semibold uppercase">{r.municipio}</td>
                      <td className="table-td text-right text-ink-muted">{r.eleitores_22?.toLocaleString('pt-BR') || '0'}</td>
                      <td className="table-td text-right text-ink-muted">{r.validos_22?.toLocaleString('pt-BR') || '0'}</td>
                      <td className="table-td text-right font-semibold text-primary">{r.votos_22?.toLocaleString('pt-BR') || '0'}</td>
                      <td className="table-td text-right text-ink-muted">{(r.percentual_mv ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="table-td text-right text-ink-muted">{r.posicao ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {miltonMeta.pages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-ink-muted">
                  Mostrando {((miltonPage - 1) * miltonMeta.limit) + 1}–{Math.min(miltonPage * miltonMeta.limit, miltonMeta.total)} de {miltonMeta.total.toLocaleString('pt-BR')}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMiltonPage(p => Math.max(1, p - 1))} disabled={miltonPage === 1}
                    className="p-2 rounded-[8px] text-ink-muted hover:bg-parchment disabled:opacity-30 border border-hairline transition-colors">
                    ←
                  </button>
                  <span className="text-[13px] text-ink px-2">Pág {miltonPage} / {miltonMeta.pages}</span>
                  <button onClick={() => setMiltonPage(p => Math.min(miltonMeta.pages, p + 1))} disabled={miltonPage === miltonMeta.pages}
                    className="p-2 rounded-[8px] text-ink-muted hover:bg-parchment disabled:opacity-30 border border-hairline transition-colors">
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
