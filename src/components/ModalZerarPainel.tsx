import React from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  Eraser, 
  RotateCcw, 
  X,
  ShieldAlert
} from 'lucide-react';
import { formatarBRL } from '../utils/calculations';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  totalItens: number;
  rendaAtual: number;
  onZerarTudo: () => void;
  onZerarApenasGastos: () => void;
  onRestaurarDemo: () => void;
}

export const ModalZerarPainel: React.FC<Props> = ({
  aberto,
  onFechar,
  totalItens,
  rendaAtual,
  onZerarTudo,
  onZerarApenasGastos,
  onRestaurarDemo,
}) => {
  if (!aberto) return null;

  const handleZerarTudo = () => {
    onZerarTudo();
    onFechar();
  };

  const handleZerarApenasGastos = () => {
    onZerarApenasGastos();
    onFechar();
  };

  const handleRestaurarDemo = () => {
    onRestaurarDemo();
    onFechar();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060505]/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      {/* Container: Factory Terminal Frame */}
      <div 
        className="w-full max-w-[480px] bg-[#101010] border border-[#3d3a39] rounded-[10px] overflow-hidden flex flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* macOS Terminal Window Header */}
        <div className="h-9 bg-[#161413] border-b border-[#3d3a39] px-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
            </div>
            <span className="sm:ml-2 font-mono text-[11px] uppercase tracking-[-0.24px] text-[#eeeeee]">
              FACTORY // PURGE_DASHBOARD.SYS
            </span>
          </div>

          <button
            onClick={onFechar}
            className="text-[#8a8380] hover:text-[#eeeeee] transition-colors p-1"
            title="Fechar janela"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Warning Banner */}
          <div className="p-3.5 rounded-[3px] bg-[#1d1a18] border border-[#ee6018]/40 flex items-start gap-3">
            <div className="p-1.5 rounded-[3px] bg-[#ee6018]/10 text-[#ee6018] shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h3 className="font-mono text-xs uppercase tracking-tight text-[#ee6018] font-normal flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> ATENÇÃO // AÇÃO DESTRUTIVA
              </h3>
              <p className="text-xs text-[#8a8380] leading-relaxed">
                Você está prestes a limpar os dados contábeis do painel. Esta ação afeta o armazenamento local e a sincronização em nuvem.
              </p>
            </div>
          </div>

          {/* Estado Atual do Painel */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-[3px] bg-[#161413] border border-[#3d3a39] font-mono text-xs">
            <div>
              <span className="text-[10px] text-[#8a8380] uppercase block">Lançamentos no Ledger</span>
              <span className="text-sm text-[#eeeeee]">{totalItens} {totalItens === 1 ? 'item' : 'itens'}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8a8380] uppercase block">Renda Familiar Atual</span>
              <span className="text-sm text-[#eeeeee]">{formatarBRL(rendaAtual)}</span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col gap-2.5 pt-1">
            {/* 1. Zerar Tudo (Renda = 0 e Itens = 0) */}
            <button
              onClick={handleZerarTudo}
              className="w-full p-3 rounded-[3px] bg-[#1d1a18] border border-[#ee6018] hover:bg-[#ee6018] text-[#ee6018] hover:text-[#101010] font-mono text-xs uppercase tracking-tight flex items-center justify-between cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2.5 text-left">
                <Trash2 className="w-4 h-4 shrink-0 text-[#ee6018] group-hover:text-[#101010]" />
                <div>
                  <span className="font-medium block">ZERAR TUDO (RENDA E GASTOS)</span>
                  <span className="text-[10px] text-[#8a8380] group-hover:text-[#101010]/80 block">
                    Renda vai a R$ 0,00 e apaga todos os {totalItens} lançamentos
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold shrink-0 ml-2">EXEC_PURGE →</span>
            </button>

            {/* 2. Zerar Apenas Lançamentos (Mantém Renda) */}
            <button
              onClick={handleZerarApenasGastos}
              className="w-full p-3 rounded-[3px] bg-[#1d1a18] border border-[#3d3a39] hover:border-[#fafafa] text-[#eeeeee] font-mono text-xs uppercase tracking-tight flex items-center justify-between cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2.5 text-left">
                <Eraser className="w-4 h-4 shrink-0 text-[#a0ca92]" />
                <div>
                  <span className="font-medium block">ZERAR APENAS GASTOS DO LEDGER</span>
                  <span className="text-[10px] text-[#8a8380] block">
                    Mantém renda de {formatarBRL(rendaAtual)} e limpa as despesas
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#8a8380] shrink-0 ml-2">LIMPAR →</span>
            </button>

            {/* 3. Restaurar Demonstração Padrão */}
            <button
              onClick={handleRestaurarDemo}
              className="w-full p-2.5 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#8a8380] text-[#8a8380] hover:text-[#eeeeee] font-mono text-[11px] uppercase tracking-tight flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar dados demonstrativos padrão</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 bg-[#161413] border-t border-[#3d3a39] px-6 flex items-center justify-end">
          <button
            onClick={onFechar}
            className="px-4 py-1.5 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#8a8380] text-[#8a8380] hover:text-[#eeeeee] font-mono text-xs uppercase tracking-tight cursor-pointer transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

