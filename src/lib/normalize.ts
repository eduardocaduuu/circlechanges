import type { CicloInfo } from '@/types';

/**
 * Extrai os primeiros 5 dígitos da string de Gerência
 * Formato esperado: "13706 - NOME..." ou similar, ou apenas número 13706
 */
export function extractGerenciaCode(gerencia: string | number | undefined): string {
  if (gerencia === undefined || gerencia === null) return 'UNKNOWN';

  // Converte para string primeiro
  const gerenciaStr = String(gerencia).trim();

  if (gerenciaStr === '') return 'UNKNOWN';

  const match = gerenciaStr.match(/\d{5}/);
  return match ? match[0] : 'UNKNOWN';
}

/**
 * Normaliza SKU para 5 dígitos com zero padding
 * Converte números para string padronizada
 */
export function normalizeSKU(codigoProduto: string | number | undefined): string {
  if (codigoProduto === undefined || codigoProduto === null) {
    return 'INVALID';
  }

  const sku = String(codigoProduto).trim();

  // Remove caracteres não numéricos
  const numericSku = sku.replace(/\D/g, '');

  if (numericSku.length === 0 || numericSku.length > 6) {
    return 'INVALID';
  }

  // Pad com zeros à esquerda para 5 dígitos
  return numericSku.padStart(5, '0');
}

/**
 * Parse ciclo no formato "MM/YYYY" para CicloInfo
 * Retorna objeto com label, index (para ordenação) e componentes
 */
export function parseCiclo(cicloString: string | undefined): CicloInfo {
  if (!cicloString) {
    return {
      label: 'UNKNOWN',
      index: -1,
      mes: 0,
      ano: 0,
    };
  }

  // Tenta extrair MM/YYYY ou MM-YYYY ou variações
  const match = cicloString.match(/(\d{1,2})[\/\-](\d{4})/);

  if (!match) {
    return {
      label: 'UNKNOWN',
      index: -1,
      mes: 0,
      ano: 0,
    };
  }

  const mes = parseInt(match[1], 10);
  const ano = parseInt(match[2], 10);

  // Validação básica
  if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
    return {
      label: 'UNKNOWN',
      index: -1,
      mes: 0,
      ano: 0,
    };
  }

  return {
    label: cicloString.trim(),
    index: ano * 12 + mes, // Para ordenação
    mes,
    ano,
  };
}

/**
 * Normaliza nome de revendedora
 * - Remove espaços extras
 * - Mantém uppercase com acentos
 * - Trim
 */
export function normalizeNomeRevendedora(nome: string | undefined): string {
  if (!nome) return 'UNKNOWN';

  return nome
    .trim()
    .replace(/\s+/g, ' ') // Remove espaços duplicados
    .toUpperCase();
}

/**
 * Normaliza nome de produto
 */
export function normalizeNomeProduto(nome: string | undefined): string {
  if (!nome) return 'UNKNOWN';

  return nome.trim().replace(/\s+/g, ' ');
}

/**
 * Normaliza Meio Captação
 * Unifica variações de hífen e espaços
 */
export function normalizeMeioCaptacao(meio: string | undefined): string {
  if (!meio) return 'UNKNOWN';

  return meio
    .trim()
    .replace(/\s+/g, ' ') // Espaços duplicados
    .replace(/[–—−]/g, '-') // Normaliza hífens variados para hífen simples
    .replace(/\s*-\s*/g, ' - '); // Garante espaços ao redor do hífen
}

/**
 * Categoriza Tipo Entrega
 */
export function categorizarEntrega(
  tipoEntrega: string | undefined
): 'FRETE' | 'RETIRADA' | 'UNKNOWN' {
  if (!tipoEntrega) return 'UNKNOWN';

  const normalizado = tipoEntrega.toLowerCase().trim();

  if (normalizado.includes('endereço') || normalizado.includes('endereco')) {
    return 'FRETE';
  }

  if (normalizado.includes('retirar') || normalizado.includes('central')) {
    return 'RETIRADA';
  }

  return 'UNKNOWN';
}

/**
 * Normaliza Tipo de transação
 */
export function normalizeTipo(tipo: string | undefined): 'Venda' | 'Brinde' | 'Doação' | 'Outro' {
  if (!tipo) return 'Outro';

  const normalizado = tipo.toLowerCase().trim();

  if (normalizado === 'venda') return 'Venda';
  if (normalizado === 'brinde') return 'Brinde';
  if (normalizado === 'doação' || normalizado === 'doacao') return 'Doação';

  return 'Outro';
}

/**
 * Normaliza data de captação para formato ISO (YYYY-MM-DD)
 * Aceita Date ou string
 */
export function normalizeDataCaptacao(data: string | Date | undefined): string | null {
  if (!data) return null;

  try {
    let dateObj: Date;

    if (data instanceof Date) {
      dateObj = data;
    } else {
      // Tenta fazer parse da string
      // Excel pode retornar números (serial date) ou strings
      if (typeof data === 'number') {
        // Excel serial date (dias desde 1900-01-01)
        dateObj = excelSerialToDate(data);
      } else {
        dateObj = new Date(data);
      }
    }

    if (isNaN(dateObj.getTime())) {
      return null;
    }

    // Formato ISO: YYYY-MM-DD
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

/**
 * Converte serial date do Excel para Date
 * Excel conta dias desde 30/12/1899
 */
function excelSerialToDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);

  return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate());
}

/**
 * Sanitiza número para >= 0
 */
export function sanitizeNumber(value: number | undefined | null, defaultValue = 0): number {
  if (value === undefined || value === null || isNaN(value)) {
    return defaultValue;
  }

  return Math.max(0, value);
}

/**
 * Gera Transaction ID para market basket
 */
export function generateTransactionId(
  nomeRevendedora: string,
  cicloLabel: string,
  dataCaptacao: string | null
): string {
  const base = `${nomeRevendedora}|${cicloLabel}`;
  return dataCaptacao ? `${base}|${dataCaptacao}` : base;
}
