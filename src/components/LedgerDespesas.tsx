import { useState, useMemo, type FormEvent } from 'react';
import type { ItemLancamento, CategoriaOrcamentaria } from '../types/finance';
import { formatarBRL, parseMoedaBR, CATEGORIAS_CONFIG } from '../utils/calculations';
import { 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Circle, 
  Check, 
  X,
  MessageSquare,
} from 'lucide-react';
import { 
  dispararWhatsApp, 
  gerarMensagemWhatsAppIndividual 
} from '../services/whatsappReminderService';

interface Props {
  itens: ItemLancamento[];
  filtroPilar: CategoriaOrcamentaria | 'todos';
  onSelecionarFiltroPilar: (filtro: CategoriaOrcamentaria | 'todos') => void;
  onAdicionarItem: (item: Omit<ItemLancamento, 'id'>) => void;
  onAtualizarItem: (id: string, updates: Partial<ItemLancamento>) => void;
  onRemoverItem: (id: string) => void;
  onAlternarPago: (id: string) => void;
}

export const LedgerDespesas = ({
  itens,
  filtroPilar,
  onSelecionarFiltroPilar,
  onAdicionarItem,
  onAtualizarItem,
  onRemoverItem,
  onAlternarPago,
}: Props) => {
  const [busca, setBusca] = useState('');
  const [filtroPago, setFiltroPago] = useState<'todos' | 'pagos' | 'pendentes'>('todos');
  const [mostrandoNovo, setMostrandoNovo] = useState(false);

  // Estado para inline click-to-edit
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [campoEditando, setCampoEditando] = useState<'titulo' | 'valor' | 'vencimento' | null>(null);
  const [valorTemp, setValorTemp] = useState('');

  // Formulário de novo item
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaCategoria, setNovaCategoria] = useState<CategoriaOrcamentaria>('fixas');
  const [novoTipo, setNovoTipo] = useState('Moradia');
  const [novoValor, setNovoValor] = useState('');
  const [novoVencimento, setNovoVencimento] = useState('');

  // Filtros aplicados
  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      // Filtro de Pilar
      if (filtroPilar !== 'todos' && item.categoria !== filtroPilar) return false;
      
      // Filtro de Pagamento
      if (filtroPago === 'pagos' && !item.pago) return false;
      if (filtroPago === 'pendentes' && item.pago) return false;

      // Filtro de Busca
      if (busca.trim()) {
        const query = busca.toLowerCase();
        const bateuTitulo = item.titulo.toLowerCase().includes(query);
        const bateuTipo = item.tipoDetalhado.toLowerCase().includes(query);
        if (!bateuTitulo && !bateuTipo) return false;
      }

      return true;
    });
  }, [itens, filtroPilar, filtroPago, busca]);

  const totalFiltrado = useMemo(() => {
    return itensFiltrados.reduce((acc, curr) => acc + curr.valor, 0);
  }, [itensFiltrados]);

  const iniciarEdicao = (id: string, campo: 'titulo' | 'valor' | 'vencimento', valorAtual: string | number) => {
    setEditandoId(id);
    setCampoEditando(campo);
    setValorTemp(valorAtual.toString());
  };

  const salvarEdicao = (id: string) => {
    if (campoEditando === 'titulo' && valorTemp.trim()) {
      onAtualizarItem(id, { titulo: valorTemp.trim() });
    } else if (campoEditando === 'valor') {
      const num = parseMoedaBR(valorTemp);
      if (num >= 0) {
        onAtualizarItem(id, { valor: num });
      }
    } else if (campoEditando === 'vencimento' && valorTemp.trim()) {
      onAtualizarItem(id, { vencimento: valorTemp.trim() });
    }
    cancelarEdicao();
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setCampoEditando(null);
    setValorTemp('');
  };

  const submeterNovoItem = (e: FormEvent) => {
    e.preventDefault();
    const val = parseMoedaBR(novoValor);
    if (!novoTitulo.trim() || val <= 0) return;

    onAdicionarItem({
      titulo: novoTitulo.trim(),
      categoria: novaCategoria,
      tipoDetalhado: novoTipo,
      valor: val,
      vencimento: novoVencimento.trim() || 'A definir',
      pago: false,
    });

    setNovoTitulo('');
    setNovoValor('');
    setMostrandoNovo(false);
  };

  return (
    <div id="ledger" className="bg-[#101010] border border-[#3d3a39] rounded-[10px] overflow-hidden flex flex-col">
      {/* macOS Terminal Window Header */}
      <div className="h-9 bg-[#161413] border-b border-[#3d3a39] px-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[-0.24px] text-[#eeeeee]">
            TRANSACTION_LEDGER // DIÁRIO DE LANÇAMENTOS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ee6018]" />
          <span className="font-mono text-[10px] text-[#8a8380]">
            {itensFiltrados.length} ITENS
          </span>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-5">
        {/* Controls Bar: Search, Category Filters, New Entry Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8380]" />
            <input
              type="text"
              placeholder="Buscar lançamento..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#161413] border border-[#3d3a39] hover:border-[#8a8380] rounded-[3px] pl-9 pr-3 py-1.5 text-xs text-[#eeeeee] placeholder-[#8a8380] focus:border-[#eeeeee] focus:outline-none"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a8380] hover:text-[#eeeeee]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filters & Action */}
          <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar py-0.5">
            {/* Filter Pillar */}
            <div className="shrink-0 inline-flex rounded-[3px] border border-[#3d3a39] bg-[#161413] p-0.5 text-xs font-mono">
              <button
                onClick={() => onSelecionarFiltroPilar('todos')}
                className={`px-2.5 py-1 rounded-[2px] transition ${
                  filtroPilar === 'todos' ? 'bg-[#fafafa] text-[#101010]' : 'text-[#8a8380] hover:text-[#eeeeee]'
                }`}
              >
                TODOS
              </button>
              <button
                onClick={() => onSelecionarFiltroPilar('fixas')}
                className={`px-2.5 py-1 rounded-[2px] transition ${
                  filtroPilar === 'fixas' ? 'bg-[#eeeeee] text-[#101010]' : 'text-[#8a8380] hover:text-[#eeeeee]'
                }`}
              >
                FIXAS
              </button>
              <button
                onClick={() => onSelecionarFiltroPilar('superfluos')}
                className={`px-2.5 py-1 rounded-[2px] transition ${
                  filtroPilar === 'superfluos' ? 'bg-[#ee6018] text-[#101010]' : 'text-[#8a8380] hover:text-[#eeeeee]'
                }`}
              >
                SUPÉRFLUOS
              </button>
              <button
                onClick={() => onSelecionarFiltroPilar('investimentos')}
                className={`px-2.5 py-1 rounded-[2px] transition ${
                  filtroPilar === 'investimentos' ? 'bg-[#a0ca92] text-[#101010]' : 'text-[#8a8380] hover:text-[#eeeeee]'
                }`}
              >
                APORTES
              </button>
            </div>

            {/* Filter Status */}
            <div className="shrink-0 inline-flex rounded-[3px] border border-[#3d3a39] bg-[#161413] p-0.5 text-xs font-mono">
              <button
                onClick={() => setFiltroPago('todos')}
                className={`px-2 py-1 rounded-[2px] ${
                  filtroPago === 'todos' ? 'bg-[#fafafa] text-[#101010]' : 'text-[#8a8380] hover:text-[#eeeeee]'
                }`}
              >
                TODOS
              </button>
              <button
                onClick={() => setFiltroPago('pendentes')}
                className={`px-2 py-1 rounded-[2px] ${
                  filtroPago === 'pendentes' ? 'bg-[#ee6018] text-[#101010]' : 'text-[#8a8380] hover:text-[#eeeeee]'
                }`}
              >
                A PAGAR
              </button>
              <button
                onClick={() => setFiltroPago('pagos')}
                className={`px-2 py-1 rounded-[2px] ${
                  filtroPago === 'pagos' ? 'bg-[#a0ca92] text-[#101010]' : 'text-[#8a8380] hover:text-[#eeeeee]'
                }`}
              >
                PAGOS
              </button>
            </div>

            {/* New Entry Button: Light Filled Button (#fafafa fill, 3px radius, #101010 text) */}
            <button
              onClick={() => setMostrandoNovo(!mostrandoNovo)}
              className="shrink-0 whitespace-nowrap h-[32px] px-3.5 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] text-xs font-mono uppercase tracking-tight flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Lançamento</span>
            </button>
          </div>
        </div>

        {/* Formulário Novo Lançamento Rápido */}
        {mostrandoNovo && (
          <form onSubmit={submeterNovoItem} className="p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#3d3a39] pb-2">
              <span className="font-mono text-xs uppercase text-[#eeeeee]">
                + NOVO REGISTRO NO LEDGER
              </span>
              <button
                type="button"
                onClick={() => setMostrandoNovo(false)}
                className="text-[#8a8380] hover:text-[#eeeeee]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel, Supermercado..."
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2.5 py-1.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Pilar 50-30-20</label>
                <select
                  value={novaCategoria}
                  onChange={(e) => {
                    const cat = e.target.value as CategoriaOrcamentaria;
                    setNovaCategoria(cat);
                    setNovoTipo(CATEGORIAS_CONFIG[cat].subcategorias[0]);
                  }}
                  className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2 py-1.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none font-mono"
                >
                  <option value="fixas">50% Fixas</option>
                  <option value="superfluos">30% Supérfluos</option>
                  <option value="investimentos">20% Aportes</option>
                </select>
              </div>

              <div>
                <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Subcategoria</label>
                <select
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value)}
                  className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2 py-1.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none font-mono"
                >
                  {CATEGORIAS_CONFIG[novaCategoria].subcategorias.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2.5 py-1.5 text-xs font-mono text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <label className="font-mono text-[10px] text-[#8a8380] uppercase">Vencimento:</label>
                <input
                  type="text"
                  value={novoVencimento}
                  onChange={(e) => setNovoVencimento(e.target.value)}
                  placeholder="Ex: Dia 10 (Opcional)"
                  className="bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2 py-1 text-xs text-[#eeeeee] w-36 focus:border-[#eeeeee] focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrandoNovo(false)}
                  className="h-7 px-3 rounded-[3px] border border-[#3d3a39] text-xs font-mono text-[#8a8380] hover:text-[#eeeeee]"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="h-7 px-4 rounded-[3px] bg-[#fafafa] text-[#101010] font-mono text-xs uppercase"
                >
                  SALVAR REGISTRO
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tabela de Lançamentos */}
        <div className="w-full overflow-x-auto border border-[#3d3a39] rounded-[3px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#161413] border-b border-[#3d3a39] text-[#8a8380] font-mono uppercase tracking-[-0.24px] text-[11px]">
                <th className="py-2.5 px-3 w-10 text-center">Status</th>
                <th className="py-2.5 px-4">Descrição</th>
                <th className="py-2.5 px-3">Pilar</th>
                <th className="py-2.5 px-3">Subcategoria</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
                <th className="py-2.5 px-3 text-center">Vencimento</th>
                <th className="py-2.5 px-3 w-12 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d1a18]">
              {itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#8a8380] font-mono text-xs">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => {
                  const isItemEditando = editandoId === item.id;

                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-[#161413] transition-colors group"
                    >
                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onAlternarPago(item.id)}
                          className="cursor-pointer"
                          title={item.pago ? 'Pago' : 'Pendente'}
                        >
                          {item.pago ? (
                            <CheckCircle className="w-4 h-4 text-[#a0ca92]" />
                          ) : (
                            <Circle className="w-4 h-4 text-[#ee6018]" />
                          )}
                        </button>
                      </td>

                      {/* Descrição */}
                      <td className="py-2.5 px-4 font-normal text-[#eeeeee]">
                        {isItemEditando && campoEditando === 'titulo' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={valorTemp}
                              onChange={(e) => setValorTemp(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') salvarEdicao(item.id);
                                if (e.key === 'Escape') cancelarEdicao();
                              }}
                              autoFocus
                              className="bg-[#101010] border border-[#eeeeee] rounded-[3px] px-2 py-0.5 text-xs text-[#eeeeee] focus:outline-none w-full"
                            />
                            <button onClick={() => salvarEdicao(item.id)} className="text-[#a0ca92]">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelarEdicao} className="text-[#8a8380]">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => iniciarEdicao(item.id, 'titulo', item.titulo)}
                            className="cursor-pointer hover:underline"
                            title="Clique para editar"
                          >
                            {item.titulo}
                          </span>
                        )}
                      </td>

                      {/* Pilar */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                        <select
                          value={item.categoria}
                          onChange={(e) => {
                            const novaCat = e.target.value as CategoriaOrcamentaria;
                            onAtualizarItem(item.id, { 
                              categoria: novaCat,
                              tipoDetalhado: CATEGORIAS_CONFIG[novaCat].subcategorias[0]
                            });
                          }}
                          className={`bg-transparent border-0 cursor-pointer focus:outline-none ${
                            item.categoria === 'fixas' ? 'text-[#eeeeee]' : item.categoria === 'superfluos' ? 'text-[#ee6018]' : 'text-[#a0ca92]'
                          }`}
                        >
                          <option value="fixas" className="bg-[#101010] text-[#eeeeee]">Fixas (50%)</option>
                          <option value="superfluos" className="bg-[#101010] text-[#ee6018]">Supérfluos (30%)</option>
                          <option value="investimentos" className="bg-[#101010] text-[#a0ca92]">Aportes (20%)</option>
                        </select>
                      </td>

                      {/* Subcategoria */}
                      <td className="py-2.5 px-3 text-[#8a8380] whitespace-nowrap font-mono text-[11px]">
                        <select
                          value={item.tipoDetalhado}
                          onChange={(e) => onAtualizarItem(item.id, { tipoDetalhado: e.target.value })}
                          className="bg-transparent border-0 cursor-pointer text-[#8a8380] hover:text-[#eeeeee] focus:outline-none"
                        >
                          {CATEGORIAS_CONFIG[item.categoria].subcategorias.map((sub) => (
                            <option key={sub} value={sub} className="bg-[#101010] text-[#eeeeee]">
                              {sub}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Valor */}
                      <td className="py-2.5 px-3 text-right font-mono text-[#eeeeee] whitespace-nowrap">
                        {isItemEditando && campoEditando === 'valor' ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.01"
                              value={valorTemp}
                              onChange={(e) => setValorTemp(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') salvarEdicao(item.id);
                                if (e.key === 'Escape') cancelarEdicao();
                              }}
                              autoFocus
                              className="bg-[#101010] border border-[#eeeeee] rounded-[3px] px-2 py-0.5 text-xs text-[#eeeeee] focus:outline-none w-24 text-right"
                            />
                            <button onClick={() => salvarEdicao(item.id)} className="text-[#a0ca92]">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelarEdicao} className="text-[#8a8380]">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => iniciarEdicao(item.id, 'valor', item.valor)}
                            className="cursor-pointer hover:underline"
                            title="Clique para editar valor"
                          >
                            {formatarBRL(item.valor)}
                          </span>
                        )}
                      </td>

                      {/* Vencimento */}
                      <td className="py-2.5 px-3 text-center text-[#8a8380] font-mono text-[11px] whitespace-nowrap">
                        {isItemEditando && campoEditando === 'vencimento' ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="text"
                              value={valorTemp}
                              onChange={(e) => setValorTemp(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') salvarEdicao(item.id);
                                if (e.key === 'Escape') cancelarEdicao();
                              }}
                              autoFocus
                              className="bg-[#101010] border border-[#eeeeee] rounded-[3px] px-1.5 py-0.5 text-xs text-[#eeeeee] focus:outline-none w-20 text-center font-mono"
                            />
                            <button onClick={() => salvarEdicao(item.id)} className="text-[#a0ca92]">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelarEdicao} className="text-[#8a8380]">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => iniciarEdicao(item.id, 'vencimento', item.vencimento)}
                            className="cursor-pointer hover:text-[#eeeeee]"
                            title="Clique para alterar vencimento"
                          >
                            {item.vencimento}
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!item.pago && (
                            <button
                              onClick={() => {
                                const msg = gerarMensagemWhatsAppIndividual(item);
                                dispararWhatsApp(msg);
                              }}
                              className="text-[#8a8380] hover:text-[#25D366] transition-colors cursor-pointer"
                              title="Enviar lembrete no WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm(`Excluir o lançamento "${item.titulo}"?`)) {
                                onRemoverItem(item.id);
                              }
                            }}
                            className="text-[#4d4947] hover:text-[#ee6018] transition-colors cursor-pointer"
                            title="Excluir item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer do Ledger */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1d1a18] text-xs font-mono">
          <span className="text-[#8a8380]">
            REGISTROS: <span className="text-[#eeeeee]">{itensFiltrados.length}</span> DE {itens.length}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[#8a8380]">TOTAL FILTRADO:</span>
            <span className="text-sm font-normal text-[#eeeeee]">
              {formatarBRL(totalFiltrado)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
