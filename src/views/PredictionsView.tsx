import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import type { NormalizedRow } from '@/types';
import { generatePredictions, findGrowingProducts } from '@/lib/regression';
import { formatNumber, exportToCSV } from '@/lib/formatters';
import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data: NormalizedRow[];
}

export default function PredictionsView({ data }: Props) {
  const { filters } = useStore();

  const predictions = useMemo(() =>
    generatePredictions(data, filters.incluirBrindesDoacao, 3),
    [data, filters.incluirBrindesDoacao]
  );

  const growingProducts = useMemo(() =>
    findGrowingProducts(predictions, 10),
    [predictions]
  );

  return (
    <div className="space-y-6">
      {/* Growing Products */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Top 10 Produtos em Crescimento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {growingProducts.map((p, idx) => (
            <div key={idx} className="glass rounded-lg p-4 hover-lift">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{p.SKU}</p>
                  <p className="font-medium">{p.NomeProduto}</p>
                </div>
                <TrendBadge tendencia={p.tendencia} />
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Previsão</p>
                  <p className="text-xl font-bold text-green-400">{formatNumber(p.previsaoProximoCiclo)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Confiança</p>
                  <ConfidenceBadge confianca={p.confianca} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Predictions */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Todas as Previsões ({predictions.length} SKUs)</h3>
          <button
            onClick={() => exportToCSV(
              predictions.map(p => ({
                SKU: p.SKU,
                Nome: p.NomeProduto,
                PrevisaoProximoCiclo: p.previsaoProximoCiclo,
                Tendencia: p.tendencia,
                Confianca: p.confianca,
                Erro: p.erro,
              })),
              'previsoes.csv'
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
                <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Nome</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Previsão</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Tendência</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Confiança</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Erro (MAE)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {predictions.slice(0, 50).map((p, idx) => (
                <tr key={idx} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-sm font-mono">{p.SKU}</td>
                  <td className="px-4 py-3 text-sm">{p.NomeProduto}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-400">
                    {formatNumber(p.previsaoProximoCiclo)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <TrendBadge tendencia={p.tendencia} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ConfidenceBadge confianca={p.confianca} />
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{formatNumber(p.erro, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TrendBadge({ tendencia }: { tendencia: 'crescimento' | 'estável' | 'declínio' }) {
  const config = {
    crescimento: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Crescimento' },
    estável: { icon: Minus, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Estável' },
    declínio: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Declínio' },
  };

  const { icon: Icon, color, bg, label } = config[tendencia];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${color} ${bg}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function ConfidenceBadge({ confianca }: { confianca: 'alta' | 'média' | 'baixa' }) {
  const colors = {
    alta: 'bg-green-500/20 text-green-400',
    média: 'bg-yellow-500/20 text-yellow-400',
    baixa: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[confianca]}`}>
      {confianca.charAt(0).toUpperCase() + confianca.slice(1)}
    </span>
  );
}
