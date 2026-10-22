import { useState } from 'react';
import { useFinanceStorage } from './hooks/useFinanceStorage';
import { SellixVideoBackground } from './components/SellixVideoBackground';
import { HeaderMotorRenda } from './components/HeaderMotorRenda';
import { HyperWaveCard } from './components/HyperWaveCard';
import { HyperStarburstCard } from './components/HyperStarburstCard';
import { HyperRadarCard } from './components/HyperRadarCard';
import { PilaresDoLar } from './components/PilaresDoLar';
import { LedgerDespesas } from './components/LedgerDespesas';
import { FinancialAssistantBot } from './components/FinancialAssistantBot';
import { ModalConexaoNuvem } from './components/ModalConexaoNuvem';
import type { CategoriaOrcamentaria } from './types/finance';
import { CATEGORIAS_CONFIG } from './utils/calculations';
import { ShieldCheck, Download, Sparkles } from 'lucide-react';

export function App() {
  const {
    estado,
    calculos,
    isOnline,
    statusSync,
    usuario,
    forcarSincronizacao,
    adicionarItem,
    atualizarItem,
    removerItem,
    alternarPago,
    atualizarRenda,
    atualizarMetas,
    ajustarTotalPilar,
    ajustarTetoPilar,
    ajustarTotalGeral,
    redefinirDadosPadrao,
  } = useFinanceStorage();

  const [filtroPilar, setFiltroPilar] = useState<CategoriaOrcamentaria | 'todos'>('todos');
  const [modalNuvemAberto, setModalNuvemAberto] = useState(false);

  // Exportar backup JSON
  const exportarJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(estado, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `gestorlar_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-transparent text-[#F3F4F6] relative overflow-x-hidden selection:bg-[#00FF87] selection:text-[#06070a]">
      {/* Background Sellix Animated Video Fullscreen (Seamless Crossfade 4K globe) */}
      <SellixVideoBackground />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 py-6 pb-20">
        {/* 1. Header & Motor de Renda (Renda, Saldo Livre, Comprometimento & Nuvem) */}
        <HeaderMotorRenda
          rendaFamiliar={estado.rendaFamiliar}
          calculos={calculos}
          isOnline={isOnline}
          statusSync={statusSync}
          usuario={usuario}
          onAbrirNuvemModal={() => setModalNuvemAberto(true)}
          onAtualizarRenda={atualizarRenda}
          onAjustarTotalGeral={ajustarTotalGeral}
          onRedefinir={redefinirDadosPadrao}
        />

        {/* 2. SUITE HYPER CHARTS: Grid fiel à imagem de referência */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00FF87] animate-pulse" />
              <h2 className="text-xs uppercase tracking-widest font-extrabold text-[#00FF87] flex items-center gap-1.5 font-mono">
                HYPER CHARTS • MOTOR VETORIAL 60 FPS
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#9CA3AF] font-mono">
              <Sparkles className="w-3.5 h-3.5 text-[#00FF87]" />
              <span>Interatividade Harmônica & Click-to-Edit Total</span>
            </div>
          </div>

          {/* Linha Superior: Wave Card (4 cols) + Starburst Card (8 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Card Superior Esquerdo: Ondas Senoidais Fluídas (Monthly/Yearly) */}
            <div className="lg:col-span-4 flex flex-col">
              <HyperWaveCard
                calculos={calculos}
                rendaFamiliar={estado.rendaFamiliar}
                onAtualizarRenda={atualizarRenda}
                onAjustarTotalPilar={ajustarTotalPilar}
              />
            </div>

            {/* Card Superior Direito: Starburst 360° Circular Spectrum */}
            <div className="lg:col-span-8 flex flex-col">
              <HyperStarburstCard
                calculos={calculos}
                rendaFamiliar={estado.rendaFamiliar}
                filtroAtivo={filtroPilar}
                onSelecionarFiltro={setFiltroPilar}
                onAtualizarRenda={atualizarRenda}
                onAjustarTotalPilar={ajustarTotalPilar}
              />
            </div>
          </div>

          {/* Linha Inferior: Radar Harmônico Senoidal Orgânico (Destaque Central) */}
          <div className="w-full">
            <HyperRadarCard
              calculos={calculos}
              rendaFamiliar={estado.rendaFamiliar}
              onSelecionarFiltro={setFiltroPilar}
              onAtualizarRenda={atualizarRenda}
              onAjustarTotalPilar={ajustarTotalPilar}
              onAjustarTotalGeral={ajustarTotalGeral}
            />
          </div>
        </section>

        {/* 3. Pilares do Lar (100% Editáveis: Total, Teto, Meta e Adição Rápida) */}
        <PilaresDoLar
          calculos={calculos}
          metasRegra={estado.metasRegra}
          filtroAtivo={filtroPilar}
          rendaFamiliar={estado.rendaFamiliar}
          onSelecionarFiltro={setFiltroPilar}
          onAtualizarMeta={(categoria, novoPercent) => atualizarMetas({ [categoria]: novoPercent })}
          onAjustarTotalPilar={ajustarTotalPilar}
          onAjustarTetoPilar={ajustarTetoPilar}
          onAdicionarItemRapido={(categoria, titulo, valor) => {
            adicionarItem({
              titulo,
              valor,
              categoria,
              tipoDetalhado: CATEGORIAS_CONFIG[categoria].subcategorias[0] || 'Geral',
              vencimento: 'Dia 10',
              pago: false,
            });
          }}
        />

        {/* 4. Ledger de Despesas & Aportes com Inline Click-to-Edit */}
        <LedgerDespesas
          itens={estado.itens}
          filtroPilar={filtroPilar}
          onSelecionarFiltroPilar={setFiltroPilar}
          onAdicionarItem={adicionarItem}
          onAtualizarItem={atualizarItem}
          onRemoverItem={removerItem}
          onAlternarPago={alternarPago}
        />

        {/* 5. Rodapé Informativo */}
        <footer className="pt-6 border-t border-[#161924] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9CA3AF]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00FF87]" />
            <span>Gestor Financeiro do Lar • PWA Hyper Charts (100% Offline-First)</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] text-[#4B5563]">Vite + React 19 + Tailwind CSS</span>
            <button
              onClick={exportarJSON}
              className="inline-flex items-center gap-1.5 text-[#00FF87] hover:underline cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Backup JSON</span>
            </button>
          </div>
        </footer>
      </div>

      {/* 6. Assistente IA Financeiro Flutuante (Comando de Voz & Chat com NLP) */}
      <FinancialAssistantBot
        estado={estado}
        onAdicionarItem={adicionarItem}
        onAtualizarItem={atualizarItem}
        onRemoverItem={removerItem}
        onAlternarPago={alternarPago}
        onAtualizarRenda={atualizarRenda}
        onAtualizarMetas={atualizarMetas}
      />

      {/* 7. Modal de Persistência & Sincronização em Nuvem Supabase */}
      <ModalConexaoNuvem
        aberto={modalNuvemAberto}
        onFechar={() => setModalNuvemAberto(false)}
        statusSync={statusSync}
        usuario={usuario}
        onForcarSincronizacao={forcarSincronizacao}
      />
    </div>
  );
}

export default App;
