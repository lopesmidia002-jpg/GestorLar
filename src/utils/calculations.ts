import type { EstadoFinanceiro, CalculoOrcamentario, CategoriaOrcamentaria } from '../types/finance';

export function formatarBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function formatarPercentual(valor: number): string {
  return `${valor.toFixed(1).replace('.', ',')}%`;
}

export function parseMoedaBR(input: string | number): number {
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  if (!input || typeof input !== 'string') return 0;
  
  let str = input.trim();
  str = str.replace(/[R$\s]/g, '');
  
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  
  str = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}

export function calcularOrcamento(estado: EstadoFinanceiro): CalculoOrcamentario {
  const renda = estado.rendaFamiliar || 1; // Evita divisão por zero
  
  let totalFixas = 0;
  let totalSuperfluos = 0;
  let totalInvestimentos = 0;

  for (const item of estado.itens) {
    if (item.categoria === 'fixas') {
      totalFixas += item.valor;
    } else if (item.categoria === 'superfluos') {
      totalSuperfluos += item.valor;
    } else if (item.categoria === 'investimentos') {
      totalInvestimentos += item.valor;
    }
  }

  const totalGastos = totalFixas + totalSuperfluos + totalInvestimentos;
  const saldoLivre = estado.rendaFamiliar - totalGastos;
  const taxaComprometimento = (totalGastos / renda) * 100;

  const percentFixas = (totalFixas / renda) * 100;
  const percentSuperfluos = (totalSuperfluos / renda) * 100;
  const percentInvestimentos = (totalInvestimentos / renda) * 100;

  const limiteFixas = (estado.rendaFamiliar * estado.metasRegra.fixas) / 100;
  const limiteSuperfluos = (estado.rendaFamiliar * estado.metasRegra.superfluos) / 100;
  const metaInvestimentos = (estado.rendaFamiliar * estado.metasRegra.investimentos) / 100;

  return {
    totalFixas,
    totalSuperfluos,
    totalInvestimentos,
    totalGastos,
    saldoLivre,
    taxaComprometimento,
    percentFixas,
    percentSuperfluos,
    percentInvestimentos,
    limiteFixas,
    limiteSuperfluos,
    metaInvestimentos,
    desvioFixas: totalFixas - limiteFixas,
    desvioSuperfluos: totalSuperfluos - limiteSuperfluos,
    desvioInvestimentos: totalInvestimentos - metaInvestimentos,
  };
}

export const CATEGORIAS_CONFIG: Record<
  CategoriaOrcamentaria,
  {
    nome: string;
    corHex: string;
    metaPadrao: number;
    subcategorias: string[];
    descricao: string;
  }
> = {
  fixas: {
    nome: 'Contas Fixas',
    corHex: '#00D2FF',
    metaPadrao: 50,
    subcategorias: [
      'Moradia',
      'Alimentação Básica',
      'Energia',
      'Água',
      'Telecomunicações',
      'Saúde & Medicamentos',
      'Educação / Transporte'
    ],
    descricao: 'Compromissos essenciais e sobrevivência (Teto: 50%)',
  },
  superfluos: {
    nome: 'Gastos Supérfluos',
    corHex: '#9D00FF',
    metaPadrao: 30,
    subcategorias: [
      'Restaurantes',
      'Delivery',
      'Streaming',
      'Vestuário',
      'Lazer & Viagens',
      'Eletrônicos & Hobbies'
    ],
    descricao: 'Estilo de vida e gastos discricionários (Teto: 30%)',
  },
  investimentos: {
    nome: 'Investimentos & Reserva',
    corHex: '#00FF87',
    metaPadrao: 20,
    subcategorias: [
      'CDB Liquidez',
      'Tesouro Direto',
      'Ações',
      'Fundos Imobiliários',
      'Cripto / Outros',
      'Reserva de Emergência'
    ],
    descricao: 'Construção de autonomia financeira (Meta mínima: 20%)',
  },
};
