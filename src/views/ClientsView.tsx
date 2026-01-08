import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { NormalizedRow, ClientSegment } from '@/types';
import { calculateClientMetrics } from '@/lib/aggregations';
import { formatCurrency, formatNumber, exportToCSV } from '@/lib/formatters';
import { Download, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  data: NormalizedRow[];
}

const CLIENTS_PER_PAGE = 100;

export default function ClientsView({ data }: Props) {
  const { filters } = useStore();
  const [sortField, setSortField] = useState<keyof any>('receitaTotal');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const clients = useMemo(() =>
    calculateClientMetrics(data, filters.incluirBrindesDoacao),
    [data, filters.incluirBrindesDoacao]
  );

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const aVal = a[sortField as keyof typeof a] as any;
      const bVal = b[sortField as keyof typeof b] as any;
      return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [clients, sortField, sortDir]);

  const totalPages = Math.ceil(sortedClients.length / CLIENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * CLIENTS_PER_PAGE;
  const endIndex = startIndex + CLIENTS_PER_PAGE;
  const paginatedClients = sortedClients.slice(startIndex, endIndex);

  const segmentCounts = useMemo(() => {
    const counts: Record<ClientSegment, number> = {
      VIP: 0,
      Potencial: 0,
      Ocasional: 0,
      'Caçador de Promo': 0,
      'Logística Sensível': 0,
      Novo: 0,
    };
    clients.forEach(c => counts[c.segmento]++);
    return counts;
  }, [clients]);

  const handleSort = (field: keyof any) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleExport = () => {
    exportToCSV(
      sortedClients.map(c => ({
        Nome: c.NomeRevendedora,
        Segmento: c.segmento,
        Score: c.score,
        Receita: c.receitaTotal,
        Transacoes: c.numeroTransacoes,
        TicketMedio: c.ticketMedioPorCompra,
        SKUsDistintos: c.numeroSKUsDistintos,
      })),
      'clientes.xlsx'
    );
  };

  return (
    <div className="space-y-6">
      {/* Segment Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(segmentCounts).map(([segment, count]) => (
          <div key={segment} className="glass rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">{segment}</p>
            <p className="text-2xl font-bold">{count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold">Clientes ({sortedClients.length})</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Mostrando {startIndex + 1} a {Math.min(endIndex, sortedClients.length)} de {sortedClients.length}
            </p>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gradient-green rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <SortHeader label="Nome" field="NomeRevendedora" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Segmento" field="segmento" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Score" field="score" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Receita" field="receitaTotal" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Transações" field="numeroTransacoes" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Ticket Médio" field="ticketMedioPorCompra" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="SKUs" field="numeroSKUsDistintos" current={sortField} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedClients.map((client, idx) => (
                <tr key={startIndex + idx} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm">{client.NomeRevendedora}</td>
                  <td className="px-4 py-3"><SegmentBadge segment={client.segmento} /></td>
                  <td className="px-4 py-3 text-sm">{client.score}</td>
                  <td className="px-4 py-3 text-sm font-medium">{formatCurrency(client.receitaTotal)}</td>
                  <td className="px-4 py-3 text-sm">{formatNumber(client.numeroTransacoes)}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(client.ticketMedioPorCompra)}</td>
                  <td className="px-4 py-3 text-sm">{client.numeroSKUsDistintos}</td>
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

function SortHeader({ label, field, current, onSort }: any) {
  return (
    <th
      className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-white/5"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        {label}
        {current === field && <ArrowUpDown className="w-4 h-4" />}
      </div>
    </th>
  );
}

function SegmentBadge({ segment }: { segment: ClientSegment }) {
  const colors: Record<ClientSegment, string> = {
    VIP: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    Potencial: 'bg-green-500/20 text-green-400 border-green-500/50',
    Ocasional: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    'Caçador de Promo': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    'Logística Sensível': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    Novo: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs border ${colors[segment]}`}>
      {segment}
    </span>
  );
}
