import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import type { NormalizedRow } from '@/types';
import { calculateProductRanking } from '@/lib/aggregations';
import { formatCurrency, formatNumber, exportToCSV } from '@/lib/formatters';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: NormalizedRow[];
}

export default function ProductsView({ data }: Props) {
  const { filters } = useStore();

  const products = useMemo(() =>
    calculateProductRanking(data, filters.incluirBrindesDoacao),
    [data, filters.incluirBrindesDoacao]
  );

  const top20 = products.slice(0, 20);

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
              'produtos.csv'
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
              {products.slice(0, 100).map((p, idx) => (
                <tr key={idx} className="hover:bg-white/5">
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
      </div>
    </div>
  );
}
