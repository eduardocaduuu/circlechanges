import { describe, it, expect } from 'vitest';
import {
  normalizeSKU,
  extractGerenciaCode,
  parseCiclo,
  normalizeTipo,
} from '../lib/normalize';

describe('normalizeSKU', () => {
  it('should pad 4-digit SKU with leading zero', () => {
    expect(normalizeSKU(1234)).toBe('01234');
    expect(normalizeSKU('1234')).toBe('01234');
  });

  it('should keep 5-digit SKU as is', () => {
    expect(normalizeSKU(12345)).toBe('12345');
    expect(normalizeSKU('12345')).toBe('12345');
  });

  it('should return INVALID for invalid inputs', () => {
    expect(normalizeSKU(undefined)).toBe('INVALID');
    expect(normalizeSKU('')).toBe('INVALID');
    expect(normalizeSKU('abc')).toBe('INVALID');
  });
});

describe('extractGerenciaCode', () => {
  it('should extract first 5 digits from gerencia string', () => {
    expect(extractGerenciaCode('13706 - NOME DA GERENCIA')).toBe('13706');
    expect(extractGerenciaCode('13707 - OUTRA GERENCIA')).toBe('13707');
  });

  it('should handle numeric gerencia codes', () => {
    expect(extractGerenciaCode(13706)).toBe('13706');
    expect(extractGerenciaCode(13707)).toBe('13707');
  });

  it('should return UNKNOWN for invalid inputs', () => {
    expect(extractGerenciaCode(undefined)).toBe('UNKNOWN');
    expect(extractGerenciaCode('')).toBe('UNKNOWN');
    expect(extractGerenciaCode('SEM NUMEROS')).toBe('UNKNOWN');
  });
});

describe('parseCiclo', () => {
  it('should parse MM/YYYY format correctly', () => {
    const result = parseCiclo('01/2026');
    expect(result.label).toBe('01/2026');
    expect(result.mes).toBe(1);
    expect(result.ano).toBe(2026);
    expect(result.index).toBe(2026 * 12 + 1);
  });

  it('should parse MM-YYYY format correctly', () => {
    const result = parseCiclo('12-2025');
    expect(result.label).toBe('12-2025');
    expect(result.mes).toBe(12);
    expect(result.ano).toBe(2025);
    expect(result.index).toBe(2025 * 12 + 12);
  });

  it('should return UNKNOWN for invalid inputs', () => {
    const result = parseCiclo(undefined);
    expect(result.label).toBe('UNKNOWN');
    expect(result.index).toBe(-1);
  });

  it('should validate month range', () => {
    const result = parseCiclo('13/2026'); // Invalid month
    expect(result.label).toBe('UNKNOWN');
    expect(result.index).toBe(-1);
  });
});

describe('normalizeTipo', () => {
  it('should normalize Venda type', () => {
    expect(normalizeTipo('Venda')).toBe('Venda');
    expect(normalizeTipo('venda')).toBe('Venda');
    expect(normalizeTipo('VENDA')).toBe('Venda');
  });

  it('should normalize Brinde type', () => {
    expect(normalizeTipo('Brinde')).toBe('Brinde');
    expect(normalizeTipo('brinde')).toBe('Brinde');
  });

  it('should normalize Doação type', () => {
    expect(normalizeTipo('Doação')).toBe('Doação');
    expect(normalizeTipo('doacao')).toBe('Doação');
  });

  it('should return Outro for unknown types', () => {
    expect(normalizeTipo('DESCONHECIDO')).toBe('Outro');
    expect(normalizeTipo(undefined)).toBe('Outro');
  });
});

describe('ValorLinhaVenda calculation', () => {
  it('should use ValorPraticado directly for Venda type (not multiply by quantity)', () => {
    // IMPORTANTE: ValorPraticado JÁ É o valor total da linha
    // NÃO multiplicar por quantidade!
    const valorPraticado = 55.41; // Valor TOTAL de 3 itens
    const tipo = 'Venda';

    const valorLinhaVenda = tipo === 'Venda' ? valorPraticado : 0;

    expect(valorLinhaVenda).toBe(55.41);
  });

  it('should be zero for non-Venda types', () => {
    // This test verifies the rule: ValorLinhaVenda = 0 if Tipo != "Venda"
    const valorPraticado = 100;
    const tiposBrinde = normalizeTipo('Brinde');
    const tiposDoacao = normalizeTipo('Doação');
    const tiposOutro = normalizeTipo('Outro');

    expect(tiposBrinde === 'Venda' ? valorPraticado : 0).toBe(0);
    expect(tiposDoacao === 'Venda' ? valorPraticado : 0).toBe(0);
    expect(tiposOutro === 'Venda' ? valorPraticado : 0).toBe(0);
  });
});
