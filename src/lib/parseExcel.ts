import * as XLSX from 'xlsx';
import type { NormalizedRow, RawRow, DataQuality } from '@/types';
import {
  extractGerenciaCode,
  normalizeSKU,
  parseCiclo,
  normalizeNomeRevendedora,
  normalizeNomeProduto,
  normalizeMeioCaptacao,
  categorizarEntrega,
  normalizeTipo,
  normalizeDataCaptacao,
  sanitizeNumber,
  generateTransactionId,
} from './normalize';

/**
 * Parse arquivo Excel e retorna dados normalizados + quality info
 */
export async function parseExcelFile(
  file: File
): Promise<{ data: NormalizedRow[]; quality: DataQuality }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('Erro ao ler arquivo');
        }

        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });

        // Pega a primeira sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Converte para JSON (array de objetos)
        const rawData: RawRow[] = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          defval: undefined,
        });

        // Normaliza cada linha
        const { normalized, quality } = normalizeData(rawData);

        resolve({ data: normalized, quality });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Normaliza array de dados brutos
 */
function normalizeData(rawData: RawRow[]): {
  normalized: NormalizedRow[];
  quality: DataQuality;
} {
  const normalized: NormalizedRow[] = [];
  const quality: DataQuality = {
    totalLinhas: rawData.length,
    linhasValidas: 0,
    linhasComErro: 0,
    percentualValidas: 0,
    erros: {
      gerenciaInvalida: 0,
      cicloInvalido: 0,
      skuInvalido: 0,
      valorNegativo: 0,
      camposFaltantes: 0,
    },
    avisos: [],
  };

  rawData.forEach((raw, index) => {
    const errors: string[] = [];

    // 1. Gerência
    const GerenciaCode = extractGerenciaCode(raw.Gerencia);
    if (GerenciaCode === 'UNKNOWN') {
      errors.push('Gerência inválida ou ausente');
      quality.erros.gerenciaInvalida++;
    }

    // 2. Setor
    const Setor = raw.Setor?.trim() || 'UNKNOWN';

    // 3. Nome Revendedora
    const NomeRevendedora = normalizeNomeRevendedora(raw.NomeRevendedora);
    if (NomeRevendedora === 'UNKNOWN') {
      errors.push('Nome revendedora ausente');
      quality.erros.camposFaltantes++;
    }

    // 4. Pontos
    const QuantidadePontos = sanitizeNumber(raw.QuantidadePontos, 0);

    // 5. Ciclo
    const ciclo = parseCiclo(raw.CicloCaptacao);
    if (ciclo.index === -1) {
      errors.push('Ciclo inválido ou ausente');
      quality.erros.cicloInvalido++;
    }

    // 6. SKU
    const SKU = normalizeSKU(raw.CodigoProduto);
    if (SKU === 'INVALID') {
      errors.push('SKU inválido ou ausente');
      quality.erros.skuInvalido++;
    }

    // 7. Nome Produto
    const NomeProduto = normalizeNomeProduto(raw.NomeProduto);

    // 8. Tipo
    const Tipo = normalizeTipo(raw.Tipo);

    // 9. Data Captação
    const DataCaptacao = normalizeDataCaptacao(raw.DataCaptacao);

    // 10. Quantidade Itens
    const QuantidadeItens = sanitizeNumber(raw.QuantidadeItens, 0);
    if (raw.QuantidadeItens !== undefined && raw.QuantidadeItens < 0) {
      errors.push('Quantidade negativa');
      quality.erros.valorNegativo++;
    }

    // 11. Valor Praticado
    const ValorPraticado = sanitizeNumber(raw.ValorPraticado, 0);
    if (raw.ValorPraticado !== undefined && raw.ValorPraticado < 0) {
      errors.push('Valor praticado negativo');
      quality.erros.valorNegativo++;
    }

    // 12. Valor Linha Venda (IMPORTANTE: só se Tipo == "Venda")
    const ValorLinhaVenda = Tipo === 'Venda' ? QuantidadeItens * ValorPraticado : 0;

    // 13. Meio Captação
    const MeioCaptacao = normalizeMeioCaptacao(raw['Meio Captacao']);

    // 14. Entrega
    const EntregaCategoria = categorizarEntrega(raw['Tipo Entrega']);

    // 15. Transaction ID
    const TransactionId = generateTransactionId(NomeRevendedora, ciclo.label, DataCaptacao);

    // Criar row normalizada
    const normalizedRow: NormalizedRow = {
      GerenciaCode,
      Setor,
      NomeRevendedora,
      QuantidadePontos,
      CicloLabel: ciclo.label,
      CicloIndex: ciclo.index,
      SKU,
      NomeProduto,
      Tipo,
      DataCaptacao,
      QuantidadeItens,
      ValorPraticado,
      ValorLinhaVenda,
      MeioCaptacao,
      EntregaCategoria,
      TransactionId,
      _rowIndex: index,
      _hasErrors: errors.length > 0,
      _errors: errors,
    };

    normalized.push(normalizedRow);

    if (errors.length > 0) {
      quality.linhasComErro++;
    } else {
      quality.linhasValidas++;
    }
  });

  quality.percentualValidas = (quality.linhasValidas / quality.totalLinhas) * 100;

  // Adicionar avisos
  if (quality.erros.gerenciaInvalida > 0) {
    quality.avisos.push(
      `${quality.erros.gerenciaInvalida} linhas com gerência inválida ou ausente`
    );
  }
  if (quality.erros.cicloInvalido > 0) {
    quality.avisos.push(`${quality.erros.cicloInvalido} linhas com ciclo inválido ou ausente`);
  }
  if (quality.erros.skuInvalido > 0) {
    quality.avisos.push(`${quality.erros.skuInvalido} linhas com SKU inválido ou ausente`);
  }
  if (quality.erros.valorNegativo > 0) {
    quality.avisos.push(
      `${quality.erros.valorNegativo} linhas com valores negativos (foram ajustados para 0)`
    );
  }

  return { normalized, quality };
}

/**
 * Aplica filtros aos dados normalizados
 */
export function applyFilters(
  data: NormalizedRow[],
  filters: {
    gerenciaCodes?: string[];
    setores?: string[];
    ciclos?: string[];
    meiosCaptacao?: string[];
    entregaCategorias?: ('FRETE' | 'RETIRADA' | 'UNKNOWN')[];
    searchRevendedora?: string;
    searchProduto?: string;
  }
): NormalizedRow[] {
  return data.filter((row) => {
    // Gerência
    if (filters.gerenciaCodes && filters.gerenciaCodes.length > 0) {
      if (!filters.gerenciaCodes.includes(row.GerenciaCode)) return false;
    }

    // Setor
    if (filters.setores && filters.setores.length > 0) {
      if (!filters.setores.includes(row.Setor)) return false;
    }

    // Ciclos
    if (filters.ciclos && filters.ciclos.length > 0) {
      if (!filters.ciclos.includes(row.CicloLabel)) return false;
    }

    // Meio Captação
    if (filters.meiosCaptacao && filters.meiosCaptacao.length > 0) {
      if (!filters.meiosCaptacao.includes(row.MeioCaptacao)) return false;
    }

    // Entrega
    if (filters.entregaCategorias && filters.entregaCategorias.length > 0) {
      if (!filters.entregaCategorias.includes(row.EntregaCategoria)) return false;
    }

    // Search Revendedora
    if (filters.searchRevendedora) {
      const search = filters.searchRevendedora.toUpperCase();
      if (!row.NomeRevendedora.includes(search)) return false;
    }

    // Search Produto
    if (filters.searchProduto) {
      const search = filters.searchProduto.toUpperCase();
      if (
        !row.NomeProduto.toUpperCase().includes(search) &&
        !row.SKU.includes(filters.searchProduto)
      ) {
        return false;
      }
    }

    return true;
  });
}
