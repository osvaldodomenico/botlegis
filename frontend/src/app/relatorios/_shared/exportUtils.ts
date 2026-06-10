// Helpers de exportação dos relatórios (Excel / PDF) — autenticado via token.
export type ExportSecao = 'municipio' | 'regiao' | 'liderancas' | 'bloco' | 'bases';
export type ExportParams = { nome?: string; valor?: string; termo?: string; bloco?: string; tipo?: string };

export async function downloadExport(secao: ExportSecao, formato: 'xlsx' | 'pdf', params: ExportParams) {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mv2026_token') : '';
    const qs = new URLSearchParams({ secao, formato });
    Object.entries(params).forEach(([k, v]) => { if (v) qs.append(k, String(v)); });
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/relatorios/export?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('export falhou');
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') || '';
    const m = cd.match(/filename="?([^"]+)"?/);
    const filename = m?.[1] || `relatorio.${formato === 'xlsx' ? 'xlsx' : 'pdf'}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    alert('Erro ao exportar. Tente novamente.');
  }
}

// Download genérico autenticado (qualquer rota de relatório que devolve arquivo)
export async function downloadRelatorioUrl(path: string, fallbackName: string) {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mv2026_token') : '';
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}${sep}_=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!res.ok) throw new Error('download falhou');
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') || '';
    const m = cd.match(/filename="?([^"]+)"?/);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = m?.[1] || fallbackName;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    alert('Erro ao exportar. Tente novamente.');
  }
}

// Export do RAIO-X (PDF / Excel)
export const downloadRaioX = (formato: 'xlsx' | 'pdf') =>
  downloadRelatorioUrl(`/relatorios/raio-x/export?formato=${formato}`, `dna-campanha.${formato}`);

// Formatação numérica pt-BR
export const fmt = (n: number | null | undefined) => (n || 0).toLocaleString('pt-BR');
// Percentual MV (campo é fração: 0.0232 -> "2,32%")
export const fmtPct = (p: number | null | undefined) =>
  p == null ? '—' : `${(p * 100).toFixed(2).replace('.', ',')}%`;
