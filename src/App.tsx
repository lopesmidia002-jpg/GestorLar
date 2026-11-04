import { useState, useEffect } from 'react';
import { useFinanceStorage } from './hooks/useFinanceStorage';
import { HeaderMotorRenda } from './components/HeaderMotorRenda';
import { HyperWaveCard } from './components/HyperWaveCard';
import { HyperStarburstCard } from './components/HyperStarburstCard';
import { HyperRadarCard } from './components/HyperRadarCard';
import { PilaresDoLar } from './components/PilaresDoLar';
import { LedgerDespesas } from './components/LedgerDespesas';
import { FinancialAssistantBot } from './components/FinancialAssistantBot';
import { ModalNotificacoesFirebase } from './components/ModalNotificacoesFirebase';
import { ModalConexaoNuvem } from './components/ModalConexaoNuvem';
import { 
  executarVerificacaoGlobalENotificar, 
  escutarNotificacoesPrimeiroPlano 
} from './services/firebaseNotificationService';
import type { CategoriaOrcamentaria } from './types/finance';
import { CATEGORIAS_CONFIG } from './utils/calculations';
import { Download, ArrowRight } from 'lucide-react';

export function App() {
  const {
    estado,
    calculos,
    isOnline,
    statusSync,
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
  const [modalNotificacoesAberto, setModalNotificacoesAberto] = useState(false);
  const [modalNuvemAberto, setModalNuvemAberto] = useState(false);

  // Monitora contas vencendo, risco de saldo negativo e escuta mensagens push em primeiro plano
  useEffect(() => {
    executarVerificacaoGlobalENotificar(estado, calculos);
    let cancelar: (() => void) | null = null;

    escutarNotificacoesPrimeiroPlano((payload) => {
      console.log('Push FCM recebido em primeiro plano:', payload);
    }).then((fn) => {
      cancelar = fn;
    });

    return () => {
      if (cancelar) cancelar();
    };
  }, [estado, calculos]);

  // Exportar backup JSON
  const exportarJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(estado, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `factory_finance_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-[#101010] text-[#eeeeee] relative overflow-x-hidden selection:bg-[#ee6018] selection:text-[#101010] font-sans">
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-16 py-6 pb-24">
        {/* 1. Header & Motor de Renda (Top Nav + Figure/Ground Triad Dispatch) */}
        <HeaderMotorRenda
          rendaFamiliar={estado.rendaFamiliar}
          calculos={calculos}
          isOnline={isOnline}
          statusSync={statusSync}
          onSincronizar={forcarSincronizacao}
          onAbrirNotificacoes={() => setModalNotificacoesAberto(true)}
          onAbrirNuvem={() => setModalNuvemAberto(true)}
          onAtualizarRenda={atualizarRenda}
          onAjustarTotalGeral={ajustarTotalGeral}
          onRedefinir={redefinirDadosPadrao}
        />

        {/* 2. WAR ROOM: SUITE HYPER CHARTS 60 FPS */}
        <section id="war-room" className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-[#3d3a39] pb-3">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ee6018]" />
              <h2 className="font-mono text-xs uppercase tracking-[-0.24px] text-[#eeeeee]">
                WAR ROOM // MOTOR VETORIAL 60 FPS
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#8a8380]">
              <span>ZERO_SHADOW // FLAT INSTRUMENT SYSTEM</span>
            </div>
          </div>

          {/* Linha Superior: Wave Card (4 cols) + Starburst Card (8 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-4 flex flex-col">
              <HyperWaveCard
                calculos={calculos}
                rendaFamiliar={estado.rendaFamiliar}
                onAtualizarRenda={atualizarRenda}
                onAjustarTotalPilar={ajustarTotalPilar}
              />
            </div>

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

          {/* Linha Inferior: Radar Harmônico Senoidal Orgânico */}
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

        {/* 3. Pilares do Lar 50-30-20 */}
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

        {/* 4. Ledger de Despesas & Aportes */}
        <LedgerDespesas
          itens={estado.itens}
          filtroPilar={filtroPilar}
          onSelecionarFiltroPilar={setFiltroPilar}
          onAdicionarItem={adicionarItem}
          onAtualizarItem={atualizarItem}
          onRemoverItem={removerItem}
          onAlternarPago={alternarPago}
        />

        {/* 5. Footer: Factory Standard Footer (96px+ vertical padding, Geist Mono headings, #8a8380 links) */}
        <footer className="pt-24 pb-12 border-t border-[#3d3a39] flex flex-col md:flex-row items-start md:items-center justify-between gap-8 text-xs">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ee6018]" />
              <span className="font-mono text-xs uppercase tracking-widest text-[#eeeeee]">
                FACTORY // CONTROL SURFACE
              </span>
            </div>
            <p className="text-xs text-[#8a8380] max-w-md leading-relaxed">
              Terminal de gestão financeira familiar baseado na metodologia 50-30-20. Alta fidelidade técnica, funcionamento 100% offline-first e persistência atômica.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-8 font-mono text-xs text-[#8a8380]">
            <span className="text-[#4d4947]">VITE • REACT 19 • TAILWIND 4</span>
            <button
              onClick={exportarJSON}
              className="h-[34px] px-3.5 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#fafafa] text-[#eeeeee] hover:text-[#fafafa] flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORTAR DADOS (JSON)</span>
              <ArrowRight className="w-3 h-3 text-[#8a8380]" />
            </button>
          </div>
        </footer>
      </div>

      {/* 6. Assistente IA Financeiro Flutuante */}
      <FinancialAssistantBot
        estado={estado}
        onAdicionarItem={adicionarItem}
        onAtualizarItem={atualizarItem}
        onRemoverItem={removerItem}
        onAlternarPago={alternarPago}
        onAtualizarRenda={atualizarRenda}
        onAtualizarMetas={atualizarMetas}
      />

      {/* 7. Modal de Notificações Push Firebase */}
      <ModalNotificacoesFirebase
        aberto={modalNotificacoesAberto}
        onFechar={() => setModalNotificacoesAberto(false)}
        estado={estado}
        calculos={calculos}
        onAlternarPago={alternarPago}
      />

      {/* 8. Modal de Conexão com a Nuvem Supabase */}
      <ModalConexaoNuvem
        aberto={modalNuvemAberto}
        onFechar={() => setModalNuvemAberto(false)}
        statusSync={statusSync}
        usuario={null}
        onForcarSincronizacao={forcarSincronizacao}
      />
    </div>
  );
}

export default App;
