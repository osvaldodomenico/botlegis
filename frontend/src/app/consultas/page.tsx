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

// ─── Narrativa natural ────────────────────────────────────────────────────────

function gerarNarrativa(m: any): string {
  const partes: string[] = [];

  // Abertura
  let abertura = `Na cidade de **${m.nome}**`;
  if (m.mesorregiao) abertura += `, localizada na mesorregião **${m.mesorregiao}**`;
  else if (m.regiao) abertura += `, região **${m.regiao}**`;
  partes.push(abertura);

  // Tipo + liderança + função
  if (m.lideranca || m.tipo_cadastro) {
    let frase = '';
    if (m.tipo_cadastro) {
      const tipo = m.tipo_cadastro === 'EXTERNO' ? 'base externa'
        : m.tipo_cadastro === 'BASE - INSTITUIÇÃO' ? 'base institucional'
        : 'base apoiadores';
      frase = `da **${tipo}**`;
    }
    if (m.lideranca) {
      frase += frase ? `, temos como liderança **${m.lideranca}**` : `temos como liderança **${m.lideranca}**`;
      if (m.funcao) frase += `, exercendo a função de **${m.funcao}**`;
    } else if (m.funcao) {
      frase += frase ? `, função de **${m.funcao}**` : `função de **${m.funcao}**`;
    }
    if (frase) partes.push(frase);
  }

  // Coordenação
  if (m.coordenacao) {
    let coord = `O coordenador responsável é **${m.coordenacao}**`;
    if (m.funcao_cargo) coord += `, função de **${m.funcao_cargo}**`;
    partes.push(coord);
  }
  if (m.coord_lideranca_2) {
    let coord2 = `Segundo coordenador: **${m.coord_lideranca_2}**`;
    if (m.funcao_cargo_2) coord2 += `, função de **${m.funcao_cargo_2}**`;
    partes.push(coord2);
  }

  // Bloco
  if (m.bloco) partes.push(`pertencente ao bloco **${m.bloco}**`);

  // Projeção
  if (m.projecao_votos != null) {
    partes.push(`com uma projeção de **${m.projecao_votos.toLocaleString('pt-BR')} votos**`);
  }

  // Dados eleitorais 2022 (TSE)
  if (m.eleitores_22) {
    let dados22 = `Em 2022, o município tinha **${m.eleitores_22.toLocaleString('pt-BR')} eleitores**`;
    if (m.votos_validos_22) dados22 += `, com **${m.votos_validos_22.toLocaleString('pt-BR')} votos válidos**`;
    partes.push(dados22);
  }
  if (m.votos_22 != null && m.votos_22 > 0) {
    const candidato = m.candidato_nome ? `**${m.candidato_nome}**` : 'o candidato';
    const cargo = m.candidato_cargo ? ` para ${m.candidato_cargo}` : '';
    let tse = `${candidato}${cargo} obteve **${m.votos_22.toLocaleString('pt-BR')} votos**`;
    if (m.percentual_mv != null) tse += `, representando **${m.percentual_mv}%** dos votos válidos`;
    partes.push(tse);
  }

  return partes.join('. ') + '.';
}

// ─── BotMessage ──────────────────────────────────────────────────────────────

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

// ─── NarrativaModal ──────────────────────────────────────────────────────────

function NarrativaModal({
  municipios,
  query,
  onClose,
  onNovaBusca,
}: {
  municipios: any[];
  query: string;
  onClose: () => void;
  onNovaBusca: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white shadow-2xl flex flex-col w-full max-w-lg"
        style={{ borderRadius: 22, maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-hairline flex-shrink-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#0066cc' }}
          >
            <MessageCircle size={18} color="white" />
          </div>
          <div className="flex-1">
            <p className="text-[17px] font-semibold" style={{ color: '#1d1d1f' }}>Resultado da Consulta</p>
            <p className="text-[12px]" style={{ color: '#7a7a7a' }}>
              {municipios.length === 1
                ? '1 município encontrado'
                : `${municipios.length} municípios encontrados`}{' '}
              para &ldquo;{query}&rdquo;
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
          >
            <X size={18} color="#1d1d1f" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {municipios.map((m: any, idx: number) => (
            <div key={m.id ?? idx}>
              {/* Nome */}
              <p className="text-[21px] font-semibold mb-2" style={{ color: '#1d1d1f' }}>
                {m.nome}
              </p>
              {/* Narrativa */}
              <div
                className="rounded-[14px] px-4 py-3"
                style={{ background: '#f5f5f7' }}
              >
                <BotMessage text={gerarNarrativa(m)} />
              </div>
              {/* Separador entre múltiplos */}
              {idx < municipios.length - 1 && (
                <div className="mt-5 border-b border-hairline" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-hairline flex-shrink-0">
          <button
            onClick={onNovaBusca}
            className="flex-1 py-2 rounded-[9999px] border text-[15px] font-semibold transition-colors hover:bg-gray-50"
            style={{ borderColor: '#0066cc', color: '#0066cc' }}
          >
            Nova Busca
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-[9999px] text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#0066cc' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── formatarRespostaBot ──────────────────────────────────────────────────────

function formatarRespostaBot(tipo: string, data: any, query: string): string {
  if (tipo === 'municipio') {
    const ms = data.municipios;
    if (!ms || ms.length === 0) return `Não encontrei nenhum município para "${query}".`;
    if (ms.length === 1) {
      const m = ms[0];
      let resp = `📍 **${m.nome}**`;
      if (m.regiao) resp += ` (${m.regiao})`;
      resp += '\n';
      if (m.lideranca) resp += `\n👤 Liderança: **${m.lideranca}**`;
      if (m.funcao) resp += ` — ${m.funcao}`;
      if (m.coordenacao) resp += `\n🗂 Coordenador: **${m.coordenacao}**`;
      if (m.bloco) resp += `\n📦 Bloco: **${m.bloco}**`;
      if (m.projecao_votos != null) resp += `\n🗳 Projeção: **${m.projecao_votos.toLocaleString('pt-BR')} votos**`;
      if (m.tipo_cadastro) resp += `\n🏷 Tipo: ${m.tipo_cadastro}`;
      return resp;
    }
    return `Encontrei **${ms.length} municípios** para "${query}":\n\n` +
      ms.slice(0, 15).map((m: any) => `• ${m.nome} — ${m.projecao_votos?.toLocaleString('pt-BR')} votos`).join('\n') +
      (ms.length > 15 ? `\n_...e mais ${ms.length - 15}_` : '');
  }
  if (tipo === 'regiao') {
    const d = data;
    let resp = `📊 **${d.regiao || d.bloco}**\n`;
    resp += `\n🏙 Municípios: **${d.total_municipios}**`;
    resp += `\n🗳 Total projeção: **${d.total_projecao?.toLocaleString('pt-BR')} votos**`;
    if (d.media_projecao !== undefined) resp += `\n📈 Média/município: **${d.media_projecao?.toLocaleString('pt-BR')}**`;
    if (d.top5?.length) {
      resp += '\n\n🏆 Top 5:\n' + d.top5.map((m: any, i: number) => `${i + 1}. ${m.nome} — ${m.projecao_votos?.toLocaleString('pt-BR')}`).join('\n');
    }
    return resp;
  }
  if (tipo === 'coordenador') {
    const d = data;
    let resp = `👤 **${d.coordenador}**\n`;
    resp += `\n🏙 Municípios: **${d.total_municipios}**`;
    resp += `\n🗳 Total projeção: **${d.total_projecao?.toLocaleString('pt-BR')} votos**`;
    if (d.municipios?.length) {
      resp += '\n\n📍 Municípios:\n' + d.municipios.slice(0, 10).map((m: any) => `• ${m.nome} — ${m.projecao_votos?.toLocaleString('pt-BR')}`).join('\n');
      if (d.municipios.length > 10) resp += `\n_...e mais ${d.municipios.length - 10}_`;
    }
    return resp;
  }
  if (tipo === 'ranking') {
    const lista = data.data || data.ranking || [];
    return `🏆 **Ranking Top ${lista.length}**\n\n` +
      lista.map((m: any) => `${m.posicao}. **${m.nome}** — ${m.projecao_votos?.toLocaleString('pt-BR')} votos`).join('\n');
  }
  if (tipo === 'semcoordenador') {
    const ms = data.municipios || data;
    return `⚠️ **${ms.length} municípios sem coordenador:**\n\n` +
      ms.slice(0, 15).map((m: any) => `• ${m.nome} — ${m.projecao_votos?.toLocaleString('pt-BR') || '—'} votos`).join('\n') +
      (ms.length > 15 ? `\n_...e mais ${ms.length - 15}_` : '');
  }
  return 'Não entendi a pergunta. Tente o nome de um município, "regiao X", "coordenador X" ou "ranking top N".';
}

// ─── processarPergunta ────────────────────────────────────────────────────────

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
  return `Não encontrei resultados para "${pergunta}".\n\nTente:\n• Nome de município\n• "regiao LESTE"\n• "coordenador EDER"\n• "ranking top 10"`;
}

// ─── BotModal ─────────────────────────────────────────────────────────────────

function BotModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'bot', text: 'Olá! Sou o assistente MV 2026. 👋\n\nPergunte sobre municípios, projeções, lideranças, regiões ou rankings.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    setMessages(prev => [...prev, { role: 'bot', text: '', loading: true }]);
    try {
      const resposta = await processarPergunta(text);
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { role: 'bot', text: resposta } : m));
    } catch {
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { role: 'bot', text: 'Erro ao consultar os dados. Tente novamente.' } : m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 p-0">
      <div className="bg-white rounded-t-[22px] sm:rounded-[22px] shadow-2xl flex flex-col w-full sm:w-[400px] sm:max-w-full"
        style={{ height: '70vh', maxHeight: 600 }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-hairline flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Bot size={18} color="white" />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-ink">Assistente MV 2026</p>
            <p className="text-[12px] text-ink-muted">Consulta política inteligente</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-parchment transition-colors">
            <X size={18} color="#1d1d1f" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === 'bot' ? 'bg-primary' : 'bg-parchment'}`}>
                {msg.role === 'bot' ? <Bot size={14} color="white" /> : <User size={14} color="#1d1d1f" />}
              </div>
              <div className={`max-w-[80%] rounded-[14px] px-3 py-2 ${msg.role === 'bot' ? 'bg-parchment' : 'bg-primary text-white'}`}>
                {msg.loading
                  ? <Loader2 size={16} className="animate-spin text-ink-muted" />
                  : msg.role === 'bot'
                    ? <BotMessage text={msg.text} />
                    : <p className="text-[14px]">{msg.text}</p>
                }
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Exemplos rápidos (só quando 1 msg) */}
        {messages.length === 1 && (
          <div className="px-5 pb-2 flex gap-2 flex-wrap">
            {BOT_EXEMPLOS.slice(0, 3).map((ex) => (
              <button key={ex} onClick={() => { setInput(ex); }}
                className="text-[12px] px-3 py-1 rounded-pill border border-primary text-primary hover:bg-primary/5 transition-colors">
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-3 border-t border-hairline flex gap-2 flex-shrink-0">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte algo..."
            className="flex-1 bg-parchment rounded-pill px-4 py-2 text-[14px] text-ink outline-none placeholder:text-ink-muted"
          />
          <button onClick={handleSend} disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity">
            <Send size={15} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ConsultasPage ────────────────────────────────────────────────────────────

export default function ConsultasPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState('');
  const [botAberto, setBotAberto] = useState(false);
  const [modalMunicipios, setModalMunicipios] = useState<any[] | null>(null);
  const [modalQuery, setModalQuery] = useState('');

  const buscar = async (q?: string) => {
    const term = (q ?? query).trim();
    if (!term) return;
    setLoading(true); setErro(''); setResultado(null); setModalMunicipios(null);
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
        // Busca por município → abre NarrativaModal
        const r = await api.get(`/busca?q=${encodeURIComponent(term)}&limit=10`);
        if (r.data.total > 0) {
          setModalMunicipios(r.data.municipios);
          setModalQuery(term);
        } else {
          setErro(`Nenhum resultado encontrado para "${term}".`);
        }
      }
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao buscar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-[28px] font-semibold text-ink">Consultas</h1>
          <p className="text-[15px] text-ink-muted mt-1">Busque municípios, regiões, coordenadores ou rankings</p>
        </div>

        {/* Search bar */}
        <div className="card p-4">
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-3 bg-parchment rounded-[14px] px-4 py-3">
              <Search size={18} className="text-ink-muted flex-shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscar()}
                placeholder="Campinas · regiao LESTE · coordenador EDER · ranking top 10"
                className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
              />
              {query && (
                <button onClick={() => { setQuery(''); setResultado(null); setErro(''); setModalMunicipios(null); }}
                  className="text-ink-muted hover:text-ink transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
            <button onClick={() => buscar()} disabled={loading || !query.trim()}
              className="btn-primary flex items-center gap-2 disabled:opacity-40">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Buscar
            </button>
          </div>

          {/* Exemplos */}
          <div className="mt-3 flex flex-wrap gap-2">
            {EXEMPLOS.map(ex => (
              <button key={ex} onClick={() => { setQuery(ex); buscar(ex); }}
                className="text-[12px] px-3 py-1 rounded-pill bg-parchment text-ink-muted hover:text-primary hover:bg-primary/5 border border-hairline transition-colors">
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div className="flex items-center gap-3 p-4 rounded-[14px] bg-red-50 border border-red-100">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-[14px] text-red-700">{erro}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {/* Resultado regiao */}
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
                    <span className="w-6 h-6 rounded-full bg-parchment flex items-center justify-center text-[12px] font-semibold text-ink-muted">{i + 1}</span>
                    <div className="flex-1"><p className="text-[15px] font-semibold text-ink">{m.nome}</p>{m.lideranca && <p className="text-[12px] text-ink-muted">{m.lideranca}</p>}</div>
                    <span className="text-[15px] font-semibold text-primary">{m.projecao_votos?.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resultado coordenador */}
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

        {/* Resultado ranking */}
        {resultado?.tipo === 'ranking' && (
          <div className="space-y-4">
            <h2 className="text-[21px] font-semibold text-ink">Ranking — Top {(resultado.data.data || resultado.data.ranking || []).length}</h2>
            <div className="card p-0 overflow-hidden">
              {(resultado.data.data || resultado.data.ranking || []).map((m: any) => (
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

      {/* NarrativaModal — abre para buscas de município */}
      {modalMunicipios && (
        <NarrativaModal
          municipios={modalMunicipios}
          query={modalQuery}
          onClose={() => setModalMunicipios(null)}
          onNovaBusca={() => { setModalMunicipios(null); setQuery(''); setResultado(null); setErro(''); }}
        />
      )}

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
