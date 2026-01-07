# Vendas por Ciclo - Analytics Dashboard

Uma aplicação web de analytics extremamente robusta, moderna e completa para análise de vendas por ciclo. Interface futurista com tema dark e gradientes verdes, rodando 100% no frontend.

![](https://img.shields.io/badge/React-19.2.0-blue)
![](https://img.shields.io/badge/TypeScript-5.9.3-blue)
![](https://img.shields.io/badge/Vite-7.2.4-purple)
![](https://img.shields.io/badge/Tailwind-4.1.18-teal)

## Características Principais

### Analytics Completo
- **Visão Geral**: Métricas consolidadas, gráficos de receita, evolução temporal
- **Clientes**: Segmentação automática (VIP, Potencial, Ocasional, etc.), scoring
- **Produtos**: Rankings por quantidade e receita, análise temporal
- **Market Basket**: Análise de produtos comprados juntos (suporte, confiança, lift)
- **Previsões**: Regressão linear para prever demanda futura por SKU
- **Dados**: Visualização de dados brutos, validação e quality checks

### Processamento Robusto
- Parse e normalização inteligente de planilhas Excel
- Validação completa com Zod
- Tratamento de erros e valores inconsistentes
- Suporte a múltiplos formatos de data e número

### UX Premium
- Interface futurista com tema dark
- Gradientes verdes e efeitos glassmorphism
- Animações suaves com Framer Motion
- Drag-and-drop para upload de arquivos
- Filtros avançados com debounce
- Exportação para CSV e JSON
- Persistência de filtros no LocalStorage

### Performance
- Processamento client-side otimizado
- Suporta milhares de linhas
- Agregações memoizadas
- Renderização eficiente com React

## Como Usar

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação

```bash
# Clone o repositório
git clone https://github.com/eduardocaduuu/circlechanges.git
cd circlechanges

# Instale as dependências
npm install

# Execute em modo de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

### Upload de Dados

A planilha Excel deve conter as seguintes colunas:

**Essenciais:**
- `CicloCaptacao` - Ciclo no formato MM/YYYY
- `CodigoProduto` - SKU do produto (4 ou 5 dígitos)
- `NomeProduto` - Nome do produto
- `Tipo` - Tipo da transação: "Venda", "Brinde" ou "Doação"
- `QuantidadeItens` - Quantidade de itens
- `ValorPraticado` - Valor TOTAL da linha (não é unitário!)
- `Meio Captacao` - Canal de venda
- `Tipo Entrega` - Tipo de entrega

**Identificação do Cliente (precisa de pelo menos uma):**
- `NomeRevendedora` - Nome do cliente/revendedor (preferencial)
- `CodigoRevendedora` - Código único do revendedor (usado como fallback)

**Opcionais (mas recomendadas):**
- `Gerencia` - Código da gerência (aceita número 13706 ou string "13706 - NOME")
- `Setor` - Nome do setor
- `QuantidadePontos` - Pontos acumulados
- `DataCaptacao` - Data da transação (usado para agrupar cestas no Market Basket)

**Ignoradas (não utilizadas):**
- `CicloFaturamento` - Ciclo de faturamento
- `Faturamento` - Valor de faturamento
- `ValorVenda` - Valor de venda

### Regras de Negócio Importantes

#### 1. Cálculo de Valores
- **Somente** transações com `Tipo = "Venda"` entram em cálculos monetários
- Para `Tipo != "Venda"`, `ValorLinhaVenda = 0`
- **IMPORTANTE:** `ValorPraticado` JÁ É o valor TOTAL da linha (não é unitário!)
- `ValorLinhaVenda = ValorPraticado` (se Tipo == Venda, **NÃO multiplicar** por quantidade)

#### 2. Normalização de Dados
- **GerenciaCode**: Extraí dos primeiros 5 dígitos da coluna Gerencia (aceita string ou número)
- **SKU**: Padronizado para 5 dígitos com zeros à esquerda
- **CicloCaptacao**: Parseado para MM/YYYY com validação
- **NomeRevendedora**: Se ausente, usa `CLIENTE_{CodigoRevendedora}` como fallback
- **Meio Captacao**: Normalizado (hífens e espaços consistentes)
- **Tipo Entrega**: Categorizado em FRETE/RETIRADA/UNKNOWN

#### 3. Market Basket (Transações)
Sem ID de pedido explícito, transações são agrupadas por:
- `NomeRevendedora + CicloLabel + DataCaptacao` (se data disponível)
- `NomeRevendedora + CicloLabel` (sem data)

#### 4. Segmentação de Clientes
Clientes são classificados automaticamente em:
- **VIP**: Alta receita + alta frequência
- **Potencial**: Média/alta receita ou alta frequência
- **Ocasional**: Baixa frequência
- **Caçador de Promo**: Ticket baixo, muitos itens
- **Logística Sensível**: Prefere retirada (>80%)
- **Novo**: Poucos ciclos ativos

#### 5. Previsões
- Requer mínimo 3 ciclos com dados
- Usa regressão linear simples (mínimos quadrados)
- Previsão clamped para >= 0
- Confiança baseada em R² (alta >= 0.7, média >= 0.4)

### Filtros Disponíveis

- **Gerência**: Multi-seleção de códigos de gerência
- **Setor**: Multi-seleção de setores
- **Ciclo**: Multi-seleção de ciclos
- **Meio Captação**: Multi-seleção de canais
- **Tipo Entrega**: FRETE/RETIRADA
- **Busca Revendedora**: Busca textual (com debounce)
- **Busca Produto**: Busca por nome ou SKU (com debounce)
- **Toggle Brinde/Doação**: Incluir ou excluir na contagem

## Stack Tecnológica

### Core
- **React 19.2** - Framework UI
- **TypeScript 5.9** - Type safety
- **Vite 7.2** - Build tool
- **Zustand 5.0** - State management

### UI
- **Tailwind CSS 4.1** - Styling
- **Lucide React** - Icons
- **Framer Motion 12.24** - Animations
- **Recharts 3.6** - Charts

### Data Processing
- **SheetJS (xlsx) 0.18** - Excel parsing
- **Zod 4.3** - Schema validation

### Testing
- **Vitest 4.0** - Test runner
- **Testing Library** - Component testing

## Estrutura do Projeto

```
src/
├── components/        # Componentes reutilizáveis
│   ├── FileUpload.tsx
│   ├── FiltersBar.tsx
│   └── TabNavigation.tsx
├── views/             # Views por aba
│   ├── OverviewView.tsx
│   ├── ClientsView.tsx
│   ├── ProductsView.tsx
│   ├── BasketView.tsx
│   ├── PredictionsView.tsx
│   └── DataView.tsx
├── lib/               # Lógica de negócio
│   ├── parseExcel.ts       # Parse e normalização
│   ├── normalize.ts        # Funções de normalização
│   ├── aggregations.ts     # Agregações e métricas
│   ├── marketBasket.ts     # Market basket analysis
│   ├── regression.ts       # Regressão linear
│   ├── formatters.ts       # Formatação e utilidades
│   └── store.ts            # Zustand store
├── types/             # TypeScript types
│   └── index.ts
├── test/              # Testes
│   ├── setup.ts
│   └── normalize.test.ts
├── styles/
│   └── index.css      # Estilos globais
├── App.tsx            # App principal
└── main.tsx           # Entry point
```

## Testes

```bash
# Rodar testes
npm test

# Rodar testes com UI
npm run test:ui

# Coverage
npm test -- --coverage
```

### Casos de Teste

Testes unitários implementados para:
- ✅ Normalização de SKU (4 dígitos -> 5 com zero)
- ✅ Extração de GerenciaCode
- ✅ Parse de Ciclo MM/YYYY
- ✅ Normalização de Tipo
- ✅ Regra ValorLinhaVenda (Venda vs não-Venda)

## Deploy

### Render (Static Site)

1. Build o projeto:
```bash
npm run build
```

2. Configure no Render:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

3. A aplicação está pronta para deploy como static site!

## Decisões de Modelagem

### 1. Transações sem Order ID
Como a planilha não possui ID de pedido:
- Agrupamos por `NomeRevendedora + Ciclo + Data` (ou sem data)
- Isso pode criar transações "sintéticas" se um cliente comprou no mesmo dia várias vezes
- Alternativa seria agrupar apenas por cliente+ciclo, mas perderia granularidade

### 2. Valores só de Venda
A regra de negócio especifica que **apenas** Tipo="Venda" entra em valores monetários.
Brindes e Doações não contribuem para receita/ticket médio por padrão.
Existe toggle para incluir na contagem de itens.

### 3. Ciclo como String e Index
Mantemos tanto `CicloLabel` (string original) quanto `CicloIndex` (número para ordenação).
Index calculado como `ano * 12 + mes` permite ordenação e cálculos de tendência.

### 4. Segmentação Heurística
A segmentação de clientes usa percentis calculados dinamicamente sobre os dados filtrados.
Alternativamente, poderíamos usar K-means, mas a abordagem heurística é mais transparente e explicável.

## Limitações

1. **Market Basket Aproximado**: Sem ID de pedido real, transações são inferidas
2. **Previsões Simples**: Usa regressão linear básica (não considera sazonalidade complexa)
3. **Client-side Only**: Processa tudo no navegador (limite prático ~100k linhas)
4. **Excel Only**: Só suporta .xlsx/.xls (não CSV direto)

## Próximos Passos

- [ ] Suporte a múltiplos arquivos/ciclos
- [ ] Export de insights em PDF
- [ ] Comparação entre períodos
- [ ] Análise de sazonalidade
- [ ] Alertas de estoque baseados em previsões
- [ ] Recomendações de cross-sell por segmento

## Licença

MIT

## Autor

Desenvolvido com ❤️ e ☕ para análise de vendas moderna e eficiente.

---

**Dica**: Para melhor experiência, use navegadores modernos (Chrome, Firefox, Edge, Safari).
