'use client';
import { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface LogImportacao {
  id: string; arquivo: string; linhas_processadas: number;
  linhas_com_erro: number; status: string; erros: any; created_at: string;
}

interface UploadResult {
  arquivo: string; linhas_processadas: number; linhas_com_erro: number; status: string; erros: any[];
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    SUCESSO: 'bg-green-50 text-green-700 border-green-200',
    PARCIAL: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    ERRO: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[12px] font-semibold border ${map[status] || 'bg-parchment text-ink-muted border-hairline'}`}>
      {status}
    </span>
  );
};

export default function ImportacoesPage() {
  const [logs, setLogs] = useState<LogImportacao[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    const r = await api.get('/importacoes');
    setLogs(r.data);
  };

  useEffect(() => { loadLogs(); }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setResult(null);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const r = await api.post('/importacoes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(r.data);
      loadLogs();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao processar arquivo');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-[34px] font-semibold text-ink" style={{ letterSpacing: '-0.374px' }}>Importador XLSX</h1>
          <p className="text-[17px] text-ink-muted mt-1">Importe a planilha "GERAL ATUALIZADO MV" para atualizar os dados</p>
        </div>

        {/* Upload Zone */}
        <div className="card">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-[11px] p-12 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-blue-50' : 'border-hairline hover:border-primary hover:bg-parchment'}
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 rounded-[18px] flex items-center justify-center ${isDragActive ? 'bg-primary' : 'bg-parchment'}`}>
                <Upload size={28} className={isDragActive ? 'text-white' : 'text-ink-muted'} />
              </div>
              {uploading ? (
                <div>
                  <p className="text-[17px] font-semibold text-ink">Processando planilha...</p>
                  <p className="text-[14px] text-ink-muted mt-1">Importando municípios, aguarde</p>
                </div>
              ) : isDragActive ? (
                <p className="text-[17px] font-semibold text-primary">Solte o arquivo aqui</p>
              ) : (
                <div>
                  <p className="text-[17px] font-semibold text-ink">Arraste o arquivo XLSX aqui</p>
                  <p className="text-[14px] text-ink-muted mt-1">ou clique para selecionar</p>
                  <p className="text-[12px] text-ink-muted mt-3">Formatos aceitos: .xlsx, .xls · Máx. 50MB</p>
                  {acceptedFiles[0] && (
                    <div className="mt-4 flex items-center gap-2 justify-center text-[14px] text-ink">
                      <FileText size={16} />
                      {acceptedFiles[0].name}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`mt-4 rounded-[11px] p-4 border ${result.status === 'SUCESSO' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-start gap-3">
                {result.status === 'SUCESSO'
                  ? <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  : <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p className="text-[15px] font-semibold text-ink">{result.arquivo}</p>
                  <p className="text-[14px] text-ink-muted mt-1">
                    {result.linhas_processadas} municípios importados · {result.linhas_com_erro} erros
                  </p>
                  {result.erros?.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[13px] font-semibold text-ink">Erros encontrados:</p>
                      {result.erros.slice(0, 10).map((e: any, i: number) => (
                        <p key={i} className="text-[13px] text-red-700">• {e.municipio}: {e.erro}</p>
                      ))}
                      {result.erros.length > 10 && (
                        <p className="text-[13px] text-ink-muted">...e mais {result.erros.length - 10} erros</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-[11px] p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-[14px] text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* History */}
        <div className="card">
          <h2 className="text-[21px] font-semibold text-ink mb-6" style={{ letterSpacing: '-0.022em' }}>
            Histórico de Importações
          </h2>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={32} className="text-ink-muted mx-auto mb-3" />
              <p className="text-[17px] text-ink-muted">Nenhuma importação realizada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="table-th">Arquivo</th>
                    <th className="table-th text-center">Processadas</th>
                    <th className="table-th text-center">Erros</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-t border-hairline hover:bg-parchment/40 transition-colors">
                      <td className="table-td text-[14px]">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-ink-muted flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{log.arquivo}</span>
                        </div>
                      </td>
                      <td className="table-td text-center font-semibold text-primary">{log.linhas_processadas}</td>
                      <td className="table-td text-center text-red-600">{log.linhas_com_erro}</td>
                      <td className="table-td"><StatusBadge status={log.status} /></td>
                      <td className="table-td text-[14px] text-ink-muted">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
