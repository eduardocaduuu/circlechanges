import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import type { NormalizedRow } from '@/types';
import { calculateOverviewMetrics, calculateProductRanking, groupByCiclo } from '@/lib/aggregations';
import { formatCurrency, formatNumber, formatCompactNumber } from '@/lib/formatters';
import { DollarSign, ShoppingBag, TrendingUp, Users, Package, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface Props {
  data: NormalizedRow[];
}

export default function OverviewView({ data }: Props) {
  const { filters } = useStore();

  const metrics = useMemo(() =>
    calculateOverviewMetrics(data, filters.incluirBrindesDoacao),
    [data, filters.incluirBrindesDoacao]
  );

  const topProducts = useMemo(() =>
    calculateProductRanking(data, filters.incluirBrindesDoacao).slice(0, 10),
    [data, filters.incluirBrindesDoacao]
  );

  const cicloData = useMemo(() =>
    groupByCiclo(data, filters.incluirBrindesDoacao),
    [data, filters.incluirBrindesDoacao]
  );

  const canalData = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      if (r.Tipo === 'Venda') {
        map.set(r.MeioCaptacao, (map.get(r.MeioCaptacao) || 0) + r.ValorLinhaVenda);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [data]);

  const COLORS = ['#10b981', '#059669', '#34d399', '#047857', '#6ee7b7'];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Receita Total"
          value={formatCurrency(metrics.receitaTotal)}
          color="green"
        />
        <MetricCard
          icon={ShoppingBag}
          label="Ticket Médio / Compra"
          value={formatCurrency(metrics.ticketMedioPorCompra)}
          color="blue"
        />
        <MetricCard
          icon={TrendingUp}
          label="Ticket Médio / Cliente"
          value={formatCurrency(metrics.ticketMedioPorCliente)}
          color="purple"
        />
        <MetricCard
          icon={Package}
          label="Itens Vendidos"
          value={formatCompactNumber(metrics.itensVendidos)}
          color="orange"
        />
        <MetricCard
          icon={Users}
          label="Clientes"
          value={formatNumber(metrics.numeroClientes)}
          color="pink"
        />
        <MetricCard
          icon={Award}
          label="Pontos Totais"
          value={formatCompactNumber(metrics.pontosTotais)}
          color="yellow"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products by Revenue */}
        <ChartCard title="Top 10 Produtos por Receita">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="SKU" stroke="#fff" fontSize={12} />
              <YAxis stroke="#fff" fontSize={12} tickFormatter={(v) => formatCompactNumber(v as number)} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
                formatter={(value) => formatCurrency(value as number)}
              />
              <Bar dataKey="receita" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Revenue by Channel */}
        <ChartCard title="Receita por Canal">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={canalData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
                labelLine={false}
              >
                {canalData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
                formatter={(value) => formatCurrency(value as number)}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Ciclo Timeline */}
      <ChartCard title="Evolução por Ciclo">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cicloData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="ciclo" stroke="#fff" fontSize={12} />
            <YAxis stroke="#fff" fontSize={12} tickFormatter={(v) => formatCompactNumber(v as number)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
              formatter={(value) => formatCurrency(value as number)}
            />
            <Line type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: any) {
  const colorMap: any = {
    green: 'from-green-600 to-green-500',
    blue: 'from-blue-600 to-blue-500',
    purple: 'from-purple-600 to-purple-500',
    orange: 'from-orange-600 to-orange-500',
    pink: 'from-pink-600 to-pink-500',
    yellow: 'from-yellow-600 to-yellow-500',
  };

  return (
    <div className="glass rounded-xl p-6 hover-lift">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${colorMap[color]}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: any) {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}
