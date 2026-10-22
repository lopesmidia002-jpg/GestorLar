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
  DollarSign
} from 'lucide-react';

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
  const [novoVencimento, setNovoVencimento] = useState('Dia 10');

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
    <div className="glass-panel rounded-2xl p-5 border border-[#1e2333] flex flex-col gap-4">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1e2333]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#181d2b] border border-[#2d354d] flex items-center justify-center text-[#00FF87]">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Ledger de Despesas & Aportes
              <span className="text-xs font-mono font-normal text-[#9CA3AF]">
                ({itensFiltrados.length} lançamentos)
              </span>
            </h2>
            <p className="text-xs text-[#9CA3AF]">
              Edição direta em linha (click-to-edit). Clique em qualquer valor ou título para alterar.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setMostrandoNovo(!mostrandoNovo)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00FF87] hover:bg-[#00FF87]/90 text-[#07080b] font-semibold text-xs shadow-lg shadow-[#00FF87]/20 transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Lançamento</span>
        </button>
      </div>

      {/* Formulário Novo Lançamento Rápido */}
      {mostrandoNovo && (
        <form onSubmit={submeterNovoItem} className="p-4 rounded-xl bg-[#0d0f17] border border-[#00FF87]/30 flex flex-col gap-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00FF87]">
              Adicionar Lançamento
            </span>
            <button
              type="button"
              onClick={() => setMostrandoNovo(false)}
              className="text-[#9CA3AF] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="text-[11px] text-[#9CA3AF] block mb-1">Descrição</label>
              <input
                type="text"
                required
                placeholder="Ex: Aluguel, Supermercado..."
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                className="w-full bg-[#181d2b] border border-[#2d354d] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#4B5563] focus:border-[#00FF87] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#9CA3AF] block mb-1">Pilar 50-30-20</label>
              <select
                value={novaCategoria}
                onChange={(e) => {
                  const cat = e.target.value as CategoriaOrcamentaria;
                  setNovaCategoria(cat);
                  setNovoTipo(CATEGORIAS_CONFIG[cat].subcategorias[0]);
                }}
                className="w-full bg-[#181d2b] border border-[#2d354d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#00FF87] focus:outline-none"
              >
                <option value="fixas">50% Contas Fixas</option>
                <option value="superfluos">30% Gastos Supérfluos</option>
                <option value="investimentos">20% Investimentos</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-[#9CA3AF] block mb-1">Subcategoria</label>
              <select
                value={novoTipo}
                onChange={(e) => setNovoTipo(e.target.value)}
                className="w-full bg-[#181d2b] border border-[#2d354d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#00FF87] focus:outline-none"
              >
                {CATEGORIAS_CONFIG[novaCategoria].subcategorias.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-[#9CA3AF] block mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={novoValor}
                onChange={(e) => setNovoValor(e.target.value)}
                className="w-full bg-[#181d2b] border border-[#2d354d] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:border-[#00FF87] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-[#9CA3AF]">Vencimento:</label>
              <input
                type="text"
                value={novoVencimento}
                onChange={(e) => setNovoVencimento(e.target.value)}
                placeholder="Ex: Dia 10"
                className="bg-[#181d2b] border border-[#2d354d] rounded-lg px-2.5 py-1 text-xs text-white w-28 focus:border-[#00FF87] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMostrandoNovo(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#9CA3AF] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#00FF87] text-[#07080b] font-semibold text-xs hover:bg-[#00FF87]/90 transition"
              >
                Salvar Lançamento
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Controles de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
          <input
            type="text"
            placeholder="Buscar por descrição ou categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-[#0d0f17] border border-[#1e2333] hover:border-[#2d354d] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#4B5563] focus:border-[#00FF87] focus:outline-none transition"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filtros por Categoria e Status */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex rounded-lg bg-[#0d0f17] border border-[#1e2333] p-0.5">
            <button
              onClick={() => onSelecionarFiltroPilar('todos')}
              className={`px-2.5 py-1 rounded-md transition ${filtroPilar === 'todos' ? 'bg-[#181d2b] text-white font-medium' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => onSelecionarFiltroPilar('fixas')}
              className={`px-2.5 py-1 rounded-md transition ${filtroPilar === 'fixas' ? 'bg-[#00D2FF]/20 text-[#00D2FF] font-medium' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Fixas (50%)
            </button>
            <button
              onClick={() => onSelecionarFiltroPilar('superfluos')}
              className={`px-2.5 py-1 rounded-md transition ${filtroPilar === 'superfluos' ? 'bg-[#9D00FF]/20 text-[#9D00FF] font-medium' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Supérfluos (30%)
            </button>
            <button
              onClick={() => onSelecionarFiltroPilar('investimentos')}
              className={`px-2.5 py-1 rounded-md transition ${filtroPilar === 'investimentos' ? 'bg-[#00FF87]/20 text-[#00FF87] font-medium' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Aportes (20%)
            </button>
          </div>

          <div className="inline-flex rounded-lg bg-[#0d0f17] border border-[#1e2333] p-0.5">
            <button
              onClick={() => setFiltroPago('todos')}
              className={`px-2.5 py-1 rounded-md transition ${filtroPago === 'todos' ? 'bg-[#181d2b] text-white font-medium' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Status
            </button>
            <button
              onClick={() => setFiltroPago('pendentes')}
              className={`px-2.5 py-1 rounded-md transition ${filtroPago === 'pendentes' ? 'bg-amber-500/20 text-amber-300 font-medium' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              A Pagar
            </button>
            <button
              onClick={() => setFiltroPago('pagos')}
              className={`px-2.5 py-1 rounded-md transition ${filtroPago === 'pagos' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Pagos
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="w-full overflow-x-auto rounded-xl border border-[#1e2333]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#0d0f17] border-b border-[#1e2333] text-[#9CA3AF] uppercase tracking-wider font-semibold">
              <th className="py-3 px-3 w-10 text-center">Status</th>
              <th className="py-3 px-4">Descrição</th>
              <th className="py-3 px-3">Pilar</th>
              <th className="py-3 px-3">Subcategoria</th>
              <th className="py-3 px-3 text-right">Valor (BRL)</th>
              <th className="py-3 px-3 text-center">Vencimento</th>
              <th className="py-3 px-3 w-12 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#181d2b]">
            {itensFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#4B5563]">
                  Nenhum lançamento encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              itensFiltrados.map((item) => {
                const configPilar = CATEGORIAS_CONFIG[item.categoria];
                const isItemEditando = editandoId === item.id;

                return (
                  <tr 
                    key={item.id}
                    className="hover:bg-[#121520] transition-colors group"
                  >
                    {/* Status de Pagamento */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onAlternarPago(item.id)}
                        className="transition-transform active:scale-90"
                        title={item.pago ? 'Marcar como pendente' : 'Marcar como pago'}
                      >
                        {item.pago ? (
                          <CheckCircle className="w-4 h-4 text-[#00FF87]" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#4B5563] group-hover:text-amber-400 transition-colors" />
                        )}
                      </button>
                    </td>

                    {/* Descrição com Click-to-Edit */}
                    <td className="py-3 px-4 font-medium">
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
                            className="bg-[#07080b] border border-[#00FF87] rounded px-2 py-0.5 text-xs text-white focus:outline-none w-full"
                          />
                          <button onClick={() => salvarEdicao(item.id)} className="text-[#00FF87]">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelarEdicao} className="text-[#9CA3AF]">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => iniciarEdicao(item.id, 'titulo', item.titulo)}
                          className={`cursor-pointer hover:text-[#00FF87] hover:underline transition-colors ${
                            item.pago ? 'text-[#F3F4F6]' : 'text-white'
                          }`}
                          title="Clique para editar"
                        >
                          {item.titulo}
                        </span>
                      )}
                    </td>

                    {/* Pilar 50-30-20 */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <select
                        value={item.categoria}
                        onChange={(e) => {
                          const novaCat = e.target.value as CategoriaOrcamentaria;
                          onAtualizarItem(item.id, { 
                            categoria: novaCat,
                            tipoDetalhado: CATEGORIAS_CONFIG[novaCat].subcategorias[0]
                          });
                        }}
                        className="bg-transparent border-0 cursor-pointer font-mono text-[11px] font-semibold focus:outline-none"
                        style={{ color: configPilar.corHex }}
                      >
                        <option value="fixas" className="bg-[#07080b] text-[#00D2FF]">50% Fixas</option>
                        <option value="superfluos" className="bg-[#07080b] text-[#9D00FF]">30% Supérfluos</option>
                        <option value="investimentos" className="bg-[#07080b] text-[#00FF87]">20% Aportes</option>
                      </select>
                    </td>

                    {/* Subcategoria */}
                    <td className="py-3 px-3 text-[#9CA3AF] whitespace-nowrap">
                      <select
                        value={item.tipoDetalhado}
                        onChange={(e) => onAtualizarItem(item.id, { tipoDetalhado: e.target.value })}
                        className="bg-transparent border-0 cursor-pointer text-xs text-[#9CA3AF] hover:text-white focus:outline-none"
                      >
                        {configPilar.subcategorias.map((sub) => (
                          <option key={sub} value={sub} className="bg-[#07080b] text-white">
                            {sub}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Valor em Reais (Click-to-Edit) */}
                    <td className="py-3 px-3 text-right font-mono-numeric font-bold whitespace-nowrap">
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
                            className="bg-[#07080b] border border-[#00FF87] rounded px-2 py-0.5 text-xs text-white focus:outline-none w-24 text-right"
                          />
                          <button onClick={() => salvarEdicao(item.id)} className="text-[#00FF87]">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelarEdicao} className="text-[#9CA3AF]">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => iniciarEdicao(item.id, 'valor', item.valor)}
                          className="cursor-pointer text-white hover:text-[#00FF87] hover:underline"
                          title="Clique para editar valor"
                        >
                          {formatarBRL(item.valor)}
                        </span>
                      )}
                    </td>

                    {/* Vencimento (Click-to-Edit) */}
                    <td className="py-3 px-3 text-center text-[#9CA3AF] font-mono text-[11px] whitespace-nowrap">
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
                            className="bg-[#07080b] border border-[#00FF87] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none w-20 text-center"
                          />
                          <button onClick={() => salvarEdicao(item.id)} className="text-[#00FF87]">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelarEdicao} className="text-[#9CA3AF]">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => iniciarEdicao(item.id, 'vencimento', item.vencimento)}
                          className="cursor-pointer hover:text-white hover:underline"
                          title="Clique para alterar dia de vencimento"
                        >
                          {item.vencimento}
                        </span>
                      )}
                    </td>

                    {/* Excluir */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir o lançamento "${item.titulo}"?`)) {
                            onRemoverItem(item.id);
                          }
                        }}
                        className="p-1 rounded text-[#4B5563] hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity"
                        title="Excluir item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer do Ledger com Totalizadores */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1e2333] text-xs">
        <span className="text-[#9CA3AF]">
          Exibindo <span className="font-bold text-white">{itensFiltrados.length}</span> de <span className="text-white">{itens.length}</span> lançamentos cadastrados.
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[#9CA3AF]">Total dos itens listados:</span>
          <span className="font-mono-numeric font-bold text-base text-[#00FF87]">
            {formatarBRL(totalFiltrado)}
          </span>
        </div>
      </div>
    </div>
  );
};
