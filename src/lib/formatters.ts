/**
 * Formata número como moeda BRL
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata número com separadores de milhares
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formata porcentagem
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Formata número grande com abreviações (K, M, B)
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return formatNumber(value);
}

/**
 * Exporta dados para CSV
 */
export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;

  // Cabeçalhos
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escapar valores com vírgula ou aspas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',')
    ),
  ].join('\n');

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporta dados para JSON
 */
export function exportToJSON(data: any, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Trunca texto com ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Gera cores para gráficos
 */
export function generateColors(count: number): string[] {
  const baseColors = [
    '#10b981', // green-500
    '#059669', // green-600
    '#34d399', // green-400
    '#047857', // green-700
    '#6ee7b7', // green-300
    '#065f46', // green-800
    '#a7f3d0', // green-200
    '#064e3b', // green-900
  ];

  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }

  return colors;
}

/**
 * Calcula cor baseada em valor (gradient vermelho-amarelo-verde)
 */
export function getColorFromValue(
  value: number,
  min: number,
  max: number,
  reverse = false
): string {
  const normalized = (value - min) / (max - min);
  const percent = reverse ? 1 - normalized : normalized;

  if (percent < 0.5) {
    // Vermelho para amarelo
    const r = 255;
    const g = Math.round(percent * 2 * 255);
    return `rgb(${r}, ${g}, 0)`;
  } else {
    // Amarelo para verde
    const r = Math.round((1 - percent) * 2 * 255);
    const g = 255;
    return `rgb(${r}, ${g}, 0)`;
  }
}
