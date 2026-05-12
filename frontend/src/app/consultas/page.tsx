'use client';
import { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { Search, AlertCircle, Loader2, MessageCircle, X, Send, Bot, User } from 'lucide-react';

type Resultado = {
  tipo: 'municipio' | 'regiao' | 'coordenador' | 'ranking' | null;
  data: any;
  query: string;
};

type ChatMsg = {
  role: 'user' | 'bot';
  text: string;
  loading?: boolean;
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
  'Campinas', 'São Bernardo do Campo', 'Guarulhos',
  'regiao LESTE', 'coordenador EDER', 'bloco CAMPINAS', 'ranking top 10',
];

const BOT_EXEMPLOS = [
  'Quantos votos em Campinas?', 'Quem é a liderança em Guarulhos?',
  'Projeção da região Leste', 'Ranking top 5', 'Municípios sem coordenador',
];

function formatarRespostaBot(tipo: string, data: any, query: string): string {
  if (tipo === 'municipio') {
    const ms = data.municipios;
    if (!ms || ms.length === 0) return `Não encontrei nenhum município para "${query}".`;
    if (ms.length === 1) {
      const m = ms[0];
      let resp = `📍 **${m.nome}** — ${m.regiao || ''}${m.mesorregiao ? ` · ${m.mesorregiao}` : ''}\n\n`;
      resp += `🗳️ Projeção: **${m.projecao_votos?.toLocaleString('pt-BR') ?? 'N/D'}** votos\n`;
      if (m.projecao_base) resp += `📊 Base: ${m.projecao_base?.toLocaleString('pt-BR')}\n`;
      if (m.lideranca) resp += `👤 Liderança: **${m.lideranca}**${m.funcao_cargo ? ` (${m.funcao_cargo})` : ''}\n`;
      if (m.coordenacao) resp += `🤝 Coordenação: ${m.coordenacao}\n`;
      if (m.eleitores_22) resp += `📋 Eleitores 2022: ${m.eleitores_22?.toLocaleString('pt-BR')}\n`;
      if (m.votos_22) resp += `📈 Votos 2022: ${m.votos_22?.toLocaleString('pt-BR')}${m.percentual_mv ? ` (${m.percentual_mv}% MV)` : ''}\n`;
      return resp;
    }
    return `Encontrei **${ms.length} municípios** para "${query}":\n\n` +
      ms.map((m: any) => `• **${m.nome}** — ${m.projecao_votos?.toLocaleString('pt-BR')} votos${m.lideranca ? ` · ${m.lideranca}` : ''}`).join('\n');
  }
  if (tipo === 'regiao') {
    const d = data;
    let resp = `🗺️ **${d.regiao || d.bloco}**\n\n`;
    resp += `🏙️ Municípios: **${d.total_municipios}**\n`;
    resp += `🗳️ Total projeção: **${d.total_projecao?.toLocaleString('pt-BR')}** votos\n`;
    if (d.media_projecao) resp += `📊 Média/município: ${d.media_projecao?.toLocaleString('pt-BR')}\n`;
    if (d.top5?.length) {
      resp += `\n🏆 **Top 5:**\n`;
      d.top5.forEach((m: any, i: number) => {
        resp += `${i + 1}. ${m.nome} — ${m.projecao_votos?.toLocaleString('pt-BR')}${m.lideranca ? ` (${m.lideranca})` : ''}\n`;
      });
    }
    return resp;
  }
  if (tipo === 'coordenador') {
    const d = data;
    let resp = `👤 **${d.coordenador}**\n\n`;
    resp += `🏙️ Municípios: **${d.total_municipios}**\n`;
    resp += `🗳️ Total projeção: **${d.total_projecao?.toLocaleString('pt-BR')}** votos\n`;
    if (d.municipios?.length) {
      resp += `\n📋 **Municípios:**\n`;
      d.municipios.slice(0, 10).forEach((m: any) => {
        resp += `• ${m.nome} — ${m.projecao_votos?.toLocaleString('pt-BR')}${m.lideranca ? ` · ${m.lideranca}` : ''}\n`;
      });
      if (d.municipios.length > 10) resp += `_...e mais ${d.municipios.length - 10}_\n`;
    }
    return resp;
  }
  if (tipo === 'ranking') {
    const rank = data.ranking || [];
    let resp = `🏆 **Ranking — Top ${rank.length}**\n\n`;
    rank.forEach((m: any) => {
      resp += `${m.posicao}. **${m.nome}** — ${m.projecao_votos?.toLocaleString('pt-BR')}${m.lideranca ? ` · ${m.lideranca}` : ''}\n`;
    });
    return resp;
  }
  if (tipo === 'semcoordenador') {
    const ms = data.municipios || [];
    return `⚠️ **${ms.length} municípios sem coordenador**\n\n` +
      ms.slice(0, 15).map((m: any) => `• ${m.nome} — ${m.projecao_votos?.toLocaleString('pt-BR')} votos`).join('\n') +
      (ms.length > 15 ? `\n_...e mais ${ms.length - 15}_` : '');
  }
  return 'Não entendi a pergunta. Tente o nome de um município, "regiao X", "coordenador X" ou "ranking top N".';
}

async function processarPergunta(pergunta: string): Promise<string> {
  const lower = pergunta.toLowerCase().trim();

  if (/sem\s+coordena|sem\s+l[íi]der/.test(lower)) {
    const r = await api.get('/stats/sem-coordenador');
    return formatarRespostaBot('semcoordenador', r.data, pergunta);
  }
  if (/ranking|top\s*\d+|melhores|maiores/.test(lower)) {
    const m = lower.match(/\d+/);
    const r = await api.get(`/ranking?limit=${m ? parseInt(m[0]) : 10}`);
    return formatarRespostaBot('ranking', r.data, pergunta);
  }
  const regiaoMatch = lower.match(/regi[aã]o\s+([\w\s]+?)(?:\?|$)/i);
  if (regiaoMatch) {
    const r = await api.get(`/stats/regiao/${encodeURIComponent(regiaoMatch[1].trim().toUpperCase())}`);
    return formatarRespostaBot('regiao', r.data, pergunta);
  }
  const blocoMatch = lower.match(/bloco\s+([\w\s]+?)(?:\?|$)/i);
  if (blocoMatch) {
    const r = await api.get(`/stats/bloco/${encodeURIComponent(blocoMatch[1].trim().toUpperCase())}`);
    return formatarRespostaBot('regiao', { ...r.data, regiao: `Bloco: ${r.data.bloco}` }, pergunta);
  }
  const coordMatch = lower.match(/coordena(?:dor)?\s+(?:de\s+|da\s+|do\s+)?([\w\sÀ-Ú]+?)(?:\?|$)/i);
  if (coordMatch) {
    const r = await api.get(`/stats/coordenador/${encodeURIComponent(coordMatch[1].trim().toUpperCase())}`);
    return formatarRespostaBot('coordenador', r.data, pergunta);
  }
  const r = await api.get(`/busca?q=${encodeURIComponent(pergunta)}&limit=5`);
  if (r.data.total > 0) return formatarRespostaBot('municipio', r.data, pergunta);
  return `Não encontrei resultados para "${pergunta}".\n\nTente:\n• Nome de município (ex: "Campinas")\n• "regiao LESTE"\n• "coordenador EDER"\n• "ranking top 10"`;
}

function BotMessage({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        if (!line) return <br key={i} />;
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="text-[14px] leading-relaxed">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>)}
          </p>
        );
      })}
    </div>
  );
}

function BotModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'bot', text: 'Olá! Sou o assistente MV 2026. 👋\n\nPergunte sobre municípios, projeções, lideranças, regiões ou rankings.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const enviar = async (texto?: string) => {
    const msg = (texto ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }, { role: 'bot', text: '', loading: true }]);
    setLoading(true);
    try {
      const resposta = await processarPergunta(msg);
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'bot', text: resposta }; return u; });
    } catch (e: any) {
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'bot', text: `Erro: ${e.response?.data?.message || e.message}` }; return u; });
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-md flex flex-col rounded-[22px] overflow-hidden shadow-2xl border border-hairline"
        style={{ height: '72vh', maxHeight: '620px', background: '#ffffff' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ background: '#0066cc' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-white">Assistente MV 2026</p>
              <p className="text-[11px] text-white/70">BI Político · Online</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Quick suggestions */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-hairline shrink-0" style={{ background: '#f5f5f7' }}>
          {BOT_EXEMPLOS.map(ex => (
            <button key={ex} onClick={() => enviar(ex)}
              className="whitespace-nowrap px-3 py-1 text-[12px] bg-white text-ink rounded-pill border border-hairline hover:bg-primary hover:text-white hover:border-primary transition-colors flex-shrink-0">
              {ex}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-primary' : 'bg-parchment border border-hairline'}`}>
                {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-ink-muted" />}
              </div>
              <div className={`max-w-[80%] rounded-[16px] px-4 py-3 ${msg.role === 'user' ? 'bg-primary rounded-tr-[4px]' : 'bg-parchment border border-hairline rounded-tl-[4px]'}`}>
                {msg.loading ? (
                  <div className="flex gap-1 py-1">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2 h-2 rounded-full bg-ink-muted/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                ) : msg.role === 'user' ? (
                  <p className="text-[14px] text-white">{msg.text}</p>
                ) : (
                  <BotMessage text={msg.text} />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-hairline">
          <div className="flex gap-2">
            <input
              className="flex-1 px-4 py-2.5 text-[14px] bg-parchment border border-hairline rounded-pill focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Faça uma pergunta..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
              disabled={loading}
            />
            <button onClick={() => enviar()} disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConsultasPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState('');
  const [botAberto, setBotAberto] = useState(false);

  const buscar = async (q?: string) => {
    const term = (q ?? query).trim();
    if (!term) return;
    setLoading(true); setErro(''); setResultado(null);
    try {
      const lower = term.toLowerCase();
      if (lower.startsWith('regiao ') || lower.startsWith('região ')) {
        const regiao = term.replace(/^regi[aã]o\s+/i, '').toUpperCase();
        const r = await api.get(`/stats/regiao/${encodeURIComponent(regiao)}`);
        setResultado({ tipo: 'regiao', data: r.data, query: term });
      } else if (lower.startsWith('bloco ')) {
        const bloco = term.replace(/^bloco\s+/i, '').toUpperCase();
        const r = await api.get(`/stats/bloco/${encodeURIComponent(bloco)}`);
        setResultado({ tipo: 'regiao', data: { ...r.data, regiao: `Bloco: ${r.data.bloco}` }, query: term });
      } else if (lower.startsWith('coordenador ') || lower.startsWith('liderança ')) {
        const nome = term.replace(/^(coordenador|lideran[çc]a)\s+/i, '').toUpperCase();
        const r = await api.get(`/stats/coordenador/${encodeURIComponent(nome)}`);
        setResultado({ tipo: 'coordenador', data: r.data, query: term });
      } else if (lower.includes('ranking') || lower.includes('top ')) {
        const m = term.match(/\d+/);
        const r = await api.get(`/ranking?limit=${m ? parseInt(m[0]) : 10}`);
        setResultado({ tipo: 'ranking', data: r.data, query: term });
      } else {
        const r = await api.get(`/busca?q=${encodeURIComponent(term)}&limit=10`);
        if (r.data.municipios.length === 0) {
          setErro(`Nenhum resultado para "${term}". Tente o nome exato do município, ou prefixe com "regiao", "bloco" ou "coordenador".`);
        } else {
          setResultado({ tipo: 'municipio', data: r.data, query: term });
        }
      }
    } catch (e: any) {
      setErro(e.response?.data?.message || 'Erro na consulta');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[34px] font-semibold text-ink" style={{ letterSpacing: '-0.374px' }}>Consultas</h1>
            <p className="text-[17px] text-ink-muted mt-1">Pesquise municípios, regiões, lideranças e projeções</p>
          </div>
          <button onClick={() => setBotAberto(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-pill text-[14px] font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <MessageCircle size={16} />
            Simular Bot
          </button>
        </div>

        {/* Search */}
        <div className="card">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input className="input pl-11 text-[17px]" placeholder="Ex: Campinas, regiao LESTE, coordenador EDER..."
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscar()} autoFocus />
            </div>
            <button onClick={() => buscar()} disabled={loading || !query.trim()} className="btn-primary flex-shrink-0">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-[12px] text-ink-muted self-center">Exemplos:</span>
            {EXEMPLOS.map(ex => (
              <button key={ex} onClick={() => { setQuery(ex); buscar(ex); }}
                className="px-3 py-1 text-[13px] bg-parchment text-ink rounded-pill hover:bg-primary hover:text-white transition-colors border border-hairline">
                {ex}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-hairline grid grid-cols-2 gap-2 text-[13px] text-ink-muted">
            <div><span className="font-semibold text-ink">Campinas</span> → dados do município</div>
            <div><span className="font-semibold text-ink">regiao LESTE</span> → stats da região</div>
            <div><span className="font-semibold text-ink">bloco CAMPINAS</span> → stats do bloco</div>
            <div><span className="font-semibold text-ink">coordenador EDER</span> → municípios do coord.</div>
          </div>
        </div>

        {erro && (
          <div className="card border-red-200 bg-red-50 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[15px] text-red-700">{erro}</p>
          </div>
        )}

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
              </div>
            ))}
          </div>
        )}

        {resultado?.tipo === 'regiao' && (
          <div className="space-y-4">
            <h2 className="text-[21px] font-semibold text-ink">{resultado.data.regiao || resultado.data.bloco}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="stat-card"><Label>Municípios</Label><p className="text-[40px] font-semibold text-ink leading-none mt-1">{resultado.data.total_municipios}</p></div>
              <div className="stat-card"><Label>Total Projeção</Label><p className="text-[40px] font-semibold text-primary leading-none mt-1">{resultado.data.total_projecao?.toLocaleString('pt-BR')}</p></div>
              {resultado.data.media_projecao !== undefined && (
                <div className="stat-card"><Label>Média / Município</Label><p className="text-[34px] font-semibold text-ink leading-none mt-1">{resultado.data.media_projecao?.toLocaleString('pt-BR')}</p></div>
              )}
            </div>
            {resultado.data.top5 && (
              <div className="card">
                <h3 className="text-[17px] font-semibold text-ink mb-4">Top 5</h3>
                {resultado.data.top5.map((m: any, i: number) => (
                  <div key={m.id} className="flex items-center gap-3 py-2 border-b border-hairline last:border-0">
                    <span className="w-6 h-6 rounded-full bg-parchment flex items-center justify-center text-[12px] font-semibold text-ink-muted flex-shrink-0">{i + 1}</span>
                    <div className="flex-1"><p className="text-[15px] font-semibold text-ink">{m.nome}</p>{m.lideranca && <p className="text-[12px] text-ink-muted">{m.lideranca}</p>}</div>
                    <span className="text-[15px] font-semibold text-primary">{m.projecao_votos?.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {resultado?.tipo === 'coordenador' && (
          <div className="space-y-4">
            <h2 className="text-[21px] font-semibold text-ink">{resultado.data.coordenador}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="stat-card"><Label>Municípios</Label><p className="text-[40px] font-semibold text-ink leading-none mt-1">{resultado.data.total_municipios}</p></div>
              <div className="stat-card"><Label>Total Projeção</Label><p className="text-[40px] font-semibold text-primary leading-none mt-1">{resultado.data.total_projecao?.toLocaleString('pt-BR')}</p></div>
            </div>
            <div className="card">
              <h3 className="text-[17px] font-semibold text-ink mb-4">Municípios ({resultado.data.municipios.length})</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {resultado.data.municipios.map((m: any) => (
                  <div key={m.id} className="flex items-start justify-between py-2 border-b border-hairline last:border-0">
                    <div><p className="text-[15px] font-semibold text-ink">{m.nome}</p><p className="text-[12px] text-ink-muted">{m.regiao} · {m.lideranca}</p></div>
                    <span className="text-[15px] font-semibold text-primary ml-4">{m.projecao_votos?.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
                  <div className="flex-1"><p className="text-[15px] font-semibold text-ink">{m.nome}</p><p className="text-[12px] text-ink-muted">{m.regiao} · {m.lideranca || m.coordenacao}</p></div>
                  <span className="text-[17px] font-semibold text-primary">{m.projecao_votos?.toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating bot button */}
      {!botAberto && (
        <button onClick={() => setBotAberto(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105 z-40"
          title="Simular Bot">
          <MessageCircle size={24} />
        </button>
      )}

      {botAberto && <BotModal onClose={() => setBotAberto(false)} />}
    </Layout>
  );
}
