'use client';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';

type FormData = {
  nome_completo: string;
  nome_conhecido: string;
  data_nascimento: string;
  endereco: string;
  foto?: FileList;
};

function formatarDataNascimento(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  const parts = [dd, mm, yyyy].filter(Boolean);
  return parts.join('/');
}

export default function Lideranca2026Page() {
  const searchParams = useSearchParams();
  const [enviado, setEnviado] = useState(false);

  const nomeRemetente = useMemo(() => {
    const raw = searchParams.get('lideranca') || searchParams.get('from') || searchParams.get('remetente') || '';
    return raw.trim();
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      nome_completo: '',
      nome_conhecido: '',
      data_nascimento: '',
      endereco: '',
    },
  });

  const onSubmit = async () => {
    setEnviado(true);
    reset();
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-parchment px-4 py-10">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-[28px] font-semibold text-ink">Liderança 2026</h1>
            {nomeRemetente && (
              <p className="text-[13px] text-ink-muted mt-2">
                Liderança 2026 {nomeRemetente}
              </p>
            )}
          </div>
          <div className="card text-center">
            <p className="text-[17px] font-semibold text-ink">Cadastro enviado</p>
            <p className="text-[15px] text-ink-muted mt-1">Você já pode fechar esta página.</p>
          </div>
          <div className="flex justify-center">
            <button className="btn-secondary" onClick={() => setEnviado(false)}>
              Enviar outro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-[28px] font-semibold text-ink">Liderança 2026</h1>
          {nomeRemetente && (
            <p className="text-[13px] text-ink-muted mt-2">
              Liderança 2026 {nomeRemetente}
            </p>
          )}
        </div>

        <div className="card">
          <p className="text-[17px] font-semibold text-ink mb-4">Sua Foto</p>
          <div className="border border-hairline rounded-card p-5">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-parchment flex items-center justify-center text-[38px] font-semibold text-ink-muted">
                  FT
                </div>
                <label className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    {...register('foto')}
                  />
                  <span className="text-[18px] leading-none">+</span>
                </label>
              </div>
            </div>
            <p className="text-center text-[13px] text-ink-muted mt-4">
              A foto será usada no seu perfil de líder.
            </p>
          </div>
        </div>

        <div className="card">
          <p className="text-[17px] font-semibold text-ink mb-4">Identificação</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                placeholder="Digite o nome completo"
                {...register('nome_completo', { required: 'Nome completo obrigatório' })}
              />
              {errors.nome_completo?.message && (
                <p className="text-red-500 text-[13px] mt-1">{errors.nome_completo.message}</p>
              )}
            </div>

            <div>
              <label className="label">
                Como você é conhecido(a)? <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                placeholder="Apelido ou Nome de Urna"
                {...register('nome_conhecido', { required: 'Campo obrigatório' })}
              />
              {errors.nome_conhecido?.message && (
                <p className="text-red-500 text-[13px] mt-1">{errors.nome_conhecido.message}</p>
              )}
            </div>

            <div>
              <label className="label">
                Data de Nascimento <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                placeholder="DD/MM/AAAA"
                inputMode="numeric"
                type="tel"
                autoComplete="bday"
                {...register('data_nascimento', {
                  required: 'Data de nascimento obrigatória',
                  pattern: { value: /^\d{2}\/\d{2}\/\d{4}$/, message: 'Use o formato DD/MM/AAAA' },
                  onChange: e => {
                    e.target.value = formatarDataNascimento(e.target.value);
                  },
                })}
              />
              {errors.data_nascimento?.message && (
                <p className="text-red-500 text-[13px] mt-1">{errors.data_nascimento.message}</p>
              )}
            </div>

            <div>
              <label className="label">Endereço</label>
              <input className="input" placeholder="Digite o endereço" {...register('endereco')} />
            </div>

            <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

