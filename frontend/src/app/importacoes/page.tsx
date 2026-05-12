'use client';
import { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, ChevronRight, X, Trash2 } from 'lucide-react';

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
  const [processing, setProcessing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');

  // Sheet selection state
  const [abas, setAbas] = useState<string[]>([]);
  const [filePath, setFilePath] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedAba, setSelectedAba] = useState('');

  const loadLogs = async () => {
    const r = await api.get('/importacoes');
    setLogs(r.data);
  };

  const handleLimpar = async () => {
    setClearing(true);
    setError('');
    try {
      await api.delete('/importacoes/dados');
      setConfirmClear(false);
      loadLogs();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao limpar os dados');
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => { loadLogs(); }, []);

  const resetState = () => {
    setAbas([]);
    setFilePath('');
    setFileName('');
    setSelectedAba('');
    setResult(null);
    setError('');
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    resetState();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const r = await api.post('/importacoes/abas', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAbas(r.data.abas);
      setFilePath(r.data.filePath);
      setFileName(r.data.fileName);
      setSelectedAba(r.data.abas[0] || '');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao ler o arquivo');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleImportar = async () => {
    if (!selectedAba || !filePath) return;
    setProcessing(true);
    setResult(null);
    setError('');
    try {
      const r = await api.post('/importacoes/processar', { filePath, sheetName: selectedAba, fileName });
      setResult(r.data);
      setAbas([]);
      loadLogs();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao processar arquivo');
    } finally {
      setProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    maxFiles: 1,
    disabled: uploading || processing,
  });

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[34px] font-semibold text-ink" style={{ letterSpacing: '-0.374px' }}>Importador XLSX</h1>
            <p className="text-[17px] text-ink-muted mt-1">Faça upload da planilha e escolha a aba para importar</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            {confirmClear ? (
              <>
                <span className="text-[14px] text-red-700 font-medium">Apagar todos os dados?</span>
                <button
                  onClick={handleLimpar}
                  disabled={clearing}
                  className="px-4 py-2 rounded-[9px] text-[14px] font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  {clearing ? 'Apagando...' : 'Confirmar'}
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-4 py-2 rounded-[9px] text-[14px] font-semibold border border-hairline text-ink hover:bg-parchment transition-colors"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-[9px] text-[14px] font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={15} />
                Limpar dados
              </button>
            )}
          </div>
        </div>

        {/* Upload Zone */}
        <div className="card">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-[11px] p-12 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-blue-50' : 'border-hairline hover:border-primary hover:bg-parchment'}
              ${(uploading || processing) ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 rounded-[18px] flex items-center justify-center ${isDragActive ? 'bg-primary' : 'bg-parchment'}`}>
                <Upload size={28} className={isDragActive ? 'text-white' : 'text-ink-muted'} />
              </div>
              {uploading ? (
                <div>
                  <p className="text-[17px] font-semibold text-ink">Lendo planilha...</p>
                  <p className="text-[14px] text-ink-muted mt-1">Identificando abas disponíveis</p>
                </div>
              ) : isDragActive ? (
                <p className="text-[17px] font-semibold text-primary">Solte o arquivo aqui</p>
              ) : (
                <div>
                  <p className="text-[17px] font-semibold text-ink">Arraste o arquivo XLSX aqui</p>
                  <p className="text-[14px] text-ink-muted mt-1">ou clique para selecionar</p>
                  <p className="text-[12px] text-ink-muted mt-3">Formatos aceitos: .xlsx, .xls · Máx. 50MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Sheet selector */}
          {abas.length > 0 && (
            <div className="mt-4 border border-hairline rounded-[11px] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-ink-muted" />
                  <span className="text-[14px] font-semibold text-ink">{fileName}</span>
                  <span className="text-[13px] text-ink-muted">· {abas.length} {abas.length === 1 ? 'aba' : 'abas'} encontradas</span>
                </div>
                <button onClick={resetState} className="text-ink-muted hover:text-ink transition-colors">
                  <X size={16} />
                </button>
              </div>

              <p className="text-[13px] text-ink-muted mb-2">Escolha a aba para importar:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {abas.map(aba => (
                  <button
                    key={aba}
                    onClick={() => setSelectedAba(aba)}
                    className={`px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors border ${
                      selectedAba === aba
                        ? 'bg-primary text-white border-primary'
                        : 'bg-parchment text-ink border-hairline hover:border-primary hover:text-primary'
                    }`}
                  >
                    {aba}
                  </button>
                ))}
              </div>

              <button
                onClick={handleImportar}
                disabled={!selectedAba || processing}
                className="btn-primary flex items-center gap-2"
                style={{ opacity: (!selectedAba || processing) ? 0.6 : 1 }}
              >
                {processing ? (
                  <>Importando...</>
                ) : (
                  <>
                    Importar aba "{selectedAba}"
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}

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
