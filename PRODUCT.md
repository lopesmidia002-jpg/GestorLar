# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
React 19 + Vite + Tailwind CSS + Lucide Icons + PWA (Service Worker + LocalStorage + IndexedDB)

## Users
Indivíduos e famílias brasileiras que buscam controle de orçamento doméstico em tempo real, com clareza visual de despesas, sem atrito de telas burocráticas e com operação confiável tanto no desktop quanto em dispositivos móveis (mesmo offline).

## Product Purpose
Fornecer um controlador financeiro doméstico de alta densidade visual (Hyper Charts / Obsidian Dark Fintech) baseado na metodologia 50-30-20, combinando persistência local atômica instantânea, gráficos vetoriais contínuos em SVG a 60 FPS e edição em linha (*click-to-edit*) para total autonomia do fluxo de caixa familiar.

## Positioning
Diferente de aplicativos bancários lentos ou planilhas estáticas desajeitadas no celular, o Gestor Financeiro do Lar oferece resposta visual instantânea com estética Obsidian Dark Fintech, cálculos trigonométricos dinâmicos a 60 FPS e resiliência offline absoluta sem requerer cadastro prévio ou login forçado para começar.

## Operating Context
- Utilização diária para consulta de saldo livre e comprometimento de renda.
- Lançamento imediato de compras e despesas no ponto de venda ou em trânsito (metrô, viagens, locais com oscilação de sinal 4G/5G).
- Fechamento mensal familiar para conferência do cumprimento das metas 50% Fixas, 30% Supérfluos e 20% Investimentos.

## Capabilities and Constraints
- **Metodologia Orçamentária Rígida:** Divisão tripartite imutável (50% Fixas, 30% Supérfluos, 20% Investimentos).
- **Offline-First:** Persistência atômica local em `localStorage` e fila de mutações transacionais em `IndexedDB` quando desconectado.
- **Gráficos SVG Nativos:** Raios radiais 360° (*Starburst*) e Radar Harmônico Senoidal (*72 vértices*) animados a 60 FPS puramente com funções trigonométricas nativas, sem bibliotecas pesadas de terceiros.
- **Edição em Linha (Click-to-Edit):** Interação direta nas células de dados do Ledger de Despesas sem modais bloqueantes para cada alteração.
- **Evolução Planejada:** Importação de extratos OFX/CSV dos bancos brasileiros (Nubank, Itaú, Inter), simulador FIRE de independência financeira e exportação de relatórios em PDF.

## Brand Commitments
- **Nome do Produto:** Gestor Financeiro do Lar (Short name: `GestorLar`).
- **Linguagem Visual:** Obsidian Dark Fintech (fundo preto profundo `#07080b`, painéis grafite `#0f1117`/`#181b24`, acento verde esmeralda neon `#00FF87` e ciano/roxo para categorias).
- **Tom de Voz:** Preciso, confiável, objetivo e voltado à clareza financeira familiar.

## Evidence on Hand
- `Documento de Arquitetura e Engenharia - Antigravity.pdf`: Documento executivo formalizando a arquitetura, modelos de dados, fórmulas matemáticas e roteiro de extensão.
- `CONTEXTO.md`: Visão conceitual e metodologia 50-30-20.
- `DOCUMENTAÇÃO.md` / `DOCUMENTACAO.md`: Esquema de dados JSON/TypeScript, tabelas de impacto e fórmulas trigonométricas.
- `PASSOS.md`: Roteiro passo a passo de desenvolvimento em 6 fases.

## Product Principles
1. **Zero Fricção de Entrada:** Toda edição monetária deve ser viável em linha com um clique ou toque, sem fluxo burocrático.
2. **Prioridade Máxima à Resiliência Offline:** O app nunca deve falhar ou travar por falta de sinal de internet.
3. **Estética de Alta Densidade e Precisão:** Visual refinado, contraste assertivo e gráficos vetoriais que reagem organicamente a cada centavo alterado.
4. **Respeito à Privacidade Financeira:** Os dados são do usuário e residem primariamente no armazenamento local do navegador.

## Accessibility & Inclusion
- Padrão WCAG 2.1 AA para contrastes de texto sobre fundos escuros.
- Alvos de toque adequados para dispositivos móveis (mínimo 44x44px).
- Labels descritivos para leitores de tela em gráficos interativos e controles em linha.
