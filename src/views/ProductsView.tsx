import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { NormalizedRow } from '@/types';
import { calculateProductRanking } from '@/lib/aggregations';
import { formatCurrency, formatNumber, exportToCSV } from '@/lib/formatters';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: NormalizedRow[];
}

const PRODUCTS_PER_PAGE = 100;

export default function ProductsView({ data }: Props) {
  const { filters } = useStore();
  const [currentPage, setCurrentPage] = useState(1);

  const products = useMemo(() =>
    calculateProductRanking(data, filters.incluirBrindesDoacao),
    [data, filters.incluirBrindesDoacao]
  );

  const top20 = products.slice(0, 20);

  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const paginatedProducts = products.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Top 20 Produtos por Receita</h3>
          <button
            onClick={() => exportToCSV(
              products.map(p => ({
                SKU: p.SKU,
                Nome: p.NomeProduto,
                Quantidade: p.quantidade,
                Receita: p.receita,
                NumeroTransacoes: p.numeroTransacoes,
                NumeroClientes: p.numeroClientes,
              })),
              'produtos.xlsx'
            )}
            className="px-4 py-2 bg-gradient-green rounded-lg hover:opacity-90 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={top20} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis type="number" stroke="#fff" fontSize={12} tickFormatter={(v) => `R$ ${((v as number)/1000).toFixed(0)}K`} />
            <YAxis type="category" dataKey="SKU" stroke="#fff" fontSize={11} width={60} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
              formatter={(value) => formatCurrency(value as number)}
            />
            <Bar dataKey="receita" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold">Todos os Produtos ({products.length})</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Mostrando {startIndex + 1} a {Math.min(endIndex, products.length)} de {products.length}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Nome</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Quantidade</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Receita</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Transações</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Clientes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedProducts.map((p, idx) => (
                <tr key={startIndex + idx} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-sm font-mono">{p.SKU}</td>
                  <td className="px-4 py-3 text-sm">{p.NomeProduto}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatNumber(p.quantidade)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(p.receita)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatNumber(p.numeroTransacoes)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatNumber(p.numeroClientes)}</td>
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
