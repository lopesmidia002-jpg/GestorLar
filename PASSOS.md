# Roteiro de Implementação e Passos de Execução (Roadmap)

## Controlador Financeiro Doméstico PWA
*Guia passo a passo para desenvolvimento, testes e extensão no ecossistema Antigravity.*

---

## 1. Visão Geral do Plano de Ação

```mermaid
flowchart TD
    F1[Fase 1: Setup e Infraestrutura Base] --> F2[Fase 2: Motor de Negócio e Estado]
    F2 --> F3[Fase 3: Componentes de UI e UX Core]
    F3 --> F4[Fase 4: Motor Gráfico SVG 60 FPS]
    F4 --> F5[Fase 5: PWA, Service Worker e Offline]
    F5 --> F6[Fase 6: Módulos de Extensão Antigravity]
```

---

## 2. Detalhamento das Fases de Execução

### Fase 1: Setup e Infraestrutura Base
- [x] **1.1 Inicialização do Projeto:**
  - Configurar projeto React 19 com Vite e TypeScript.
  - Instalar dependências essenciais: `lucide-react`, `clsx`, `tailwind-merge`.
- [x] **1.2 Configuração do Factory Design System (Terminal War Room):**
  - Configurar tokens Tailwind CSS v4 `@theme` conforme especificação Factory:
    - Obsidian Canvas: `#101010`
    - Carbon Lift: `#1d1a18`
    - Ash Stroke: `#3d3a39`
    - Graphite Mid: `#4d4947`
    - Warm Granite: `#8a8380`
    - Pale Stone: `#b8b3b0`
    - Bone: `#eeeeee` (Flashlit Dispatch Card)
    - Chalk: `#fafafa` (High-emphasis buttons)
    - Signal Orange: `#ee6018`
    - Metric Green: `#a0ca92`
  - Fontes: Geist (400) com tracking negativo rigoroso e Geist Mono (12px uppercase).
  - Radii planos: 3px (botões/nav), 10px (cards), 20px (painéis), zero sombras.
- [x] **1.3 PWA Shell e Manifest:**
  - Criar `manifest.json` com nome `Factory // Gestor Financeiro` e `standalone`.
  - Configurar meta tags no `index.html` para suporte mobile iOS/Android com tema `#101010`.

---

### Fase 2: Motor de Negócio e Gestão de Estado
- [ ] **2.1 Tipagem e Schemas:**
  - Declarar interfaces `ItemLancamento`, `MetasRegra`, `EstadoFinanceiro` em `src/types/finance.ts`.
- [ ] **2.2 Motor de Cálculo da Regra 50-30-20:**
  - Implementar utilitários que calculam em tempo real:
    - Total de despesas fixas e desvio em relação aos 50% de meta.
    - Total de gastos supérfluos e desvio em relação aos 30% de meta.
    - Total de investimentos e percentual atingido sobre a meta de 20%.
    - Saldo livre remanescente e taxa de comprometimento da renda.
- [ ] **2.3 Hook de Persistência Atômica:**
  - Criar hook `useFinanceStorage` para sincronizar leituras e gravações no `localStorage` com debounce e integridade de dados.

---

### Fase 3: Componentes de UI e UX de Alta Densidade
- [ ] **3.1 Header & Motor de Renda:**
  - Exibição de Renda Total Familiar Líquida com indicador de saldo livre e percentual comprometido.
  - Modal ou inline click para ajuste rápido da renda base.
- [ ] **3.2 Pilares do Lar (Cards Tripartites):**
  - **Pilar Fixas (50%):** Barra de progresso, total alocado vs. teto, badge de status de saúde orçamentária.
  - **Pilar Supérfluos (30%):** Alerta visual em caso de estouro de meta discricionária.
  - **Pilar Investimentos (20%):** Medidor de aportes e reserva de oportunidade.
- [ ] **3.3 Ledger de Despesas (Tabela Interativa):**
  - Campo de busca instantânea por título ou tipo detalhado.
  - Filtro rápido por pilar (`Todos`, `Fixas`, `Supérfluos`, `Investimentos`) e por status (`Pago` / `Pendente`).
  - **Click-to-Edit Inline:** Permitir clicar em valor, título ou vencimento e editar sem abrir janelas extras.
  - Botão de deleção rápida com confirmação instantânea.

---

### Fase 4: Motor de Renderização Gráfica SVG 60 FPS
- [ ] **4.1 Loop de Animação Contínua (Tick Loop):**
  - Implementar hook `useAnimationFrame` para atualizar variável contínua de fase `tick` sincronizada com a taxa de atualização da tela.
- [ ] **4.2 Gráfico Starburst 360°:**
  - Renderizador vetorial SVG calculando raios com a fórmula:
    $$\theta = (i \times 360^\circ) / N$$
    $$L = \text{Base} + (\text{Peso} / 100) \times 36 + \sin(4\pi \times (i/N) + \text{tick}) \times 4$$
- [ ] **4.3 Radar Harmônico Senoidal Orgânico:**
  - Geração de 72 vértices interpolados polares com visual de onda fluida e respiração contínua:
    $$r(\theta) = r_{\text{base}} + \sin(\theta \times \text{freq} + \text{offset}) \times \text{amplitude}$$
  - Fechamento de path SVG com gradientes e blur sutil.

---

### Fase 5: Suporte Offline Total e Service Worker
- [ ] **5.1 Service Worker (Cache-First Shell):**
  - Registrar Service Worker no ciclo de inicialização do app.
  - Armazenar em cache o app shell, estilos e fontes para carregamento instantâneo offline.
- [ ] **5.2 Gerenciamento de Conectividade:**
  - Escuta ativa dos eventos `window.addEventListener('online')` e `window.addEventListener('offline')`.
  - Toast discreto informando estado de conexão (*"Modo Offline Ativo - Operando Localmente"*).
- [ ] **5.3 Fila Transacional IndexedDB:**
  - Armazenar mutações pendentes caso ocorra falha de rede e sincronizar ao restabelecer o sinal.

---

### Fase 6: Roteiro de Extensão Antigravity

Conforme especificado no item 6 do blueprint executivo, as próximas fases de expansão contemplam:

| Passo | Objetivo | Detalhamento Técnico | Complexidade |
| :--- | :--- | :--- | :--- |
| **Passo 01** | **Importação de Extrato OFX/CSV** | Parser client-side para converter arquivos de extrato de bancos brasileiros (*Nubank, Itaú, Inter*) diretamente nos objetos do schema de itens. | Média |
| **Passo 02** | **Projeção Patrimonial FIRE** | Simulador de juros compostos calculando anos estimados para independência financeira baseados na taxa média de aporte do pilar 3 (Investimentos). | Baixa |
| **Passo 03** | **Sincronização em Nuvem Privada** | Integração com camada Supabase ou Firebase com criptografia ponta a ponta (E2EE) das informações orçamentárias familiares. | Avançada |
| **Passo 04** | **Relatórios Automatizados em PDF** | Rotina automática de compilação de balancete mensal em PDF para exportação ou arquivamento. | Concluído / Integrar |

---

## 3. Critérios de Aceitação e Checklist de Qualidade

1. **Performance:** Carregamento inicial em menos de 1 segundo e animações gráficas rodando a 60 FPS estáveis.
2. **Resiliência Offline:** Fechar a aba, desconectar a internet, abrir novamente e continuar editando e salvando lançamentos normalmente.
3. **Fidelidade à Metodologia 50-30-20:** Totalizadores matemáticos e barras de limites atualizados em tempo real a cada caractere digitado.
4. **Ergonomia Mobile:** Toques confortáveis, botões de ação rápida e interface totalmente adaptada a telas de smartphones e desktops.
5. **Reconhecimento de Voz Contínuo:** Fala contínua sem cancelamento precoce no Web Speech API, transcrição ao vivo e detecção de silêncio para comandos naturais.
6. **Alocação Direta por Pilar Falado:** Prioridade estrita ao pilar expressamente citado na fala/texto (*como supérfluo*, *no fixo*, *em investimentos*) e filtragem completa do nome do pilar do título do lançamento.
7. **Zerar Painel Seguro:** Botão dedicado e modal de confirmação no Factory Design System para zerar dados (renda e lançamentos) sem recarregar a página.
8. **Calendário de Planejamento Mensal:** Visualização temporal completa em grade de 7 colunas por mês com métricas de previstos vs. pagos, identificação de picos de vencimento, filtro por pilar/status e agendamento rápido direto no dia.
9. **Lembretes de Contas no WhatsApp:** Detecção automática de contas que vencem hoje, nos próximos dias (janela customizável) ou em atraso, com banner de aviso inteligente e disparo de mensagens consolidadas ou individuais no WhatsApp com 1 clique.
10. **Automação de Alertas e Múltiplos Números de WhatsApp:** Cadastro ilimitado de contatos (Titular, Cônjuge, Familiar) com controle individual de ativação, robô de verificação diária com envio automático para todos os números e suporte a Webhook REST Gateway.
