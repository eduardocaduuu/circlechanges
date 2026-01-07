import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import type { NormalizedRow } from '@/types';
import { generateBaskets, calculateFrequentPairs, calculateBasketMetrics } from '@/lib/marketBasket';
import { formatNumber, formatPercent, exportToCSV } from '@/lib/formatters';
import { Download } from 'lucide-react';

interface Props {
  data: NormalizedRow[];
}

export default function BasketView({ data }: Props) {
  const { filters } = useStore();

  const baskets = useMemo(() =>
    generateBaskets(data, filters.incluirBrindesDoacao),
    [data, filters.incluirBrindesDoacao]
  );

  const pairs = useMemo(() =>
    calculateFrequentPairs(baskets, data, 0.001),
    [baskets, data]
  );

  const metrics = useMemo(() =>
    calculateBasketMetrics(baskets),
    [baskets]
  );

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="glass rounded-xl p-4 bg-yellow-500/5 border border-yellow-500/30">
        <h3 className="text-sm font-semibold mb-2 text-yellow-400">Debug Market Basket</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Linhas de dados:</span>
            <span className="ml-2 font-mono text-yellow-300">{data.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Cestas geradas:</span>
            <span className="ml-2 font-mono text-yellow-300">{baskets.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Pares encontrados:</span>
            <span className="ml-2 font-mono text-yellow-300">{pairs.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Clientes únicos:</span>
            <span className="ml-2 font-mono text-yellow-300">
              {new Set(baskets.map(b => b.NomeRevendedora)).size}
            </span>
          </div>
        </div>
        {baskets.length > 0 && (
          <div className="mt-3 text-xs">
            <p className="text-muted-foreground mb-1">Amostra de 3 primeiras cestas:</p>
            <pre className="bg-black/30 p-2 rounded text-yellow-200 overflow-x-auto">
              {JSON.stringify(baskets.slice(0, 3).map(b => ({
                transactionId: b.transactionId,
                cliente: b.NomeRevendedora,
                ciclo: b.CicloLabel,
                data: b.DataCaptacao,
                numItens: b.items.length,
                items: b.items
              })), null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Basket Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total de Cestas</p>
          <p className="text-2xl font-bold">{formatNumber(baskets.length)}</p>
        </div>
        <div className="glass rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Média Itens/Cesta</p>
          <p className="text-2xl font-bold">{formatNumber(metrics.mediaItensPorCesta, 1)}</p>
        </div>
        <div className="glass rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Maior Cesta</p>
          <p className="text-2xl font-bold">{metrics.maiorCesta}</p>
        </div>
        <div className="glass rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Cestas Unitárias</p>
          <p className="text-2xl font-bold">{formatPercent(metrics.percentualCestasUnitarias)}</p>
        </div>
      </div>

      {/* Frequent Pairs */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Produtos Comprados Juntos ({pairs.length} pares)</h3>
          <button
            onClick={() => exportToCSV(
              pairs.map(p => ({
                ProdutoA: p.itemA,
                NomeA: p.nomeA,
                ProdutoB: p.itemB,
                NomeB: p.nomeB,
                Lift: p.lift,
                Ocorrencias: p.occurrences,
                Suporte: p.suporte,
                Confianca: p.confianca,
                NumeroClientes: p.clientes.length,
                Clientes: p.clientes.join('; '),
              })),
              'pares-produtos.csv'
            )}
            className="px-4 py-2 bg-gradient-green rounded-lg hover:opacity-90 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Produto A</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Produto B</th>
                <th className="px-6 py-3 text-center text-sm font-bold bg-gradient-green/20">
                  Lift
                  <div className="text-xs font-normal text-muted-foreground">Força da Associação</div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">Ocorrências</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Suporte</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Confiança</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Clientes ({pairs.length > 0 ? pairs[0].clientes.length : 0})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pairs.slice(0, 50).map((pair, idx) => (
                <tr key={idx} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-mono text-xs text-muted-foreground">{pair.itemA}</div>
                    <div className="text-sm">{pair.nomeA}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-mono text-xs text-muted-foreground">{pair.itemB}</div>
                    <div className="text-sm">{pair.nomeB}</div>
                  </td>
                  <td className="px-6 py-3 bg-gradient-green/10">
                    <div className="flex flex-col items-center">
                      <span className={`text-2xl font-bold ${pair.lift > 1 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatNumber(pair.lift, 2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {pair.lift > 1.5 ? 'Forte' : pair.lift > 1 ? 'Moderado' : 'Fraco'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{pair.occurrences}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatPercent(pair.suporte * 100, 2)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatPercent(pair.confianca * 100, 1)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-green-400">{pair.clientes.length} clientes</span>
                      <span className="text-xs text-muted-foreground line-clamp-2" title={pair.clientes.join(', ')}>
                        {pair.clientes.slice(0, 3).join(', ')}{pair.clientes.length > 3 ? '...' : ''}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
