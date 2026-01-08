import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { NormalizedRow } from '@/types';
import { formatCurrency, formatNumber, exportToCSV } from '@/lib/formatters';
import { Download, AlertTriangle, Database, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  data: NormalizedRow[];
}

const ROWS_PER_PAGE = 100;

export default function DataView({ data }: Props) {
  const { dataQuality, clearData } = useStore();
  const [currentPage, setCurrentPage] = useState(1);

  const errorsData = useMemo(() => {
    return data.filter(r => r._hasErrors);
  }, [data]);

  const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedData = data.slice(startIndex, endIndex);

  const handleExportAll = () => {
    exportToCSV(
      data.map(r => ({
        GerenciaCode: r.GerenciaCode,
        Setor: r.Setor,
        NomeRevendedora: r.NomeRevendedora,
        CicloLabel: r.CicloLabel,
        SKU: r.SKU,
        NomeProduto: r.NomeProduto,
        Tipo: r.Tipo,
        QuantidadeItens: r.QuantidadeItens,
        ValorPraticado: r.ValorPraticado,
        ValorLinhaVenda: r.ValorLinhaVenda,
        MeioCaptacao: r.MeioCaptacao,
        EntregaCategoria: r.EntregaCategoria,
      })),
      'dados-filtrados.xlsx'
    );
  };

  return (
    <div className="space-y-6">
      {/* Quality Overview */}
      {dataQuality && (
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Qualidade dos Dados
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Total de Linhas</p>
              <p className="text-2xl font-bold">{formatNumber(dataQuality.totalLinhas)}</p>
            </div>
            <div className="glass rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Linhas Válidas</p>
              <p className="text-2xl font-bold text-green-400">{formatNumber(dataQuality.linhasValidas)}</p>
            </div>
            <div className="glass rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Com Erros</p>
              <p className="text-2xl font-bold text-red-400">{formatNumber(dataQuality.linhasComErro)}</p>
            </div>
            <div className="glass rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">% Válidas</p>
              <p className="text-2xl font-bold">{formatNumber(dataQuality.percentualValidas, 1)}%</p>
            </div>
          </div>

          {/* Errors Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <ErrorCard label="Gerência Inválida" count={dataQuality.erros.gerenciaInvalida} />
            <ErrorCard label="Ciclo Inválido" count={dataQuality.erros.cicloInvalido} />
            <ErrorCard label="SKU Inválido" count={dataQuality.erros.skuInvalido} />
            <ErrorCard label="Valor Negativo" count={dataQuality.erros.valorNegativo} />
            <ErrorCard label="Campos Faltantes" count={dataQuality.erros.camposFaltantes} />
          </div>

          {/* Warnings */}
          {dataQuality.avisos.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-yellow-400">Avisos</p>
                  {dataQuality.avisos.map((aviso, idx) => (
                    <p key={idx} className="text-sm text-yellow-200">{aviso}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold">Dados Filtrados ({data.length} linhas)</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Mostrando {startIndex + 1} a {Math.min(endIndex, data.length)} de {data.length}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportAll}
              className="px-4 py-2 bg-gradient-green rounded-lg hover:opacity-90 flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
            <button
              onClick={clearData}
              className="px-4 py-2 bg-destructive/20 border border-destructive/50 rounded-lg hover:bg-destructive/30 flex items-center gap-2 text-sm text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Dados
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-3 py-2 text-left">Gerência</th>
                <th className="px-3 py-2 text-left">Revendedora</th>
                <th className="px-3 py-2 text-left">Ciclo</th>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-left">Produto</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-left">Canal</th>
                <th className="px-3 py-2 text-left">Entrega</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedData.map((row, idx) => (
                <tr key={startIndex + idx} className={`hover:bg-white/5 ${row._hasErrors ? 'bg-red-500/5' : ''}`}>
                  <td className="px-3 py-2">{row.GerenciaCode}</td>
                  <td className="px-3 py-2">{row.NomeRevendedora}</td>
                  <td className="px-3 py-2">{row.CicloLabel}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.SKU}</td>
                  <td className="px-3 py-2">{row.NomeProduto}</td>
                  <td className="px-3 py-2"><TypeBadge tipo={row.Tipo} /></td>
                  <td className="px-3 py-2 text-right">{row.QuantidadeItens}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.ValorLinhaVenda)}</td>
                  <td className="px-3 py-2 text-xs">{row.MeioCaptacao}</td>
                  <td className="px-3 py-2 text-xs">{row.EntregaCategoria}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Primeira
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Última
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Errors Table */}
      {errorsData.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-red-400">Linhas com Erros ({errorsData.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 py-2 text-left">Linha</th>
                  <th className="px-3 py-2 text-left">Revendedora</th>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-left">Erros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {errorsData.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 bg-red-500/5">
                    <td className="px-3 py-2">{row._rowIndex + 1}</td>
                    <td className="px-3 py-2">{row.NomeRevendedora}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.SKU}</td>
                    <td className="px-3 py-2 text-red-400">{row._errors.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="bg-white/5 rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold text-red-400">{count}</p>
    </div>
  );
}

function TypeBadge({ tipo }: { tipo: string }) {
  const colors: Record<string, string> = {
    Venda: 'bg-green-500/20 text-green-400',
    Brinde: 'bg-blue-500/20 text-blue-400',
    Doação: 'bg-purple-500/20 text-purple-400',
    Outro: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[tipo] || colors.Outro}`}>
      {tipo}
    </span>
  );
}
