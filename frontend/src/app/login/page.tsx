'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { setAuth } from '@/lib/auth';

type LoginForm = { email: string; senha: string };

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.access_token, res.data.user);
      router.push('/');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-tile rounded-[18px] mb-6">
            <span className="text-white text-[28px] font-semibold">LB</span>
          </div>
          <h1 className="text-[34px] font-semibold text-ink" style={{ letterSpacing: '-0.374px' }}>
            Legis BOT
          </h1>
          <p className="text-[17px] text-ink-muted mt-2">Módulo Robô — Acesso ao Sistema</p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                {...register('email', { required: 'E-mail obrigatório' })}
                type="email"
                className="input"
                placeholder="admin@mv2026.local"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-[13px] mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Senha</label>
              <input
                {...register('senha', { required: 'Senha obrigatória' })}
                type="password"
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.senha && <p className="text-red-500 text-[13px] mt-1">{errors.senha.message}</p>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-[11px] px-4 py-3 text-[14px] text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-[12px] text-ink-muted mt-6">
          Legis BOT · Módulo Robô
        </p>
      </div>
    </div>
  );
}
