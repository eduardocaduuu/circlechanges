import type { NormalizedRow, BasketPair, BasketTransaction } from '@/types';

/**
 * Gera transações (cestas) a partir dos dados normalizados
 */
export function generateBaskets(
  data: NormalizedRow[],
  incluirBrindesDoacao = false
): BasketTransaction[] {
  const dataParaAnalise = incluirBrindesDoacao ? data : data.filter((r) => r.Tipo === 'Venda');

  const basketMap = new Map<
    string,
    {
      transactionId: string;
      items: Set<string>;
      NomeRevendedora: string;
      CicloLabel: string;
      DataCaptacao: string | null;
    }
  >();

  dataParaAnalise.forEach((r) => {
    if (r.SKU === 'INVALID') return;

    const existing = basketMap.get(r.TransactionId);

    if (existing) {
      existing.items.add(r.SKU);
    } else {
      basketMap.set(r.TransactionId, {
        transactionId: r.TransactionId,
        items: new Set([r.SKU]),
        NomeRevendedora: r.NomeRevendedora,
        CicloLabel: r.CicloLabel,
        DataCaptacao: r.DataCaptacao,
      });
    }
  });

  return Array.from(basketMap.values()).map((b) => ({
    transactionId: b.transactionId,
    items: Array.from(b.items),
    NomeRevendedora: b.NomeRevendedora,
    CicloLabel: b.CicloLabel,
    DataCaptacao: b.DataCaptacao,
  }));
}

/**
 * Calcula pares frequentes com suporte, confiança e lift
 */
export function calculateFrequentPairs(
  baskets: BasketTransaction[],
  data: NormalizedRow[],
  minSupport = 0.001 // 0.1% mínimo
): BasketPair[] {
  if (baskets.length === 0) return [];

  // Criar mapa de SKU -> Nome
  const skuNomes = new Map<string, string>();
  data.forEach((r) => {
    if (r.SKU !== 'INVALID' && !skuNomes.has(r.SKU)) {
      skuNomes.set(r.SKU, r.NomeProduto);
    }
  });

  const totalBaskets = baskets.length;

  // 1. Calcular suporte individual de cada item
  const itemSupport = new Map<string, number>();
  baskets.forEach((basket) => {
    const uniqueItems = new Set(basket.items);
    uniqueItems.forEach((item) => {
      itemSupport.set(item, (itemSupport.get(item) || 0) + 1);
    });
  });

  // 2. Gerar todos os pares possíveis e calcular ocorrências
  const pairOccurrences = new Map<string, number>();

  baskets.forEach((basket) => {
    const uniqueItems = Array.from(new Set(basket.items)).sort();

    // Gerar pares (combinações de 2)
    for (let i = 0; i < uniqueItems.length; i++) {
      for (let j = i + 1; j < uniqueItems.length; j++) {
        const itemA = uniqueItems[i];
        const itemB = uniqueItems[j];
        const pairKey = `${itemA}|${itemB}`;

        pairOccurrences.set(pairKey, (pairOccurrences.get(pairKey) || 0) + 1);
      }
    }
  });

  // 3. Calcular métricas para cada par
  const pairs: BasketPair[] = [];

  pairOccurrences.forEach((occurrences, pairKey) => {
    const [itemA, itemB] = pairKey.split('|');

    const supportAB = occurrences / totalBaskets;

    // Filtrar por suporte mínimo
    if (supportAB < minSupport) return;

    const supportA = (itemSupport.get(itemA) || 0) / totalBaskets;
    const supportB = (itemSupport.get(itemB) || 0) / totalBaskets;

    // Confiança: P(B|A) = suporte(A∪B) / suporte(A)
    const confianca = supportA > 0 ? supportAB / supportA : 0;

    // Lift: confiança / suporte(B)
    const lift = supportB > 0 ? confianca / supportB : 0;

    pairs.push({
      itemA,
      itemB,
      nomeA: skuNomes.get(itemA) || 'UNKNOWN',
      nomeB: skuNomes.get(itemB) || 'UNKNOWN',
      suporte: supportAB,
      confianca,
      lift,
      occurrences,
    });
  });

  // Ordenar por lift (descendente) e depois por suporte
  return pairs.sort((a, b) => {
    if (Math.abs(b.lift - a.lift) > 0.01) {
      return b.lift - a.lift;
    }
    return b.suporte - a.suporte;
  });
}

/**
 * Sugere produtos complementares para um SKU específico
 */
export function suggestComplementaryProducts(
  sku: string,
  pairs: BasketPair[],
  topN = 10
): BasketPair[] {
  // Filtrar pares onde o SKU aparece (como A ou B)
  const relevantPairs = pairs.filter((p) => p.itemA === sku || p.itemB === sku);

  // Normalizar para que o SKU fornecido seja sempre itemA
  const normalizedPairs = relevantPairs.map((p) => {
    if (p.itemB === sku) {
      // Trocar A e B
      return {
        ...p,
        itemA: p.itemB,
        itemB: p.itemA,
        nomeA: p.nomeB,
        nomeB: p.nomeA,
      };
    }
    return p;
  });

  // Ordenar por lift e confiança
  return normalizedPairs
    .sort((a, b) => {
      if (Math.abs(b.lift - a.lift) > 0.1) {
        return b.lift - a.lift;
      }
      return b.confianca - a.confianca;
    })
    .slice(0, topN);
}

/**
 * Calcula métricas de basket para análise
 */
export function calculateBasketMetrics(baskets: BasketTransaction[]) {
  if (baskets.length === 0) {
    return {
      mediaItensPorCesta: 0,
      medianaItensPorCesta: 0,
      maiorCesta: 0,
      menorCesta: 0,
      cestasUnitarias: 0,
      percentualCestasUnitarias: 0,
    };
  }

  const tamanhos = baskets.map((b) => b.items.length).sort((a, b) => a - b);

  const soma = tamanhos.reduce((a, b) => a + b, 0);
  const mediaItensPorCesta = soma / tamanhos.length;

  const meio = Math.floor(tamanhos.length / 2);
  const medianaItensPorCesta =
    tamanhos.length % 2 === 0 ? (tamanhos[meio - 1] + tamanhos[meio]) / 2 : tamanhos[meio];

  const maiorCesta = Math.max(...tamanhos);
  const menorCesta = Math.min(...tamanhos);

  const cestasUnitarias = tamanhos.filter((t) => t === 1).length;
  const percentualCestasUnitarias = (cestasUnitarias / tamanhos.length) * 100;

  return {
    mediaItensPorCesta,
    medianaItensPorCesta,
    maiorCesta,
    menorCesta,
    cestasUnitarias,
    percentualCestasUnitarias,
  };
}

/**
 * Encontra produtos frequentemente comprados por um segmento específico
 */
export function findSegmentProducts(
  baskets: BasketTransaction[],
  clientSegments: Map<string, string>,
  targetSegment: string,
  data: NormalizedRow[]
): { SKU: string; NomeProduto: string; frequencia: number; exclusividade: number }[] {
  // Filtrar baskets do segmento alvo
  const segmentBaskets = baskets.filter((b) => clientSegments.get(b.NomeRevendedora) === targetSegment);

  if (segmentBaskets.length === 0) return [];

  // Contar SKUs no segmento
  const skuCountSegment = new Map<string, number>();
  segmentBaskets.forEach((b) => {
    b.items.forEach((sku) => {
      skuCountSegment.set(sku, (skuCountSegment.get(sku) || 0) + 1);
    });
  });

  // Contar SKUs fora do segmento
  const otherBaskets = baskets.filter((b) => clientSegments.get(b.NomeRevendedora) !== targetSegment);
  const skuCountOthers = new Map<string, number>();
  otherBaskets.forEach((b) => {
    b.items.forEach((sku) => {
      skuCountOthers.set(sku, (skuCountOthers.get(sku) || 0) + 1);
    });
  });

  // Nome dos produtos
  const skuNomes = new Map<string, string>();
  data.forEach((r) => {
    if (r.SKU !== 'INVALID' && !skuNomes.has(r.SKU)) {
      skuNomes.set(r.SKU, r.NomeProduto);
    }
  });

  // Calcular frequência e exclusividade
  const produtos = Array.from(skuCountSegment.entries()).map(([sku, countSegment]) => {
    const countOthers = skuCountOthers.get(sku) || 0;
    const totalCount = countSegment + countOthers;

    const frequencia = countSegment / segmentBaskets.length;
    const exclusividade = totalCount > 0 ? countSegment / totalCount : 0;

    return {
      SKU: sku,
      NomeProduto: skuNomes.get(sku) || 'UNKNOWN',
      frequencia,
      exclusividade,
    };
  });

  // Ordenar por exclusividade e frequência
  return produtos.sort((a, b) => {
    if (Math.abs(b.exclusividade - a.exclusividade) > 0.1) {
      return b.exclusividade - a.exclusividade;
    }
    return b.frequencia - a.frequencia;
  });
}
