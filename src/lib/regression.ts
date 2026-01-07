import type { NormalizedRow, Prediction } from '@/types';

/**
 * Implementação simples de regressão linear usando mínimos quadrados
 */
class LinearRegression {
  slope = 0;
  intercept = 0;
  r2 = 0;

  /**
   * Treina o modelo com dados (x, y)
   */
  fit(x: number[], y: number[]) {
    if (x.length !== y.length || x.length === 0) {
      throw new Error('Arrays devem ter o mesmo tamanho e não estar vazios');
    }

    const n = x.length;

    // Calcular médias
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    // Calcular slope e intercept
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (y[i] - meanY);
      denominator += (x[i] - meanX) ** 2;
    }

    this.slope = denominator !== 0 ? numerator / denominator : 0;
    this.intercept = meanY - this.slope * meanX;

    // Calcular R²
    const predictions = x.map((xi) => this.predict(xi));
    const ssRes = y.reduce((sum, yi, i) => sum + (yi - predictions[i]) ** 2, 0);
    const ssTot = y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);

    this.r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
  }

  /**
   * Prediz y para um valor x
   */
  predict(x: number): number {
    return this.slope * x + this.intercept;
  }

  /**
   * Calcula Mean Absolute Error
   */
  mae(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const errors = x.map((xi, i) => Math.abs(y[i] - this.predict(xi)));
    return errors.reduce((a, b) => a + b, 0) / errors.length;
  }
}

/**
 * Gera previsões de demanda por SKU
 */
export function generatePredictions(
  data: NormalizedRow[],
  incluirBrindesDoacao = false,
  minCiclos = 3
): Prediction[] {
  const dataParaAnalise = incluirBrindesDoacao ? data : data.filter((r) => r.Tipo === 'Venda');

  // Agrupar por SKU e Ciclo
  const skuCicloMap = new Map<
    string,
    Map<
      string,
      {
        cicloLabel: string;
        cicloIndex: number;
        quantidade: number;
        nomeProduto: string;
      }
    >
  >();

  dataParaAnalise.forEach((r) => {
    if (r.SKU === 'INVALID' || r.CicloIndex === -1) return;

    let cicloMap = skuCicloMap.get(r.SKU);

    if (!cicloMap) {
      cicloMap = new Map();
      skuCicloMap.set(r.SKU, cicloMap);
    }

    const existing = cicloMap.get(r.CicloLabel);

    if (existing) {
      existing.quantidade += r.QuantidadeItens;
    } else {
      cicloMap.set(r.CicloLabel, {
        cicloLabel: r.CicloLabel,
        cicloIndex: r.CicloIndex,
        quantidade: r.QuantidadeItens,
        nomeProduto: r.NomeProduto,
      });
    }
  });

  const predictions: Prediction[] = [];

  // Para cada SKU, tentar fazer previsão
  skuCicloMap.forEach((cicloMap, sku) => {
    const historico = Array.from(cicloMap.values()).sort((a, b) => a.cicloIndex - b.cicloIndex);

    // Precisa de pelo menos minCiclos para fazer previsão confiável
    if (historico.length < minCiclos) return;

    // Normalizar índices de ciclo para começar em 0
    const minIndex = Math.min(...historico.map((h) => h.cicloIndex));
    const x = historico.map((h) => h.cicloIndex - minIndex);
    const y = historico.map((h) => h.quantidade);

    try {
      // Treinar modelo
      const model = new LinearRegression();
      model.fit(x, y);

      // Prever próximo ciclo
      const proxCicloX = Math.max(...x) + 1;
      let previsaoRaw = model.predict(proxCicloX);

      // Clamp para >= 0
      previsaoRaw = Math.max(0, previsaoRaw);

      // Calcular erro
      const erro = model.mae(x, y);

      // Determinar tendência
      let tendencia: 'crescimento' | 'estável' | 'declínio' = 'estável';
      if (model.slope > y.reduce((a, b) => a + b, 0) / y.length * 0.1) {
        tendencia = 'crescimento';
      } else if (model.slope < -(y.reduce((a, b) => a + b, 0) / y.length * 0.1)) {
        tendencia = 'declínio';
      }

      // Determinar confiança baseado em R²
      let confianca: 'alta' | 'média' | 'baixa' = 'baixa';
      if (model.r2 >= 0.7) {
        confianca = 'alta';
      } else if (model.r2 >= 0.4) {
        confianca = 'média';
      }

      predictions.push({
        SKU: sku,
        NomeProduto: historico[0].nomeProduto,
        historico: historico.map((h) => ({
          ciclo: h.cicloLabel,
          cicloDeux: h.cicloIndex,
          quantidade: h.quantidade,
        })),
        previsaoProximoCiclo: Math.round(previsaoRaw),
        tendencia,
        confianca,
        erro: Math.round(erro * 10) / 10,
      });
    } catch (error) {
      // Ignorar SKUs com erro
      console.error(`Erro ao gerar previsão para SKU ${sku}:`, error);
    }
  });

  // Ordenar por previsão (descendente)
  return predictions.sort((a, b) => b.previsaoProximoCiclo - a.previsaoProximoCiclo);
}

/**
 * Gera previsão para um SKU específico
 */
export function generateSKUPrediction(
  sku: string,
  data: NormalizedRow[],
  incluirBrindesDoacao = false
): Prediction | null {
  const predictions = generatePredictions(data, incluirBrindesDoacao);
  return predictions.find((p) => p.SKU === sku) || null;
}

/**
 * Identifica SKUs com maior crescimento previsto
 */
export function findGrowingProducts(predictions: Prediction[], topN = 10): Prediction[] {
  return predictions
    .filter((p) => p.tendencia === 'crescimento' && p.confianca !== 'baixa')
    .sort((a, b) => {
      // Priorizar confiança alta
      if (a.confianca === 'alta' && b.confianca !== 'alta') return -1;
      if (a.confianca !== 'alta' && b.confianca === 'alta') return 1;

      // Depois por previsão
      return b.previsaoProximoCiclo - a.previsaoProximoCiclo;
    })
    .slice(0, topN);
}

/**
 * Calcula taxa de crescimento médio de um SKU
 */
export function calculateGrowthRate(historico: { ciclo: string; quantidade: number }[]): number {
  if (historico.length < 2) return 0;

  const taxas: number[] = [];

  for (let i = 1; i < historico.length; i++) {
    const anterior = historico[i - 1].quantidade;
    const atual = historico[i].quantidade;

    if (anterior > 0) {
      const taxa = ((atual - anterior) / anterior) * 100;
      taxas.push(taxa);
    }
  }

  if (taxas.length === 0) return 0;

  return taxas.reduce((a, b) => a + b, 0) / taxas.length;
}

/**
 * Gera previsões agregadas por categoria (se aplicável)
 * Neste caso, usamos os primeiros 2 dígitos do SKU como "categoria"
 */
export function generateCategoryPredictions(
  data: NormalizedRow[],
  incluirBrindesDoacao = false,
  minCiclos = 3
): {
  categoria: string;
  historico: { ciclo: string; quantidade: number }[];
  previsaoProximoCiclo: number;
  tendencia: 'crescimento' | 'estável' | 'declínio';
}[] {
  const dataParaAnalise = incluirBrindesDoacao ? data : data.filter((r) => r.Tipo === 'Venda');

  // Agrupar por categoria (primeiros 2 dígitos do SKU) e ciclo
  const categoriaCicloMap = new Map<
    string,
    Map<
      string,
      {
        cicloLabel: string;
        cicloIndex: number;
        quantidade: number;
      }
    >
  >();

  dataParaAnalise.forEach((r) => {
    if (r.SKU === 'INVALID' || r.CicloIndex === -1) return;

    const categoria = r.SKU.substring(0, 2);

    let cicloMap = categoriaCicloMap.get(categoria);

    if (!cicloMap) {
      cicloMap = new Map();
      categoriaCicloMap.set(categoria, cicloMap);
    }

    const existing = cicloMap.get(r.CicloLabel);

    if (existing) {
      existing.quantidade += r.QuantidadeItens;
    } else {
      cicloMap.set(r.CicloLabel, {
        cicloLabel: r.CicloLabel,
        cicloIndex: r.CicloIndex,
        quantidade: r.QuantidadeItens,
      });
    }
  });

  const predictions: {
    categoria: string;
    historico: { ciclo: string; quantidade: number }[];
    previsaoProximoCiclo: number;
    tendencia: 'crescimento' | 'estável' | 'declínio';
  }[] = [];

  categoriaCicloMap.forEach((cicloMap, categoria) => {
    const historico = Array.from(cicloMap.values()).sort((a, b) => a.cicloIndex - b.cicloIndex);

    if (historico.length < minCiclos) return;

    const minIndex = Math.min(...historico.map((h) => h.cicloIndex));
    const x = historico.map((h) => h.cicloIndex - minIndex);
    const y = historico.map((h) => h.quantidade);

    try {
      const model = new LinearRegression();
      model.fit(x, y);

      const proxCicloX = Math.max(...x) + 1;
      let previsaoRaw = model.predict(proxCicloX);
      previsaoRaw = Math.max(0, previsaoRaw);

      let tendencia: 'crescimento' | 'estável' | 'declínio' = 'estável';
      const mediaDemanda = y.reduce((a, b) => a + b, 0) / y.length;
      if (model.slope > mediaDemanda * 0.1) {
        tendencia = 'crescimento';
      } else if (model.slope < -mediaDemanda * 0.1) {
        tendencia = 'declínio';
      }

      predictions.push({
        categoria,
        historico: historico.map((h) => ({
          ciclo: h.cicloLabel,
          quantidade: h.quantidade,
        })),
        previsaoProximoCiclo: Math.round(previsaoRaw),
        tendencia,
      });
    } catch (error) {
      console.error(`Erro ao gerar previsão para categoria ${categoria}:`, error);
    }
  });

  return predictions.sort((a, b) => b.previsaoProximoCiclo - a.previsaoProximoCiclo);
}
