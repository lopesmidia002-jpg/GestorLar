import type { EstadoFinanceiro } from '../types/finance';

export const ESTADO_INICIAL: EstadoFinanceiro = {
  rendaFamiliar: 12500.00,
  metasRegra: {
    fixas: 50,
    superfluos: 30,
    investimentos: 20
  },
  itens: [
    {
      id: "item_uuid_01",
      titulo: "Aluguel / Parcela Imobiliária",
      categoria: "fixas",
      tipoDetalhado: "Moradia",
      valor: 3200.00,
      vencimento: "Dia 10",
      pago: true
    },
    {
      id: "item_uuid_02",
      titulo: "Mercado & Alimentação Básica",
      categoria: "fixas",
      tipoDetalhado: "Alimentação Básica",
      valor: 1450.00,
      vencimento: "Dia 15",
      pago: true
    },
    {
      id: "item_uuid_03",
      titulo: "Energia Elétrica",
      categoria: "fixas",
      tipoDetalhado: "Energia",
      valor: 380.00,
      vencimento: "Dia 18",
      pago: true
    },
    {
      id: "item_uuid_04",
      titulo: "Água e Esgoto",
      categoria: "fixas",
      tipoDetalhado: "Água",
      valor: 120.00,
      vencimento: "Dia 20",
      pago: true
    },
    {
      id: "item_uuid_05",
      titulo: "Internet Fibra Óptica & Celular",
      categoria: "fixas",
      tipoDetalhado: "Telecomunicações",
      valor: 190.00,
      vencimento: "Dia 25",
      pago: false
    },
    {
      id: "item_uuid_06",
      titulo: "Restaurantes & Jantares Fora",
      categoria: "superfluos",
      tipoDetalhado: "Restaurantes",
      valor: 850.00,
      vencimento: "Dia 12",
      pago: true
    },
    {
      id: "item_uuid_07",
      titulo: "Assinaturas de Streaming (Netflix / Spotify)",
      categoria: "superfluos",
      tipoDetalhado: "Streaming",
      valor: 110.00,
      vencimento: "Dia 08",
      pago: true
    },
    {
      id: "item_uuid_08",
      titulo: "Delivery & Apps de Comida",
      categoria: "superfluos",
      tipoDetalhado: "Delivery",
      valor: 420.00,
      vencimento: "Dia 22",
      pago: false
    },
    {
      id: "item_uuid_09",
      titulo: "Vestuário & Cuidados Pessoais",
      categoria: "superfluos",
      tipoDetalhado: "Vestuário",
      valor: 350.00,
      vencimento: "Dia 28",
      pago: false
    },
    {
      id: "item_uuid_10",
      titulo: "Reserva de Oportunidade (CDB)",
      categoria: "investimentos",
      tipoDetalhado: "CDB Liquidez",
      valor: 1200.00,
      vencimento: "Dia 05",
      pago: true
    },
    {
      id: "item_uuid_11",
      titulo: "Tesouro IPCA+ 2035",
      categoria: "investimentos",
      tipoDetalhado: "Tesouro Direto",
      valor: 800.00,
      vencimento: "Dia 05",
      pago: true
    },
    {
      id: "item_uuid_12",
      titulo: "Ações & Fundos Imobiliários",
      categoria: "investimentos",
      tipoDetalhado: "Fundos Imobiliários",
      valor: 500.00,
      vencimento: "Dia 05",
      pago: false
    }
  ]
};
