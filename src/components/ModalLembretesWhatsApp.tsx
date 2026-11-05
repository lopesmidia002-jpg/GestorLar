import { useState, useEffect } from 'react';
import type { ItemLancamento } from '../types/finance';
import { 
  type ConfiguracaoWhatsApp,
  type DestinatarioWhatsApp,
  obterConfiguracaoWhatsApp,
  dispararWhatsApp,
  cadastrarDestinatarioWhatsApp,
  removerDestinatarioWhatsApp,
  alternarAtivoDestinatarioWhatsApp
} from '../services/whatsappReminderService';
import { 
  X, 
  MessageSquare, 
  Check, 
  Plus, 
  Trash2, 
  Send 
} from 'lucide-react';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  itens?: ItemLancamento[];
  onAlternarPago?: (id: string) => void;
}

export const ModalLembretesWhatsApp = ({
  aberto,
  onFechar,
}: Props) => {
  const [config, setConfig] = useState<ConfiguracaoWhatsApp>(obterConfiguracaoWhatsApp);
  
  // Formulário de novo destinatário
  const [novoNome, setNovoNome] = useState('');
  const [novoNumero, setNovoNumero] = useState('');
  const [novoTipo, setNovoTipo] = useState<DestinatarioWhatsApp['tipo']>('titular');
  const [feedbackMensagem, setFeedbackMensagem] = useState<string | null>(null);

  useEffect(() => {
    if (aberto) {
      const cfg = obterConfiguracaoWhatsApp();
      setConfig(cfg);
      setFeedbackMensagem(null);
    }
  }, [aberto]);

  if (!aberto) return null;

  const handleCadastrarDestinatario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNumero.trim()) return;

    const novaCfg = cadastrarDestinatarioWhatsApp(
      novoNome.trim() || 'Contato',
      novoNumero.trim(),
      novoTipo
    );
    setConfig(novaCfg);
    setNovoNome('');
    setNovoNumero('');
    setFeedbackMensagem('✓ Número cadastrado com sucesso!');
    setTimeout(() => setFeedbackMensagem(null), 2500);
  };

  const handleRemoverDestinatario = (id: string) => {
    const novaCfg = removerDestinatarioWhatsApp(id);
    setConfig(novaCfg);
  };

  const handleAlternarAtivo = (id: string) => {
    const novaCfg = alternarAtivoDestinatarioWhatsApp(id);
    setConfig(novaCfg);
  };

  const handleTestarNumero = (dest: DestinatarioWhatsApp) => {
    const msg = `✅ *GESTORLAR // TESTE DE CONTATO*\n\nOlá, *${dest.nome}*! Este número de WhatsApp está cadastrado e ativo no GestorLar.`;
    dispararWhatsApp(msg, dest.numero);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#101010] border border-[#3d3a39] w-full max-w-xl rounded-[3px] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#3d3a39] bg-[#161413]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[3px] bg-[#1d1a18] border border-[#3d3a39] flex items-center justify-center text-[#25D366]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-tight text-[#fafafa] flex items-center gap-2">
                CADASTRO DE NÚMEROS // WHATSAPP
                {config.destinatarios.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-[2px] bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 text-[9px] font-mono">
                    {config.destinatarios.length} {config.destinatarios.length === 1 ? 'NÚMERO' : 'NÚMEROS'}
                  </span>
                )}
              </h3>
              <p className="font-mono text-[11px] text-[#8a8380]">
                Cadastre e gerencie os telefones de WhatsApp vinculados ao seu painel
              </p>
            </div>
          </div>

          <button
            onClick={onFechar}
            className="text-[#8a8380] hover:text-[#eeeeee] transition-colors p-1 cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedbackMensagem && (
          <div className="px-5 py-2.5 bg-[#a0ca92]/10 border-b border-[#a0ca92]/30 text-[#a0ca92] text-xs font-mono flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            <span>{feedbackMensagem}</span>
          </div>
        )}

        {/* Conteúdo do Modal: Exclusivamente Cadastramento de Números */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-6">
          {/* Formulário de Cadastro de Novo Número */}
          <form onSubmit={handleCadastrarDestinatario} className="p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39] flex flex-col gap-3">
            <span className="font-mono text-xs uppercase text-[#eeeeee] flex items-center gap-1.5 font-medium">
              <Plus className="w-3.5 h-3.5 text-[#25D366]" />
              Adicionar Novo Número de WhatsApp
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Identificação / Nome</label>
                <input
                  type="text"
                  placeholder="Ex: Cônjuge, Meu WhatsApp..."
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2.5 py-1.5 text-xs text-[#eeeeee] focus:border-[#fafafa] focus:outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">WhatsApp (DDD + Número)</label>
                <input
                  type="text"
                  placeholder="Ex: 11987654321"
                  value={novoNumero}
                  onChange={(e) => setNovoNumero(e.target.value)}
                  required
                  className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2.5 py-1.5 text-xs text-[#eeeeee] focus:border-[#fafafa] focus:outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Vínculo</label>
                <select
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value as any)}
                  className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2 py-1.5 text-xs text-[#eeeeee] focus:border-[#fafafa] focus:outline-none font-mono"
                >
                  <option value="titular">Titular</option>
                  <option value="conjuge">Cônjuge</option>
                  <option value="familiar">Familiar</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] font-mono text-xs uppercase tracking-tight font-medium flex items-center gap-1.5 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Salvar Contato</span>
              </button>
            </div>
          </form>

          {/* Lista de Contatos Cadastrados */}
          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-xs uppercase tracking-tight text-[#fafafa]">
              LISTA DE DESTINATÁRIOS ({config.destinatarios.length})
            </span>

            {config.destinatarios.length === 0 ? (
              <div className="p-6 text-center rounded-[3px] border border-dashed border-[#3d3a39] text-[#8a8380] font-mono text-xs">
                Nenhum número cadastrado ainda. Use o formulário acima para cadastrar o primeiro WhatsApp.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {config.destinatarios.map((dest) => (
                  <div
                    key={dest.id}
                    className={`p-3 rounded-[3px] bg-[#161413] border transition flex items-center justify-between gap-3 ${
                      dest.ativo ? 'border-[#3d3a39]' : 'border-[#242120] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleAlternarAtivo(dest.id)}
                        className={`w-5 h-5 rounded-[2px] flex items-center justify-center cursor-pointer transition shrink-0 ${
                          dest.ativo
                            ? 'bg-[#25D366] text-[#101010]'
                            : 'border border-[#3d3a39] text-transparent'
                        }`}
                        title={dest.ativo ? 'Desativar este número' : 'Ativar este número'}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </button>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-[#fafafa]">
                            {dest.nome}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#101010] border border-[#3d3a39] text-[#8a8380] font-mono uppercase">
                            {dest.tipo || 'contato'}
                          </span>
                          {!dest.ativo && (
                            <span className="text-[9px] text-[#ee6018] font-mono">
                              (DESATIVADO)
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-[#8a8380]">
                          {dest.numero}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Testar disparo individual */}
                      <button
                        onClick={() => handleTestarNumero(dest)}
                        className="px-2 py-1 rounded-[2px] bg-[#101010] hover:bg-[#1d1a18] border border-[#3d3a39] text-[#8a8380] hover:text-[#25D366] text-[10px] font-mono flex items-center gap-1 cursor-pointer transition"
                        title="Enviar mensagem de teste para este número"
                      >
                        <Send className="w-3 h-3" />
                        <span className="hidden sm:inline">Testar</span>
                      </button>

                      {/* Excluir número */}
                      <button
                        onClick={() => handleRemoverDestinatario(dest.id)}
                        className="p-1 text-[#8a8380] hover:text-[#ee6018] cursor-pointer transition"
                        title="Remover este número"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="px-6 py-3 border-t border-[#3d3a39] bg-[#161413] flex items-center justify-between text-xs font-mono text-[#8a8380]">
          <span>CADASTRO DE NÚMEROS // GESTORLAR</span>
          <button
            onClick={onFechar}
            className="text-[#eeeeee] hover:underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
