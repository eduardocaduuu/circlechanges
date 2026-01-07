import { z } from 'zod';

// ============================================================================
// RAW DATA SCHEMAS (da planilha Excel)
// ============================================================================

export const RawRowSchema = z.object({
  Gerencia: z.string().optional(),
  Setor: z.string().optional(),
  CodigoRevendedora: z.union([z.string(), z.number()]).optional(),
  NomeRevendedora: z.string().optional(),
  QuantidadePontos: z.number().optional(),
  CicloCaptacao: z.string().optional(),
  CicloFaturamento: z.string().optional(),
  CodigoProduto: z.union([z.string(), z.number()]).optional(),
  NomeProduto: z.string().optional(),
  Tipo: z.string().optional(),
  DataCaptacao: z.union([z.string(), z.date()]).optional(),
  QuantidadeItens: z.number().optional(),
  Faturamento: z.number().optional(),
  ValorPraticado: z.number().optional(),
  ValorVenda: z.number().optional(),
  'Meio Captacao': z.string().optional(),
  'Tipo Entrega': z.string().optional(),
});

export type RawRow = z.infer<typeof RawRowSchema>;

// ============================================================================
// NORMALIZED DATA (após limpeza e transformação)
// ============================================================================

export interface NormalizedRow {
  // Identificação
  GerenciaCode: string; // 5 dígitos extraídos ou "UNKNOWN"
  Setor: string;
  NomeRevendedora: string; // Normalizado: trim, uppercase, sem espaços duplos

  // Métricas do cliente
  QuantidadePontos: number; // 0 se NaN

  // Ciclo
  CicloLabel: string; // Original "MM/YYYY" ou "UNKNOWN"
  CicloIndex: number; // Para ordenação (YYYY*12 + MM), -1 se UNKNOWN

  // Produto
  SKU: string; // 5 dígitos padronizados ou "INVALID"
  NomeProduto: string; // Normalizado

  // Tipo de transação
  Tipo: 'Venda' | 'Brinde' | 'Doação' | 'Outro';

  // Data (para agrupar transações)
  DataCaptacao: string | null; // "YYYY-MM-DD" ou null

  // Quantidades e valores
  QuantidadeItens: number; // >= 0 (quantidade de itens)
  ValorPraticado: number; // >= 0 (ATENÇÃO: já é o valor TOTAL da linha, não unitário!)
  ValorLinhaVenda: number; // ValorPraticado se Tipo == "Venda", senão 0 (NÃO multiplicar por qty!)

  // Canal e logística
  MeioCaptacao: string; // Normalizado
  EntregaCategoria: 'FRETE' | 'RETIRADA' | 'UNKNOWN';

  // ID da transação para market basket
  TransactionId: string; // NomeRevendedora + CicloLabel + DataCaptacao (ou sem data)

  // Rastreabilidade
  _rowIndex: number; // Índice da linha original
  _hasErrors: boolean; // Se teve erros na normalização
  _errors: string[]; // Lista de erros encontrados
}

// ============================================================================
// FILTROS
// ============================================================================

export interface Filters {
  gerenciaCodes: string[];
  setores: string[];
  ciclos: string[];
  meiosCaptacao: string[];
  entregaCategorias: ('FRETE' | 'RETIRADA' | 'UNKNOWN')[];
  searchRevendedora: string;
  searchProduto: string;
  incluirBrindesDoacao: boolean; // Toggle para incluir Brinde/Doação em análises
}

// ============================================================================
// MÉTRICAS AGREGADAS
// ============================================================================

export interface OverviewMetrics {
  receitaTotal: number; // Soma ValorLinhaVenda (só Venda)
  ticketMedioPorCompra: number;
  ticketMedioPorCliente: number;
  itensVendidos: number; // Soma QuantidadeItens (só Venda ou com toggle)
  pontosTotais: number;
  numeroTransacoes: number;
  numeroClientes: number;
  numeroSKUs: number;
}

export interface ProductRanking {
  SKU: string;
  NomeProduto: string;
  quantidade: number;
  receita: number;
  numeroTransacoes: number;
  numeroClientes: number;
}

export interface ClientMetrics {
  NomeRevendedora: string;
  GerenciaCode: string;
  Setor: string;

  // Frequência
  numeroTransacoes: number;
  numeroCiclosAtivos: number;

  // Volume
  itensComprados: number;
  receitaTotal: number;

  // Valor
  ticketMedioPorCompra: number;
  ticketMedioPorCiclo: number;

  // Mix
  numeroSKUsDistintos: number;

  // Logística
  percentualFrete: number;
  percentualRetirada: number;

  // Canal
  canalPrincipal: string;
  percentualCanalPrincipal: number;

  // Pontos
  pontosTotais: number;

  // Segmentação
  score: number;
  segmento: ClientSegment;
}

export type ClientSegment =
  | 'VIP'
  | 'Potencial'
  | 'Ocasional'
  | 'Caçador de Promo'
  | 'Logística Sensível'
  | 'Novo';

// ============================================================================
// MARKET BASKET
// ============================================================================

export interface BasketPair {
  itemA: string; // SKU
  itemB: string; // SKU
  nomeA: string;
  nomeB: string;
  suporte: number; // freq(A∪B) / numTransações
  confianca: number; // suporte(A∪B) / suporte(A)
  lift: number; // confiança / suporte(B)
  occurrences: number; // Número de vezes que aparecem juntos
}

export interface BasketTransaction {
  transactionId: string;
  items: string[]; // Array de SKUs
  NomeRevendedora: string;
  CicloLabel: string;
  DataCaptacao: string | null;
}

// ============================================================================
// PREVISÕES
// ============================================================================

export interface Prediction {
  SKU: string;
  NomeProduto: string;
  historico: {
    ciclo: string;
    cicloDeux: number;
    quantidade: number;
  }[];
  previsaoProximoCiclo: number;
  tendencia: 'crescimento' | 'estável' | 'declínio';
  confianca: 'alta' | 'média' | 'baixa'; // Baseado em R² ou MAE
  erro: number; // MAE
}

// ============================================================================
// DATA QUALITY
// ============================================================================

export interface DataQuality {
  totalLinhas: number;
  linhasValidas: number;
  linhasComErro: number;
  percentualValidas: number;

  erros: {
    gerenciaInvalida: number;
    cicloInvalido: number;
    skuInvalido: number;
    valorNegativo: number;
    camposFaltantes: number;
  };

  avisos: string[];
}

// ============================================================================
// CICLO INFO
// ============================================================================

export interface CicloInfo {
  label: string;
  index: number;
  mes: number;
  ano: number;
}

// ============================================================================
// EXPORT
// ============================================================================

export interface ExportData {
  timestamp: string;
  filtrosAplicados: Filters;
  metricas: OverviewMetrics;
  topProdutos: ProductRanking[];
  topPares: BasketPair[];
  segmentos: {
    [key in ClientSegment]: number;
  };
}
