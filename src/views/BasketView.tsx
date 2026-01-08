import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { NormalizedRow } from '@/types';
import { generateBaskets, calculateFrequentPairs, calculateBasketMetrics } from '@/lib/marketBasket';
import { formatNumber, formatPercent, exportToCSV } from '@/lib/formatters';
import { Download, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface Props {
  data: NormalizedRow[];
}

const PAIRS_PER_PAGE = 50;

export default function BasketView({ data }: Props) {
  const { filters } = useStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [minLift, setMinLift] = useState(1.0);
  const [minOccurrences, setMinOccurrences] = useState(1);
  const [searchProduct, setSearchProduct] = useState('');

  const baskets = useMemo(() =>
    generateBaskets(data, filters.incluirBrindesDoacao),
    [data, filters.incluirBrindesDoacao]
  );

  const pairs = useMemo(() =>
    calculateFrequentPairs(baskets, data, 0.001),
    [baskets, data]
  );

  const filteredPairs = useMemo(() => {
    return pairs.filter(pair => {
      // Filtro por Lift mínimo
      if (pair.lift < minLift) return false;

      // Filtro por Ocorrências mínimas
      if (pair.occurrences < minOccurrences) return false;

      // Filtro por busca de produto
      if (searchProduct) {
        const search = searchProduct.toUpperCase();
        const matchA = pair.itemA.includes(search) || pair.nomeA.toUpperCase().includes(search);
        const matchB = pair.itemB.includes(search) || pair.nomeB.toUpperCase().includes(search);
        if (!matchA && !matchB) return false;
      }

      return true;
    });
  }, [pairs, minLift, minOccurrences, searchProduct]);

  const metrics = useMemo(() =>
    calculateBasketMetrics(baskets),
    [baskets]
  );

  const totalPages = Math.ceil(filteredPairs.length / PAIRS_PER_PAGE);
  const startIndex = (currentPage - 1) * PAIRS_PER_PAGE;
  const endIndex = startIndex + PAIRS_PER_PAGE;
  const paginatedPairs = filteredPairs.slice(startIndex, endIndex);

  // Reset para página 1 quando filtros mudam
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
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

      {/* Filters */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lift Mínimo */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Lift Mínimo: {minLift.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={minLift}
              onChange={(e) => {
                setMinLift(parseFloat(e.target.value));
                handleFilterChange();
              }}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0.0</span>
              <span>5.0</span>
            </div>
          </div>

          {/* Ocorrências Mínimas */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Ocorrências Mínimas: {minOccurrences}
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={minOccurrences}
              onChange={(e) => {
                setMinOccurrences(parseInt(e.target.value));
                handleFilterChange();
              }}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1</span>
              <span>20+</span>
            </div>
          </div>

          {/* Buscar Produto */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Buscar Produto (SKU ou Nome)
            </label>
            <input
              type="text"
              value={searchProduct}
              onChange={(e) => {
                setSearchProduct(e.target.value);
                handleFilterChange();
              }}
              placeholder="Ex: 12345 ou Shampoo"
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredPairs.length} de {pairs.length} pares exibidos
          </p>
          <button
            onClick={() => {
              setMinLift(1.0);
              setMinOccurrences(1);
              setSearchProduct('');
              handleFilterChange();
            }}
            className="text-sm text-primary hover:underline"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Frequent Pairs */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold">Produtos Comprados Juntos ({filteredPairs.length} pares)</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredPairs.length)} de {filteredPairs.length}
            </p>
          </div>
          <button
            onClick={() => exportToCSV(
              filteredPairs.map(p => ({
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
              {paginatedPairs.map((pair, idx) => (
                <tr key={startIndex + idx} className="hover:bg-white/5">
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
    </div>
  );
}
