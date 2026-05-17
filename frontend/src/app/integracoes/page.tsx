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

export default function IntegracoesPage() {
  const [loading, setLoading] = useState(true);
  const [savingEvolution, setSavingEvolution] = useState(false);
  const [savingOpenAI, setSavingOpenAI] = useState(false);
  const [savingBI, setSavingBI] = useState(false);
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

  const [biTesting, setBiTesting] = useState(false);
  const [biTestOk, setBiTestOk] = useState<string | null>(null);

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

    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao carregar integrações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const salvarEvolution = async () => {
    setSavingEvolution(true);
    setErro('');
    try {
      const ev = await api.put('/integracoes/evolution', {
        baseUrl: evolutionBaseUrl,
        instanceName: evolutionInstanceName,
        apiKey: evolutionApiKey || undefined,
        webhookToken: evolutionWebhookToken || undefined,
        webhookUrl: evolutionWebhookUrl,
      });
      setEvolutionApiKeySet(!!ev.data?.apiKeySet);
      setEvolutionApiKey('');
      setEvolutionWebhookTokenSet(!!ev.data?.webhookTokenSet);
      setEvolutionWebhookToken('');
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao salvar Evolution');
    } finally {
      setSavingEvolution(false);
    }
  };

  const salvarOpenAI = async () => {
    setSavingOpenAI(true);
    setErro('');
    try {
      const oa = await api.put('/integracoes/openai', {
        model: openAiModel,
        apiKey: openAiApiKey || undefined,
      });
      setOpenAiApiKeySet(!!oa.data?.apiKeySet);
      setOpenAiApiKey('');
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao salvar OpenAI');
    } finally {
      setSavingOpenAI(false);
    }
  };

  const salvarBI = async () => {
    setSavingBI(true);
    setErro('');
    try {
      const bi = await api.put('/integracoes/bi', {
        host: biHost,
        port: biPort,
        database: biDatabase,
        user: biUser,
        password: biPassword || undefined,
      });
      setBiPasswordSet(!!bi.data?.passwordSet);
      setBiPassword('');
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao salvar BI');
    } finally {
      setSavingBI(false);
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
        <div>
          <h1 className="text-[28px] font-semibold text-ink">Integrações</h1>
          <p className="text-[15px] text-ink-muted mt-1">Configuração do WhatsApp (Evolution) e IA (ChatGPT)</p>
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
              <button onClick={salvarEvolution} disabled={loading || savingEvolution} className="btn-primary">
                {savingEvolution ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={conectar} disabled={loading || connecting} className="btn-secondary">
                {connecting ? 'Gerando...' : 'Gerar QR Code'}
              </button>
              <button onClick={configurarWebhook} disabled={loading || configuringWebhook} className="btn-secondary">
                {configuringWebhook ? 'Configurando...' : 'Configurar Webhook'}
              </button>
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

            <button onClick={salvarOpenAI} disabled={loading || savingOpenAI} className="btn-primary self-start">
              {savingOpenAI ? 'Salvando...' : 'Salvar'}
            </button>
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

            <div className="flex flex-wrap gap-3 items-center">
              <button onClick={salvarBI} disabled={loading || savingBI} className="btn-primary">
                {savingBI ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={testarBI} disabled={loading || biTesting} className="btn-secondary">
                {biTesting ? 'Testando...' : 'Testar Conexão'}
              </button>
              {biTestOk && <span className="text-[13px] text-ink-muted">{biTestOk}</span>}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
