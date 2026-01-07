import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Search, X, Filter, RotateCcw } from 'lucide-react';
import { debounce } from '@/lib/formatters';

export default function FiltersBar() {
  const { rawData, filters, setFilters, resetFilters } = useStore();
  const [searchRevendedora, setSearchRevendedora] = useState(filters.searchRevendedora);
  const [searchProduto, setSearchProduto] = useState(filters.searchProduto);
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique values
  const { gerencias, setores, ciclos, meios } = useMemo(() => {
    const gerencias = Array.from(new Set(rawData.map(r => r.GerenciaCode))).filter(g => g !== 'UNKNOWN').sort();
    const setores = Array.from(new Set(rawData.map(r => r.Setor))).filter(s => s !== 'UNKNOWN').sort();
    const ciclos = Array.from(new Set(rawData.map(r => r.CicloLabel))).filter(c => c !== 'UNKNOWN').sort();
    const meios = Array.from(new Set(rawData.map(r => r.MeioCaptacao))).filter(m => m !== 'UNKNOWN').sort();
    return { gerencias, setores, ciclos, meios };
  }, [rawData]);

  const debouncedSetSearchRevendedora = useMemo(
    () => debounce((value: string) => setFilters({ searchRevendedora: value }), 300),
    [setFilters]
  );

  const debouncedSetSearchProduto = useMemo(
    () => debounce((value: string) => setFilters({ searchProduto: value }), 300),
    [setFilters]
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.gerenciaCodes.length > 0) count++;
    if (filters.setores.length > 0) count++;
    if (filters.ciclos.length > 0) count++;
    if (filters.meiosCaptacao.length > 0) count++;
    if (filters.entregaCategorias.length > 0) count++;
    if (filters.searchRevendedora) count++;
    if (filters.searchProduto) count++;
    return count;
  }, [filters]);

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      {/* Top row: search + toggles */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search Revendedora */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar revendedora..."
            value={searchRevendedora}
            onChange={(e) => {
              setSearchRevendedora(e.target.value);
              debouncedSetSearchRevendedora(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        {/* Search Produto */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar produto ou SKU..."
            value={searchProduto}
            onChange={(e) => {
              setSearchProduto(e.target.value);
              debouncedSetSearchProduto(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 text-sm"
        >
          <Filter className="w-4 h-4" />
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Reset */}
        {activeFiltersCount > 0 && (
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-destructive/20 border border-destructive/50 rounded-lg hover:bg-destructive/30 transition-colors flex items-center gap-2 text-sm text-destructive"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Limpar</span>
          </button>
        )}

        {/* Toggle incluir brindes */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.incluirBrindesDoacao}
            onChange={(e) => setFilters({ incluirBrindesDoacao: e.target.checked })}
            className="w-4 h-4 rounded accent-primary"
          />
          <span className="text-sm text-muted-foreground">Incluir Brinde/Doação</span>
        </label>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/10">
          {/* Gerência */}
          <div>
            <label className="text-sm font-medium mb-2 block">Gerência</label>
            <select
              multiple
              value={filters.gerenciaCodes}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFilters({ gerenciaCodes: selected });
              }}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-h-[100px]"
            >
              {gerencias.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Setor */}
          <div>
            <label className="text-sm font-medium mb-2 block">Setor</label>
            <select
              multiple
              value={filters.setores}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFilters({ setores: selected });
              }}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-h-[100px]"
            >
              {setores.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Ciclo */}
          <div>
            <label className="text-sm font-medium mb-2 block">Ciclo</label>
            <select
              multiple
              value={filters.ciclos}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFilters({ ciclos: selected });
              }}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-h-[100px]"
            >
              {ciclos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Meio Captação */}
          <div>
            <label className="text-sm font-medium mb-2 block">Meio Captação</label>
            <select
              multiple
              value={filters.meiosCaptacao}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFilters({ meiosCaptacao: selected });
              }}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-h-[100px]"
            >
              {meios.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
