export type CategoriaOrcamentaria = 'fixas' | 'superfluos' | 'investimentos';

export interface ItemLancamento {
  id: string;
  titulo: string;
  categoria: CategoriaOrcamentaria;
  tipoDetalhado: string;
  valor: number;
  vencimento: string;
  pago: boolean;
}

export interface MetasRegra {
  fixas: number;
  superfluos: number;
  investimentos: number;
}

export interface EstadoFinanceiro {
  rendaFamiliar: number;
  metasRegra: MetasRegra;
  itens: ItemLancamento[];
}

export interface CalculoOrcamentario {
  totalFixas: number;
  totalSuperfluos: number;
  totalInvestimentos: number;
  totalGastos: number;
  saldoLivre: number;
  taxaComprometimento: number;
  percentFixas: number;
  percentSuperfluos: number;
  percentInvestimentos: number;
  limiteFixas: number;
  limiteSuperfluos: number;
  metaInvestimentos: number;
  desvioFixas: number;
  desvioSuperfluos: number;
  desvioInvestimentos: number;
}
