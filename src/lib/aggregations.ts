import type {
  NormalizedRow,
  OverviewMetrics,
  ProductRanking,
  ClientMetrics,
  ClientSegment,
} from '@/types';

/**
 * Calcula métricas gerais (Overview)
 */
export function calculateOverviewMetrics(
  data: NormalizedRow[],
  incluirBrindesDoacao = false
): OverviewMetrics {
  // Filtrar dados conforme toggle
  const dataParaAnalise = incluirBrindesDoacao ? data : data.filter((r) => r.Tipo === 'Venda');

  // Receita total (sempre só Venda)
  const receitaTotal = data
    .filter((r) => r.Tipo === 'Venda')
    .reduce((sum, r) => sum + r.ValorLinhaVenda, 0);

  // Itens vendidos
  const itensVendidos = dataParaAnalise.reduce((sum, r) => sum + r.QuantidadeItens, 0);

  // Transações únicas
  const transacoesUnicas = new Set(data.map((r) => r.TransactionId));
  const numeroTransacoes = transacoesUnicas.size;

  // Clientes únicos
  const clientesUnicos = new Set(data.map((r) => r.NomeRevendedora));
  const numeroClientes = clientesUnicos.size;

  // SKUs únicos
  const skusUnicos = new Set(dataParaAnalise.filter((r) => r.SKU !== 'INVALID').map((r) => r.SKU));
  const numeroSKUs = skusUnicos.size;

  // Pontos totais (soma por cliente+ciclo para evitar duplicação)
  const pontosPorClienteCiclo = new Map<string, number>();
  data.forEach((r) => {
    const key = `${r.NomeRevendedora}|${r.CicloLabel}`;
    const current = pontosPorClienteCiclo.get(key) || 0;
    pontosPorClienteCiclo.set(key, Math.max(current, r.QuantidadePontos));
  });
  const pontosTotais = Array.from(pontosPorClienteCiclo.values()).reduce((sum, p) => sum + p, 0);

  // Ticket médio por compra
  const receitaPorTransacao = new Map<string, number>();
  data
    .filter((r) => r.Tipo === 'Venda')
    .forEach((r) => {
      const current = receitaPorTransacao.get(r.TransactionId) || 0;
      receitaPorTransacao.set(r.TransactionId, current + r.ValorLinhaVenda);
    });

  const tickets = Array.from(receitaPorTransacao.values());
  const ticketMedioPorCompra = tickets.length > 0 ? tickets.reduce((a, b) => a + b, 0) / tickets.length : 0;

  // Ticket médio por cliente
  const receitaPorCliente = new Map<string, number>();
  data
    .filter((r) => r.Tipo === 'Venda')
    .forEach((r) => {
      const current = receitaPorCliente.get(r.NomeRevendedora) || 0;
      receitaPorCliente.set(r.NomeRevendedora, current + r.ValorLinhaVenda);
    });

  const receitasClientes = Array.from(receitaPorCliente.values());
  const ticketMedioPorCliente =
    receitasClientes.length > 0 ? receitasClientes.reduce((a, b) => a + b, 0) / receitasClientes.length : 0;

  return {
    receitaTotal,
    ticketMedioPorCompra,
    ticketMedioPorCliente,
    itensVendidos,
    pontosTotais,
    numeroTransacoes,
    numeroClientes,
    numeroSKUs,
  };
}

/**
 * Calcula ranking de produtos
 */
export function calculateProductRanking(
  data: NormalizedRow[],
  incluirBrindesDoacao = false
): ProductRanking[] {
  const dataParaAnalise = incluirBrindesDoacao ? data : data.filter((r) => r.Tipo === 'Venda');

  const produtoMap = new Map<
    string,
    {
      SKU: string;
      NomeProduto: string;
      quantidade: number;
      receita: number;
      transacoes: Set<string>;
      clientes: Set<string>;
    }
  >();

  dataParaAnalise.forEach((r) => {
    if (r.SKU === 'INVALID') return;

    const existing = produtoMap.get(r.SKU);

    if (existing) {
      existing.quantidade += r.QuantidadeItens;
      existing.receita += r.Tipo === 'Venda' ? r.ValorLinhaVenda : 0;
      existing.transacoes.add(r.TransactionId);
      existing.clientes.add(r.NomeRevendedora);
    } else {
      produtoMap.set(r.SKU, {
        SKU: r.SKU,
        NomeProduto: r.NomeProduto,
        quantidade: r.QuantidadeItens,
        receita: r.Tipo === 'Venda' ? r.ValorLinhaVenda : 0,
        transacoes: new Set([r.TransactionId]),
        clientes: new Set([r.NomeRevendedora]),
      });
    }
  });

  return Array.from(produtoMap.values())
    .map((p) => ({
      SKU: p.SKU,
      NomeProduto: p.NomeProduto,
      quantidade: p.quantidade,
      receita: p.receita,
      numeroTransacoes: p.transacoes.size,
      numeroClientes: p.clientes.size,
    }))
    .sort((a, b) => b.receita - a.receita);
}

/**
 * Calcula métricas por cliente
 */
export function calculateClientMetrics(
  data: NormalizedRow[],
  incluirBrindesDoacao = false
): ClientMetrics[] {
  const dataParaAnalise = incluirBrindesDoacao ? data : data.filter((r) => r.Tipo === 'Venda');

  const clienteMap = new Map<
    string,
    {
      NomeRevendedora: string;
      GerenciaCode: string;
      Setor: string;
      transacoes: Set<string>;
      ciclos: Set<string>;
      itens: number;
      receita: number;
      skus: Set<string>;
      entregas: { FRETE: number; RETIRADA: number; UNKNOWN: number };
      canais: Map<string, number>;
      pontos: number;
    }
  >();

  // Agregar dados
  data.forEach((r) => {
    const existing = clienteMap.get(r.NomeRevendedora);

    if (existing) {
      existing.transacoes.add(r.TransactionId);
      existing.ciclos.add(r.CicloLabel);
      existing.itens += incluirBrindesDoacao ? r.QuantidadeItens : r.Tipo === 'Venda' ? r.QuantidadeItens : 0;
      existing.receita += r.Tipo === 'Venda' ? r.ValorLinhaVenda : 0;
      if (r.SKU !== 'INVALID') existing.skus.add(r.SKU);

      existing.entregas[r.EntregaCategoria]++;

      const canalCount = existing.canais.get(r.MeioCaptacao) || 0;
      existing.canais.set(r.MeioCaptacao, canalCount + 1);

      // Pontos: pegar o máximo por ciclo
      const key = `${r.NomeRevendedora}|${r.CicloLabel}`;
      existing.pontos = Math.max(existing.pontos, r.QuantidadePontos);
    } else {
      const canais = new Map<string, number>();
      canais.set(r.MeioCaptacao, 1);

      clienteMap.set(r.NomeRevendedora, {
        NomeRevendedora: r.NomeRevendedora,
        GerenciaCode: r.GerenciaCode,
        Setor: r.Setor,
        transacoes: new Set([r.TransactionId]),
        ciclos: new Set([r.CicloLabel]),
        itens: incluirBrindesDoacao ? r.QuantidadeItens : r.Tipo === 'Venda' ? r.QuantidadeItens : 0,
        receita: r.Tipo === 'Venda' ? r.ValorLinhaVenda : 0,
        skus: new Set(r.SKU !== 'INVALID' ? [r.SKU] : []),
        entregas: {
          FRETE: r.EntregaCategoria === 'FRETE' ? 1 : 0,
          RETIRADA: r.EntregaCategoria === 'RETIRADA' ? 1 : 0,
          UNKNOWN: r.EntregaCategoria === 'UNKNOWN' ? 1 : 0,
        },
        canais,
        pontos: r.QuantidadePontos,
      });
    }
  });

  // Calcular métricas e scores
  const clientes: ClientMetrics[] = Array.from(clienteMap.values()).map((c) => {
    const numeroTransacoes = c.transacoes.size;
    const numeroCiclosAtivos = c.ciclos.size;
    const itensComprados = c.itens;
    const receitaTotal = c.receita;

    const ticketMedioPorCompra = numeroTransacoes > 0 ? receitaTotal / numeroTransacoes : 0;
    const ticketMedioPorCiclo = numeroCiclosAtivos > 0 ? receitaTotal / numeroCiclosAtivos : 0;

    const numeroSKUsDistintos = c.skus.size;

    const totalEntregas = c.entregas.FRETE + c.entregas.RETIRADA + c.entregas.UNKNOWN;
    const percentualFrete = totalEntregas > 0 ? (c.entregas.FRETE / totalEntregas) * 100 : 0;
    const percentualRetirada = totalEntregas > 0 ? (c.entregas.RETIRADA / totalEntregas) * 100 : 0;

    // Canal principal
    let canalPrincipal = 'UNKNOWN';
    let maxOcorrencias = 0;
    c.canais.forEach((count, canal) => {
      if (count > maxOcorrencias) {
        maxOcorrencias = count;
        canalPrincipal = canal;
      }
    });

    const totalCanais = Array.from(c.canais.values()).reduce((a, b) => a + b, 0);
    const percentualCanalPrincipal = totalCanais > 0 ? (maxOcorrencias / totalCanais) * 100 : 0;

    const pontosTotais = c.pontos;

    return {
      NomeRevendedora: c.NomeRevendedora,
      GerenciaCode: c.GerenciaCode,
      Setor: c.Setor,
      numeroTransacoes,
      numeroCiclosAtivos,
      itensComprados,
      receitaTotal,
      ticketMedioPorCompra,
      ticketMedioPorCiclo,
      numeroSKUsDistintos,
      percentualFrete,
      percentualRetirada,
      canalPrincipal,
      percentualCanalPrincipal,
      pontosTotais,
      score: 0, // Will be calculated next
      segmento: 'Novo' as ClientSegment,
    };
  });

  // Calcular scores e segmentos
  return segmentClients(clientes);
}

/**
 * Segmenta clientes com base em heurísticas
 */
function segmentClients(clientes: ClientMetrics[]): ClientMetrics[] {
  if (clientes.length === 0) return [];

  // Calcular percentis para receita e frequência
  const receitas = clientes.map((c) => c.receitaTotal).sort((a, b) => a - b);
  const frequencias = clientes.map((c) => c.numeroTransacoes).sort((a, b) => a - b);

  const p50Receita = percentile(receitas, 50);
  const p75Receita = percentile(receitas, 75);
  const p90Receita = percentile(receitas, 90);

  const p50Freq = percentile(frequencias, 50);
  const p75Freq = percentile(frequencias, 75);

  return clientes.map((c) => {
    let score = 0;
    let segmento: ClientSegment = 'Novo';

    // Score baseado em receita (0-40)
    if (c.receitaTotal >= p90Receita) score += 40;
    else if (c.receitaTotal >= p75Receita) score += 30;
    else if (c.receitaTotal >= p50Receita) score += 20;
    else score += 10;

    // Score baseado em frequência (0-30)
    if (c.numeroTransacoes >= p75Freq) score += 30;
    else if (c.numeroTransacoes >= p50Freq) score += 20;
    else score += 10;

    // Score baseado em ticket médio (0-20)
    if (c.ticketMedioPorCompra >= p75Receita / p50Freq) score += 20;
    else if (c.ticketMedioPorCompra >= p50Receita / p50Freq) score += 10;

    // Score baseado em mix de produtos (0-10)
    if (c.numeroSKUsDistintos >= 10) score += 10;
    else if (c.numeroSKUsDistintos >= 5) score += 5;

    // Segmentação
    if (c.receitaTotal >= p90Receita && c.numeroTransacoes >= p75Freq) {
      segmento = 'VIP';
    } else if (c.receitaTotal >= p75Receita || c.numeroTransacoes >= p75Freq) {
      segmento = 'Potencial';
    } else if (c.numeroTransacoes < p50Freq && c.numeroCiclosAtivos <= 1) {
      segmento = 'Novo';
    } else if (c.ticketMedioPorCompra < p50Receita / p75Freq && c.itensComprados > p75Freq) {
      segmento = 'Caçador de Promo';
    } else if (c.percentualRetirada >= 80) {
      segmento = 'Logística Sensível';
    } else {
      segmento = 'Ocasional';
    }

    return {
      ...c,
      score,
      segmento,
    };
  });
}

/**
 * Calcula percentil de um array ordenado
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const index = (p / 100) * (arr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (upper >= arr.length) return arr[arr.length - 1];
  return arr[lower] * (1 - weight) + arr[upper] * weight;
}

/**
 * Agrupa dados por ciclo para análise temporal
 */
export function groupByCiclo(data: NormalizedRow[], incluirBrindesDoacao = false) {
  const dataParaAnalise = incluirBrindesDoacao ? data : data.filter((r) => r.Tipo === 'Venda');

  const cicloMap = new Map<
    string,
    {
      ciclo: string;
      index: number;
      receita: number;
      itens: number;
      transacoes: Set<string>;
      clientes: Set<string>;
    }
  >();

  data.forEach((r) => {
    const existing = cicloMap.get(r.CicloLabel);

    if (existing) {
      existing.receita += r.Tipo === 'Venda' ? r.ValorLinhaVenda : 0;
      existing.itens += incluirBrindesDoacao ? r.QuantidadeItens : r.Tipo === 'Venda' ? r.QuantidadeItens : 0;
      existing.transacoes.add(r.TransactionId);
      existing.clientes.add(r.NomeRevendedora);
    } else {
      cicloMap.set(r.CicloLabel, {
        ciclo: r.CicloLabel,
        index: r.CicloIndex,
        receita: r.Tipo === 'Venda' ? r.ValorLinhaVenda : 0,
        itens: incluirBrindesDoacao ? r.QuantidadeItens : r.Tipo === 'Venda' ? r.QuantidadeItens : 0,
        transacoes: new Set([r.TransactionId]),
        clientes: new Set([r.NomeRevendedora]),
      });
    }
  });

  return Array.from(cicloMap.values())
    .map((c) => ({
      ciclo: c.ciclo,
      index: c.index,
      receita: c.receita,
      itens: c.itens,
      numeroTransacoes: c.transacoes.size,
      numeroClientes: c.clientes.size,
    }))
    .sort((a, b) => a.index - b.index);
}
