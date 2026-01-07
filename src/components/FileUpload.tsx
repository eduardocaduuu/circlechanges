import { useCallback, useState } from 'react';
import { useStore } from '@/lib/store';
import { parseExcelFile } from '@/lib/parseExcel';
import { Upload, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';

export default function FileUpload() {
  const { setData, setLoading, setError, isLoading, error } = useStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, quality, rawSample } = await parseExcelFile(file);
        setData(data, quality, rawSample);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
      }
    },
    [setData, setLoading, setError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="glass-strong rounded-xl p-8">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold gradient-text mb-2">Bem-vindo!</h2>
        <p className="text-muted-foreground">
          Faça upload da sua planilha Excel para começar a análise
        </p>
      </div>

      <div
        className={`
          relative border-2 border-dashed rounded-xl p-12 transition-all
          ${isDragging ? 'border-primary bg-primary/10 glow' : 'border-white/20 hover:border-primary/50'}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />

        <div className="text-center">
          {isLoading ? (
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
          ) : (
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-green rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-white" />
            </div>
          )}

          <p className="text-lg font-medium mb-2">
            {isLoading ? 'Processando...' : 'Arraste seu arquivo aqui'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Formatos aceitos: .xlsx, .xls</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-destructive/20 border border-destructive rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Erro ao processar arquivo</p>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-white/5 rounded-lg">
        <p className="text-sm font-medium mb-2">Colunas esperadas:</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>• Gerencia</div>
          <div>• Setor</div>
          <div>• NomeRevendedora</div>
          <div>• QuantidadePontos</div>
          <div>• CicloCaptacao</div>
          <div>• CodigoProduto</div>
          <div>• NomeProduto</div>
          <div>• Tipo</div>
          <div>• DataCaptacao</div>
          <div>• QuantidadeItens</div>
          <div>• ValorPraticado</div>
          <div>• Meio Captacao</div>
          <div>• Tipo Entrega</div>
        </div>
      </div>
    </div>
  );
}
