'use client';
import { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { Send, Bot, User, RefreshCw, Mic } from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  text: string;
  ts: Date;
  isAudio?: boolean;
}

export default function SimularPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: 'Olá! Sou o Legis BOT. Pergunte sobre eleições, municípios ou como posso ajudar sua campanha. 🏛️',
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [showAudioInput, setShowAudioInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('5511999999999');
  const [name, setName] = useState('Simulação');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (overrideText?: string, overrideAudioUrl?: string) => {
    const text = overrideText ?? input.trim();
    const aUrl = overrideAudioUrl ?? (showAudioInput ? audioUrl.trim() : '');

    if ((!text && !aUrl) || loading) return;
    setInput('');
    setAudioUrl('');
    setShowAudioInput(false);

    const displayText = text || `🎤 Áudio enviado`;
    setMessages(prev => [...prev, { role: 'user', text: displayText, ts: new Date(), isAudio: !text && !!aUrl }]);
    setLoading(true);

    try {
      const payload: Record<string, string> = { phone, name };
      if (text) payload.message = text;
      if (aUrl) payload.audioUrl = aUrl;

      const { data } = await api.post('/webhooks/simulate', payload);

      const botText = data.response || '…';
      const transcribed = data.transcribed ? `\n\n_Transcrição: "${data.transcribed}"_` : '';
      setMessages(prev => [
        ...prev,
        { role: 'bot', text: botText + transcribed, ts: new Date() },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'bot', text: '⚠️ Erro ao obter resposta. Verifique se o backend está rodando.', ts: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([
      {
        role: 'bot',
        text: 'Olá! Sou o Legis BOT. Pergunte sobre eleições, municípios ou como posso ajudar sua campanha. 🏛️',
        ts: new Date(),
      },
    ]);
  };

  const fmt = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-ink">Simular Bot</h1>
            <p className="text-[13px] text-ink-muted mt-0.5">
              Teste as respostas do Legis BOT sem enviar mensagem real.
            </p>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-ink-muted border border-hairline rounded-[8px] hover:bg-parchment transition-colors"
          >
            <RefreshCw size={13} />
            Reiniciar
          </button>
        </div>

        {/* Config strip */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[11px] text-ink-muted uppercase tracking-wide mb-1 block">
              Telefone simulado
            </label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-hairline rounded-[9px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="5511999999999"
            />
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-ink-muted uppercase tracking-wide mb-1 block">
              Nome simulado
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-hairline rounded-[9px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Nome"
            />
          </div>
        </div>

        {/* Chat window */}
        <div className="bg-white border border-hairline rounded-[18px] overflow-hidden flex flex-col shadow-sm">
          {/* WhatsApp-style header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-tile text-white">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-tight">Legis BOT</p>
              <p className="text-[11px] text-white/60">Simulação local · sem envio real</p>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            style={{ minHeight: 360, maxHeight: 480 }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-tile flex items-center justify-center flex-shrink-0">
                    <Bot size={14} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3.5 py-2 rounded-[14px] text-[13px] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-primary text-white rounded-br-[4px]'
                      : 'bg-[#f0f0f0] text-ink rounded-bl-[4px]'
                  }`}
                >
                  {m.isAudio && (
                    <span className="flex items-center gap-1 mb-1 opacity-80 text-[11px]">
                      <Mic size={11} /> áudio
                    </span>
                  )}
                  {m.text}
                  <span
                    className={`block text-[10px] mt-1 text-right ${
                      m.role === 'user' ? 'text-white/60' : 'text-ink-muted'
                    }`}
                  >
                    {fmt(m.ts)}
                  </span>
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-primary" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-end gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-tile flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-[#f0f0f0] px-4 py-2.5 rounded-[14px] rounded-bl-[4px]">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Audio URL input (expandable) */}
          {showAudioInput && (
            <div className="px-4 py-2 border-t border-hairline bg-parchment/30 flex gap-2 items-center">
              <Mic size={14} className="text-ink-muted flex-shrink-0" />
              <input
                value={audioUrl}
                onChange={e => setAudioUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="URL do áudio (.ogg, .mp4, .m4a)..."
                className="flex-1 px-3 py-1.5 text-[13px] border border-hairline rounded-[8px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
              <button
                onClick={() => send()}
                disabled={!audioUrl.trim() || loading}
                className="px-3 py-1.5 text-[12px] bg-primary text-white rounded-[8px] disabled:opacity-40 transition-opacity"
              >
                Enviar
              </button>
              <button
                onClick={() => { setShowAudioInput(false); setAudioUrl(''); }}
                className="text-[12px] text-ink-muted hover:text-ink"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-hairline px-4 py-3 flex items-center gap-2 bg-parchment/50">
            {/* Mic button */}
            <button
              onClick={() => setShowAudioInput(v => !v)}
              title="Simular áudio (Whisper)"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                showAudioInput
                  ? 'bg-primary text-white'
                  : 'bg-white border border-hairline text-ink-muted hover:text-primary hover:border-primary'
              }`}
            >
              <Mic size={15} />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Digite uma mensagem..."
              disabled={loading || showAudioInput}
              className="flex-1 px-3.5 py-2.5 text-[14px] border border-hairline rounded-[999px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={(!input.trim() && !audioUrl.trim()) || loading}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
