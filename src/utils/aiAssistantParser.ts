import type { CategoriaOrcamentaria, EstadoFinanceiro, ItemLancamento } from '../types/finance';
import { CATEGORIAS_CONFIG, formatarBRL, calcularOrcamento } from './calculations';

export interface AssistantActionResult {
  mensagemResposta: string;
  sucesso: boolean;
  acaoExecutada?: string;
  itensModificados?: number;
}

export interface AssistantActions {
  adicionarItem: (item: {
    titulo: string;
    valor: number;
    categoria: CategoriaOrcamentaria;
    tipoDetalhado: string;
    vencimento: string;
    pago: boolean;
  }) => void;
  atualizarItem: (id: string, updates: Partial<ItemLancamento>) => void;
  removerItem: (id: string) => void;
  alternarPago: (id: string) => void;
  atualizarRenda: (novaRenda: number) => void;
  atualizarMetas: (novasMetas: { fixas?: number; superfluos?: number; investimentos?: number }) => void;
  zerarPainel?: (manterRenda?: boolean) => void;
}

// =========================================================================
// 1. DICIONÁRIO SEMÂNTICO HIPER-EXPANDIDO EM PORTUGUÊS (600+ TERMOS E SINÔNIMOS)
// =========================================================================

export const DICIONARIO_CATEGORIAS: Record<
  CategoriaOrcamentaria,
  {
    subcategorias: Record<string, string[]>;
    palavrasGerais: string[];
    subcategoriaPadrao: string;
  }
> = {
  fixas: {
    subcategoriaPadrao: 'Moradia',
    palavrasGerais: [
      'fixo', 'fixa', 'essencial', 'essenciais', 'obrigatória', 'obrigatoria', 'obrigatório',
      'básico', 'basico', 'básica', 'basica', 'conta', 'boleto', 'mensalidade', 'fatura básica', 'tarifa'
    ],
    subcategorias: {
      'Moradia': [
        'aluguel', 'condomínio', 'condominio', 'prestação', 'prestacao', 'financiamento imobiliário',
        'financiamento da casa', 'iptu', 'seguro residencial', 'imobiliária', 'imobiliaria', 'quintoandar',
        'loft', 'diarista', 'faxina', 'zeladoria', 'reforma da casa', 'manutenção residencial', 'reparo',
        'encanador', 'eletricista', 'chaveiro', 'pintor', 'marceneiro', 'taxa de lixo', 'sindico'
      ],
      'Energia': [
        'luz', 'energia', 'eletricidade', 'enel', 'cpfl', 'cemig', 'copel', 'eletropaulo', 'energisa',
        'celesc', 'coelba', 'light', 'conta de luz', 'fatura de luz',
        'gás', 'gas', 'botijão', 'botijao', 'comgás', 'comgas', 'ultragaz', 'supergasbras', 'liquigas'
      ],
      'Água': [
        'água', 'agua', 'sabesp', 'copasa', 'sanepar', 'caesb', 'compesa', 'embasa', 'saae',
        'esgoto', 'saneamento', 'conta de água', 'fatura de água'
      ],
      'Telecomunicações': [
        'internet', 'fibra', 'wi-fi', 'wifi', 'banda larga', 'celular', 'plano de celular',
        'claro', 'vivo', 'tim', 'oi', 'recarga', 'telefone', 'fatura celular', 'fatura telefone'
      ],
      'Alimentação Básica': [
        'mercado', 'supermercado', 'compras do mês', 'alimentação básica', 'açougue', 'acougue',
        'feira', 'hortifruti', 'sacolão', 'sacolao', 'atacadão', 'atacadao', 'assaí', 'assai',
        'carrefour', 'pão de açúcar', 'extra', 'dia', 'tenda', 'roldão', 'manteiga', 'arroz',
        'feijão', 'leite', 'café moído', 'cesta básica', 'cesta basica'
      ],
      'Saúde': [
        'saúde', 'saude', 'plano de saúde', 'convênio', 'convenio', 'unimed', 'sulamerica', 'sul américa',
        'bradesco saúde', 'notredame', 'intermédica', 'amil', 'hapvida', 'farmácia', 'farmacia',
        'drogaria', 'drogasil', 'raia', 'droga raia', 'pacheco', 'são paulo', 'panvel', 'remédio',
        'remedio', 'medicamento', 'dentista', 'consulta', 'exame', 'terapia', 'psicólogo', 'psiquiatra',
        'oftalmo', 'óculos', 'fisioterapia'
      ],
      'Educação': [
        'escola', 'faculdade', 'colégio', 'colegio', 'mensalidade escolar', 'curso', 'pós', 'pos',
        'graduação', 'livro didático', 'material escolar', 'creche', 'universidade', 'apostila'
      ],
      'Transporte Essencial': [
        'combustível', 'combustivel', 'gasolina', 'etanol', 'álcool', 'alcohol', 'diesel', 'gnv',
        'posto', 'ipiranga', 'shell', 'br', 'ipva', 'seguro do carro', 'seguro auto', 'seguro moto',
        'mecânico', 'mecanico', 'revisão', 'oficina', 'troca de óleo', 'pneu', 'pedágio', 'pedagio',
        'sem parar', 'veloe', 'conectcar', 'bilhete único', 'passe', 'ônibus', 'onibus', 'metrô', 'metro',
        'estacionamento mensal'
      ],
      'Pet & Animais': [
        'pet', 'pet shop', 'petshop', 'ração', 'racao', 'veterinário', 'veterinario', 'vacina cachorro',
        'vacina gato', 'cachorro', 'gato', 'cobasi', 'petz', 'banho e tosa'
      ],
    },
  },

  superfluos: {
    subcategoriaPadrao: 'Restaurantes',
    palavrasGerais: [
      'supérfluo', 'superfluo', 'lazer', 'estilo de vida', 'diversão', 'diversao',
      'besteira', 'passeio', 'luxo', 'vontade', 'gastos variáveis', 'variaveis'
    ],
    subcategorias: {
      'Restaurantes': [
        'restaurante', 'almoço', 'almoco', 'jantar', 'lanche', 'pizza', 'pizzaria', 'hambúrguer',
        'hamburguer', 'burguer', 'mc donalds', 'mcdonalds', 'bk', 'burger king', 'subway', 'bobs',
        'sushi', 'japonês', 'japones', 'rodízio', 'rodizio', 'outback', 'churrascaria', 'bar',
        'barzinho', 'boteco', 'cerveja', 'chope', 'chopp', 'vinho', 'drinks', 'happy hour',
        'padaria gourmet', 'café', 'cafe', 'starbucks', 'sorvete', 'açaí', 'acai', 'doceria',
        'pastel', 'esfirra', 'habibs', 'churrasco'
      ],
      'Delivery': [
        'ifood', 'delivery', 'rappi', 'aiqfome', 'entrega', 'zé delivery', 'ze delivery', 'tele entrega',
        'marmita', 'quentinha'
      ],
      'Streaming & Assinaturas': [
        'netflix', 'spotify', 'amazon prime', 'prime video', 'disney', 'disney+', 'hbo', 'max',
        'hbo max', 'youtube premium', 'streaming', 'globoplay', 'apple tv', 'deezer', 'crunchyroll',
        'paramount', 'twitch', 'chatgpt', 'openai', 'icloud', 'google one', 'canva', 'adobe'
      ],
      'Vestuário & Moda': [
        'roupa', 'roupas', 'vestuário', 'vestuario', 'tênis', 'tenis', 'sapato', 'sandália', 'bota',
        'camisa', 'camiseta', 'calça', 'calca', 'bermuda', 'vestido', 'casaco', 'jaqueta', 'shopping',
        'loja', 'zara', 'renner', 'riachuelo', 'c&a', 'shein', 'nike', 'adidas', 'marisa', 'centauro'
      ],
      'Cuidados Pessoais': [
        'salão', 'salao', 'cabeleireiro', 'barbearia', 'barbeiro', 'manicure', 'pedicure', 'estética',
        'estetica', 'sobrancelha', 'depilação', 'perfume', 'maquiagem', 'boticário', 'boticario',
        'natura', 'sephora', 'skincare', 'massagem', 'spa', 'cosméticos'
      ],
      'Lazer & Viagens': [
        'viagem', 'passagem aérea', 'voo', 'hotel', 'pousada', 'airbnb', 'mala', 'cinema', 'cinemark',
        'ingresso', 'show', 'concerto', 'festival', 'teatro', 'museu', 'festa', 'balada', 'parque',
        'clube', 'uber', '99', '99pop', 'táxi', 'taxi', 'corrida'
      ],
      'Eletrônicos & Games': [
        'videogame', 'game', 'jogo', 'playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch', 'steam',
        'headset', 'mouse', 'teclado gamer', 'celular novo', 'gadget', 'eletrônico', 'eletronico',
        'fone de ouvido', 'airpods', 'jbl', 'caixa de som'
      ],
      'Esportes & Fitness': [
        'academia', 'smart fit', 'smartfit', 'bluefit', 'bio ritmo', 'panobianco', 'gympass',
        'totalpass', 'crossfit', 'pilates', 'natação', 'personal', 'personal trainer', 'whey',
        'creatina', 'suplemento'
      ],
      'Compras Gerais': [
        'compras online', 'mercado livre', 'shopee', 'aliexpress', 'amazon compras', 'presente', 'decoração'
      ],
    },
  },

  investimentos: {
    subcategoriaPadrao: 'CDB Liquidez',
    palavrasGerais: [
      'investir', 'investimento', 'investi', 'aporte', 'aportar', 'aportes', 'guardar', 'guardei',
      'poupar', 'poupei', 'aplicação', 'aplicacao', 'apliquei', 'patrimônio', 'patrimonio',
      'futuro', 'poupança', 'poupanca', 'liberdade financeira'
    ],
    subcategorias: {
      'CDB Liquidez': [
        'cdb', 'cdb liquidez', 'cdb 100%', 'caixinha', 'nubank caixinha', 'porquinho',
        'inter poupança', 'sofisa', 'banco c6', 'c6 bank', 'lci', 'lca', 'cri', 'cra', 'debênture'
      ],
      'Tesouro Direto': [
        'tesouro', 'selic', 'tesouro selic', 'ipca', 'tesouro ipca', 'prefixado', 'renda fixa', 'títulos'
      ],
      'Reserva de Emergência': [
        'reserva', 'emergência', 'emergencia', 'fundo de emergência', 'segurança financeira'
      ],
      'Ações & FIIs': [
        'ação', 'acao', 'ações', 'acoes', 'fii', 'fiis', 'fundo imobiliário', 'fundos imobiliarios',
        'bovespa', 'b3', 'bolsa', 'dividendo', 'dividendos', 'etf', 'ivvb11', 'smal11', 'renda variável',
        'itaúsa', 'vale', 'petrobras'
      ],
      'Criptoativos': [
        'bitcoin', 'btc', 'cripto', 'crypto', 'ethereum', 'eth', 'binance', 'criptomoeda', 'satoshi', 'solana'
      ],
      'Corretoras & Previdência': [
        'xp', 'rico', 'clear', 'nuinvest', 'btg', 'btg pactual', 'previdência', 'previdencia', 'pgbl', 'vgbl'
      ],
    },
  },
};

// =========================================================================
// 2. PARSER AVANÇADO DE NÚMEROS, GÍRIAS E MOEDAS EM PORTUGUÊS
// =========================================================================

const MAPA_EXTENSO: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
  quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500,
  seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700,
  oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
  mil: 1000,
};

/**
 * Converte qualquer representação textual de valor em número float válido.
 * Suporta formatos numéricos, abreviações (k/mil), gírias populares (conto, pau, mangos, pila)
 * e números por extenso simples ou compostos ("dois mil e quinhentos", "15 conto e cinquenta").
 */
export function normalizarValorMonetario(texto: string): number | null {
  if (!texto) return null;
  const t = texto.toLowerCase().trim();

  // 1. Suporte a compostos "X mil e Y" (ex: "2 mil e quinhentos" -> 2500, "10 mil e 500" -> 10500)
  const regexMilComposto = /(\d+(?:[.,]\d+)?)\s*mil(?:\s+e\s+(\d+|[a-zá-ú]+))?/i;
  const matchMilComposto = t.match(regexMilComposto);
  if (matchMilComposto) {
    const baseMil = parseFloat(matchMilComposto[1].replace(',', '.'));
    let adicao = 0;
    if (matchMilComposto[2]) {
      const parte2 = matchMilComposto[2].trim();
      const numDireto = parseFloat(parte2);
      if (!isNaN(numDireto)) {
        adicao = numDireto;
      } else if (MAPA_EXTENSO[parte2]) {
        adicao = MAPA_EXTENSO[parte2];
      }
    }
    if (!isNaN(baseMil) && baseMil > 0) {
      return Math.round((baseMil * 1000 + adicao) * 100) / 100;
    }
  }

  // 2. Suporte a sufixo "k" (ex: "8k" -> 8000, "3.5k" -> 3500, "12k e 500" -> 12500)
  const regexKComposto = /(\d+(?:[.,]\d+)?)\s*k(?:\s+e\s+(\d+))?/i;
  const matchK = t.match(regexKComposto);
  if (matchK) {
    const baseK = parseFloat(matchK[1].replace(',', '.'));
    const adicao = matchK[2] ? parseFloat(matchK[2]) : 0;
    if (!isNaN(baseK) && baseK > 0) {
      return Math.round((baseK * 1000 + (isNaN(adicao) ? 0 : adicao)) * 100) / 100;
    }
  }

  // 3. Suporte a gírias brasileiras com centavos opcionais (ex: "50 conto e 50", "100 paus", "25 pila")
  const regexGirias = /(\d+(?:[.,]\d+)?)\s*(?:contos?|paus?|mangos?|pilas?|pratas?|reais|real)(?:\s+e\s+(\d{1,2}))?/i;
  const matchGiria = t.match(regexGirias);
  if (matchGiria) {
    const base = parseFloat(matchGiria[1].replace('.', '').replace(',', '.'));
    const centavos = matchGiria[2] ? parseFloat(matchGiria[2]) / 100 : 0;
    if (!isNaN(base) && base > 0) return Math.round((base + centavos) * 100) / 100;
  }

  // 4. Formato monetário brasileiro padrão (R$ 1.500,50 ou 1500,50)
  const limpo = t.replace(/r\$\s?/gi, '');
  const matchBR = limpo.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)/);
  if (matchBR) {
    const num = parseFloat(matchBR[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(num) && num > 0) return Math.round(num * 100) / 100;
  }

  // 5. Números simples decimais ou inteiros (ex: 150,50 ou 150.50 ou 150)
  const matchSimples = limpo.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (matchSimples) {
    const num = parseFloat(matchSimples[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) return Math.round(num * 100) / 100;
  }

  // 6. Números por extenso compostos (ex: "mil e duzentos", "trezentos e cinquenta")
  const palavras = t.split(/[\s,]+/);
  let somaExtenso = 0;
  let valorCorrente = 0;
  let encontrouNumero = false;

  for (const p of palavras) {
    if (MAPA_EXTENSO[p] !== undefined) {
      encontrouNumero = true;
      const val = MAPA_EXTENSO[p];
      if (val === 1000) {
        valorCorrente = (valorCorrente === 0 ? 1 : valorCorrente) * 1000;
        somaExtenso += valorCorrente;
        valorCorrente = 0;
      } else {
        valorCorrente += val;
      }
    }
  }
  somaExtenso += valorCorrente;

  if (encontrouNumero && somaExtenso > 0) {
    return somaExtenso;
  }

  return null;
}

// =========================================================================
// 3. CLASSIFICAÇÃO SEMÂNTICA AUTOMÁTICA DE CATEGORIA E SUBCATEGORIA
// =========================================================================

/**
 * Detecta se o usuário especificou expressamente o pilar de alocação no comando.
 * Ex: "como supérfluo", "gasto supérfluos", "no pilar fixas", "como investimento", etc.
 */
export function detectarPilarExplicito(texto: string): CategoriaOrcamentaria | null {
  if (!texto) return null;
  const t = texto.toLowerCase();

  // 1. Supérfluos / Estilo de Vida / Variáveis / Discricionários
  // Ex: "como supérfluo", "gasto supérfluos", "supérfluos mercado", "no supérfluo", "pilar supérfluos", "estilo de vida"
  const regexSuperfluos = /\b(?:como|no|nos|em|pilar(?:\s+de)?|categoria|gasto|gastos|despesa|despesas)\s+(?:sup[eé]rfluos?|estilo\s+de\s+vida|vari[aá]ve(?:l|is)|discricion[aá]rios?|lazer)\b|\b(?:sup[eé]rfluos?|estilo\s+de\s+vida|discricion[aá]rios?)\b/i;
  
  // 2. Fixas / Essenciais / Básicas
  // Ex: "como fixa", "como fixas", "no fixo", "gasto fixo", "despesa fixa", "contas fixas", "pilar fixo", "essencial"
  const regexFixas = /\b(?:como|no|nos|na|nas|em|pilar(?:\s+de)?|categoria|gasto|gastos|despesa|despesas|conta|contas)\s+(?:fix[ao]s?|essencia(?:l|is)|b[aá]sic[ao]s?|obrigat[oó]ri[ao]s?)\b|\b(?:contas?\s+fix[ao]s?|despesas?\s+fix[ao]s?|gastos?\s+fix[ao]s?)\b/i;

  // 3. Investimentos / Aportes / Reserva
  // Ex: "como investimento", "nos investimentos", "como aporte", "pilar investimento", "na reserva"
  const regexInvestimentos = /\b(?:como|no|nos|em|pilar(?:\s+de)?|categoria|para|pra)\s+(?:investimentos?|aportes?|reserva(?:\s+de\s+emerg[eê]ncia)?|poupan[cç]a)\b|\b(?:investimentos?|aportes?)\b/i;

  if (regexSuperfluos.test(t)) {
    return 'superfluos';
  }
  if (regexFixas.test(t)) {
    return 'fixas';
  }
  if (regexInvestimentos.test(t)) {
    return 'investimentos';
  }

  return null;
}

export function identificarCategoriaESubcategoria(
  texto: string,
  contextoGeral?: string
): {
  categoria: CategoriaOrcamentaria;
  subcategoria: string;
} {
  const t = texto.toLowerCase();

  // 1. PRIORIDADE MÁXIMA: Checagem de Pilar Explícito citado pelo usuário no áudio/texto
  const pilarExplicito = detectarPilarExplicito(t) || (contextoGeral ? detectarPilarExplicito(contextoGeral) : null);

  if (pilarExplicito) {
    const config = DICIONARIO_CATEGORIAS[pilarExplicito];

    // Busca se há subcategoria específica compatível dentro do pilar solicitado
    for (const [subNome, palavras] of Object.entries(config.subcategorias)) {
      for (const p of palavras) {
        const regex = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(t)) {
          return { categoria: pilarExplicito, subcategoria: subNome };
        }
      }
    }

    // Mapeamentos semânticos inteligentes quando um item for forçado no pilar supérfluos
    if (pilarExplicito === 'superfluos') {
      if (/\b(?:mercado|supermercado|compras?|feira|a[çc]ougue|hortifruti)\b/i.test(t)) {
        return { categoria: 'superfluos', subcategoria: 'Compras Gerais' };
      }
      if (/\b(?:farm[aá]cia|drogaria|rem[eé]dio|medicamento)\b/i.test(t)) {
        return { categoria: 'superfluos', subcategoria: 'Cuidados Pessoais' };
      }
      if (/\b(?:uber|99|t[aá]xi|corrida|transporte)\b/i.test(t)) {
        return { categoria: 'superfluos', subcategoria: 'Lazer & Viagens' };
      }
      return { categoria: 'superfluos', subcategoria: config.subcategoriaPadrao };
    }

    // Mapeamentos semânticos inteligentes quando um item for forçado no pilar fixas
    if (pilarExplicito === 'fixas') {
      if (/\b(?:uber|99|gasolina|combust[ií]vel|transporte|posto)\b/i.test(t)) {
        return { categoria: 'fixas', subcategoria: 'Transporte Essencial' };
      }
      if (/\b(?:restaurante|almo[cç]o|jantar|lanche|marmita|refei[cç][aã]o)\b/i.test(t)) {
        return { categoria: 'fixas', subcategoria: 'Alimentação Básica' };
      }
      return { categoria: 'fixas', subcategoria: config.subcategoriaPadrao };
    }

    // Mapeamentos inteligentes quando forçado no pilar investimentos
    if (pilarExplicito === 'investimentos') {
      if (/\b(?:reserva|emerg[eê]ncia)\b/i.test(t)) {
        return { categoria: 'investimentos', subcategoria: 'Reserva de Emergência' };
      }
      return { categoria: 'investimentos', subcategoria: config.subcategoriaPadrao };
    }
  }

  // 2. DETECÇÃO SEMÂNTICA PADRÃO (Ordem: 1. Investimentos, 2. Fixas, 3. Supérfluos)
  for (const cat of ['investimentos', 'fixas', 'superfluos'] as CategoriaOrcamentaria[]) {
    const catConfig = DICIONARIO_CATEGORIAS[cat];

    // Checagem de subcategorias específicas com termos compostos ou palavras inteiras COM WORD BOUNDARY
    // SEM t.includes(p) para evitar falsos positivos como "gas" dentro de "gasto"!
    for (const [subNome, palavras] of Object.entries(catConfig.subcategorias)) {
      for (const p of palavras) {
        const regex = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(t)) {
          return { categoria: cat, subcategoria: subNome };
        }
      }
    }

    // Checagem de palavras gerais do pilar
    for (const p of catConfig.palavrasGerais) {
      const regex = new RegExp(`\\b${p}\\b`, 'i');
      if (regex.test(t)) {
        return { categoria: cat, subcategoria: catConfig.subcategoriaPadrao };
      }
    }
  }

  // Supérfluos como fallback seguro
  return { categoria: 'superfluos', subcategoria: 'Restaurantes' };
}

// =========================================================================
// 4. EXTRAÇÃO INTELIGENTE DO TÍTULO DO LANÇAMENTO
// =========================================================================

const STOPWORDS_LANCAMENTO = [
  // Ações e verbos de inserção
  'adicionar', 'adiciona', 'adicione', 'adicionar aí', 'lançar', 'lancar', 'lanca', 'lance', 'novo', 'nova',
  'despesa', 'despesas', 'gasto', 'gastos', 'gastei', 'comprei', 'paguei', 'quitei', 'coloque', 'coloca', 'colocar',
  'bota', 'bote', 'botar', 'anota', 'anote', 'anotar', 'insere', 'insira', 'inserir', 'registra', 'registre', 'registrar',

  // Conectivos e preposições
  'como', 'no', 'na', 'nos', 'nas', 'de', 'do', 'da', 'dos', 'das', 'por', 'pra', 'para', 'pro', 'pros', 'pras',
  'em', 'um', 'uma', 'uns', 'umas', 'reais', 'real', 'conto', 'contos', 'pau', 'paus',
  'mango', 'mangos', 'pila', 'pilas', 'hoje', 'ontem', 'aqui', 'mais', 'favor', 'por favor',
  'r$', 'pix', 'cartão', 'cartao', 'debito', 'débito', 'credito', 'crédito', 'comprei um', 'comprei uma',
  'paguei o', 'paguei a', 'ia', 'bot', 'assistente', 'anota aí', 'bota aí',

  // Nomes de Pilares e Categorias (para que não contaminem o título do gasto)
  'supérfluo', 'supérfluos', 'superfluo', 'superfluos', 'estilo de vida', 'variável', 'variáveis', 'variavel', 'variaveis',
  'discricionário', 'discricionários', 'discricionario', 'discricionarios',
  'fixo', 'fixa', 'fixos', 'fixas', 'essencial', 'essenciais', 'básico', 'básica', 'basico', 'basica',
  'investimento', 'investimentos', 'aporte', 'aportes', 'reserva',
  'pilar', 'pilares', 'categoria', 'categorias', 'classificação', 'classificacao', 'conta', 'contas'
];

export function extrairTituloLimpo(texto: string, subcategoriaPadrao: string): string {
  let limpo = texto.toLowerCase();

  // Remove valores numéricos e marcadores de quantia
  limpo = limpo.replace(/r\$\s?/gi, '');
  limpo = limpo.replace(/\b\d+(?:[.,]\d+)?\s*(?:k|mil|contos?|paus?|mangos?|pilas?|pratas?|reais|real)?\b/gi, '');

  // Remove números por extenso para que não contaminem o título da despesa
  for (const numExtenso of Object.keys(MAPA_EXTENSO)) {
    const regExt = new RegExp(`\\b${numExtenso}\\b`, 'gi');
    limpo = limpo.replace(regExt, ' ');
  }

  // Remove menções explícitas a dia de vencimento para não contaminar o título
  limpo = limpo.replace(/\b(?:vence\s*(?:no\s*)?|vencimento\s*(?:no\s*|para\s*|pra\s*|pro\s*)?|para\s*o\s*|pra\s*o\s*|pro\s*|no\s*)?dia\s*0?([1-9]|[12]\d|3[01])\b/gi, ' ');
  limpo = limpo.replace(/\bdia\b/gi, ' ');

  // Remove stopwords conversacionais e nomes de pilares
  for (const sw of STOPWORDS_LANCAMENTO) {
    const reg = new RegExp(`\\b${sw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    limpo = limpo.replace(reg, ' ');
  }

  // Normaliza pontuação e espaços
  limpo = limpo.replace(/[.,;!?]/g, ' ').replace(/\s+/g, ' ').trim();

  if (limpo.length >= 2) {
    // Capitaliza a primeira letra de cada palavra
    return limpo
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  if (subcategoriaPadrao && subcategoriaPadrao !== 'Restaurantes' && subcategoriaPadrao !== 'Moradia') {
    return subcategoriaPadrao;
  }

  return 'Despesa';
}

// =========================================================================
// 4.1 EXTRAÇÃO E HIGIENIZAÇÃO DE VENCIMENTO FALADO
// =========================================================================

export const MAPA_DIAS_EXTENSO: Record<string, number> = {
  'primeiro': 1, 'um': 1, 'dois': 2, 'três': 3, 'tres': 3, 'quatro': 4, 'cinco': 5,
  'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10, 'onze': 11, 'doze': 12,
  'treze': 13, 'quatorze': 14, 'catorze': 14, 'quinze': 15, 'dezesseis': 16,
  'dezessete': 17, 'dezoito': 18, 'dezenove': 19, 'vinte': 20, 'vinte e um': 21,
  'vinte e dois': 22, 'vinte e três': 23, 'vinte e tres': 23, 'vinte e quatro': 24,
  'vinte e cinco': 25, 'vinte e seis': 26, 'vinte e sete': 27, 'vinte e oito': 28,
  'vinte e nove': 29, 'trinta': 30, 'trinta e um': 31,
};

export function extrairVencimentoFalado(texto: string): {
  vencimento: string;
  textoSemVencimento: string;
  diaDetectado: number | null;
} {
  const t = texto.toLowerCase();

  // 1. Padrão explícito com dígitos: "dia 10", "pro dia 10", "pra o dia 5", "vence dia 8", "no dia 15"
  const regexDiaDigitos = /\b(?:vence\s*(?:no\s*)?|vencimento\s*(?:no\s*|para\s*|pra\s*|pro\s*)?|para\s*o\s*|pra\s*o\s*|pro\s*|no\s*)?dia\s*0?([1-9]|[12]\d|3[01])\b/i;
  const matchDigitos = t.match(regexDiaDigitos);
  if (matchDigitos) {
    const diaNum = parseInt(matchDigitos[1], 10);
    const vencimentoFormatado = `Dia ${diaNum.toString().padStart(2, '0')}`;
    const textoLimpo = texto.replace(matchDigitos[0], ' ');
    return {
      vencimento: vencimentoFormatado,
      textoSemVencimento: textoLimpo,
      diaDetectado: diaNum,
    };
  }

  // 2. Padrão com números por extenso: "dia dez", "dia quinze", "pro dia vinte e cinco", etc.
  for (const [extenso, diaNum] of Object.entries(MAPA_DIAS_EXTENSO)) {
    const regexExtenso = new RegExp(`\\b(?:vence\\s*(?:no\s*)?|vencimento\\s*(?:no\s*|para\s*|pra\s*|pro\s*)?|para\\s*o\\s*|pra\\s*o\\s*|pro\s*|no\\s*)?dia\\s+${extenso}\\b`, 'i');
    const matchExt = t.match(regexExtenso);
    if (matchExt) {
      const vencimentoFormatado = `Dia ${diaNum.toString().padStart(2, '0')}`;
      const textoLimpo = texto.replace(matchExt[0], ' ');
      return {
        vencimento: vencimentoFormatado,
        textoSemVencimento: textoLimpo,
        diaDetectado: diaNum,
      };
    }
  }

  // 3. Padrão de data completa DD/MM ou DD/MM/AAAA (ex: "15/11", "20/12/2026")
  const regexDataBR = /\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])(?:\/(\d{2,4}))?\b/;
  const matchData = t.match(regexDataBR);
  if (matchData) {
    const diaNum = parseInt(matchData[1], 10);
    const mesNum = parseInt(matchData[2], 10);
    const anoAtual = new Date().getFullYear();
    const anoNum = matchData[3] ? (matchData[3].length === 2 ? 2000 + parseInt(matchData[3], 10) : parseInt(matchData[3], 10)) : anoAtual;
    const formatada = `${diaNum.toString().padStart(2, '0')}/${mesNum.toString().padStart(2, '0')}/${anoNum}`;
    const textoLimpo = texto.replace(matchData[0], ' ');
    return {
      vencimento: formatada,
      textoSemVencimento: textoLimpo,
      diaDetectado: diaNum,
    };
  }

  // 4. Se o usuário NÃO falou nenhum dia, retorna "A definir" e diaDetectado = null (Não agenda no calendário)
  return {
    vencimento: 'A definir',
    textoSemVencimento: texto,
    diaDetectado: null,
  };
}

// =========================================================================
// 5. MOTOR MULTI-INTENT DO ASSISTENTE FINANCEIRO COM IA
// =========================================================================

export function processarComandoAssistente(
  comando: string,
  estadoAtual: EstadoFinanceiro,
  acoes: AssistantActions
): AssistantActionResult {
  const cmd = comando.trim();
  if (!cmd) {
    return {
      sucesso: false,
      mensagemResposta: 'Por favor, digite ou fale um comando financeiro!',
    };
  }

  const cmdMinusculo = cmd.toLowerCase();
  const calculos = calcularOrcamento(estadoAtual);

  // -----------------------------------------------------------------------
  // SAUDAÇÃO & AJUDA GERAL
  // -----------------------------------------------------------------------
  if (
    /^(oi|ol[aá]|bom dia|boa tarde|boa noite|e a[ií]|hey|hello|ajuda|help|o que voc[eê] faz|quem [eé] voc[eê])/i.test(cmdMinusculo)
  ) {
    return {
      sucesso: true,
      acaoExecutada: 'SAUDACAO',
      mensagemResposta: `👋 **Olá! Sou o GestorLar IA**, seu copiloto orçamentário.
Entendo qualquer comando em linguagem natural por texto ou voz! Exemplos que você pode me dizer agora:

• **Lançamentos rápidos:** *"Almoço 35"*, *"50 conto de gasolina"*, *"Paguei 120 de luz"*
• **Vários de uma vez:** *"Mercado 450, internet 120 e remédio 60"*
• **Investimentos:** *"Aportei 1.5k no cdb"*, *"Guardei 500 no Tesouro"*
• **Atualizar Renda:** *"Meu salário aumentou para 12k"*
• **Metas 50-30-20:** *"Muda a meta de aporte pra 25%"*
• **Status de Contas:** *"Paguei o aluguel"*, *"Quitei todas as contas"*
• **Consultas:** *"Qual meu saldo livre?"*, *"Onde gastei mais?"*, *"Contas a pagar"*`,
    };
  }

  // -----------------------------------------------------------------------
  // CONSULTA 1: Onde Gastei Mais? / Maior Despesa
  // -----------------------------------------------------------------------
  if (
    cmdMinusculo.includes('onde gastei mais') ||
    cmdMinusculo.includes('maior gasto') ||
    cmdMinusculo.includes('maiores gastos') ||
    cmdMinusculo.includes('qual o maior gasto') ||
    cmdMinusculo.includes('onde estou gastando')
  ) {
    if (estadoAtual.itens.length === 0) {
      return {
        sucesso: true,
        acaoExecutada: 'CONSULTA_GASTOS',
        mensagemResposta: '📋 Você ainda não possui nenhum gasto ou despesa lançada neste mês!',
      };
    }

    // Ordena do maior para o menor
    const ordenados = [...estadoAtual.itens].sort((a, b) => b.valor - a.valor);
    const top3 = ordenados.slice(0, 3);
    const gastosCat: Record<CategoriaOrcamentaria, number> = {
      fixas: calculos.totalFixas,
      superfluos: calculos.totalSuperfluos,
      investimentos: calculos.totalInvestimentos,
    };
    const maiorPilar = (['fixas', 'superfluos', 'investimentos'] as CategoriaOrcamentaria[]).reduce(
      (max, cat) => (gastosCat[cat] > gastosCat[max] ? cat : max),
      'fixas' as CategoriaOrcamentaria
    );

    const listaTop = top3.map((it, idx) => `${idx + 1}º **${it.titulo}**: ${formatarBRL(it.valor)} (${it.tipoDetalhado})`).join('\n');

    return {
      sucesso: true,
      acaoExecutada: 'CONSULTA_MAIOR_GASTO',
      mensagemResposta: `🔍 **Seus Maiores Gastos do Mês:**\n\n${listaTop}\n\n💡 O pilar com maior volume financeiro é **${CATEGORIAS_CONFIG[maiorPilar].nome}** com **${formatarBRL(gastosCat[maiorPilar])}**.`,
    };
  }

  // -----------------------------------------------------------------------
  // CONSULTA 2: Gastos por Categoria Específica
  // (ex: "quanto gastei com comida", "quanto gastei no mercado", "quanto gastei com supérfluos")
  // -----------------------------------------------------------------------
  if (
    cmdMinusculo.includes('quanto gastei') ||
    cmdMinusculo.includes('quanto foi gasto') ||
    cmdMinusculo.includes('total gasto com') ||
    cmdMinusculo.includes('total em')
  ) {
    if (cmdMinusculo.includes('fixa') || cmdMinusculo.includes('essenci')) {
      const totalFixas = calculos.totalFixas;
      const tetoFixas = calculos.limiteFixas;
      return {
        sucesso: true,
        acaoExecutada: 'CONSULTA_CATEGORIA',
        mensagemResposta: `📌 **Contas Fixas & Essenciais:**\n• Total Gasto: **${formatarBRL(totalFixas)}**\n• Meta/Teto (50%): **${formatarBRL(tetoFixas)}**\n• Status: **${totalFixas <= tetoFixas ? '✅ Dentro do limite' : '⚠️ Acima do teto recomendado'}**`,
      };
    }

    if (cmdMinusculo.includes('supérfl') || cmdMinusculo.includes('superfl') || cmdMinusculo.includes('lazer')) {
      const totalSup = calculos.totalSuperfluos;
      const tetoSup = calculos.limiteSuperfluos;
      return {
        sucesso: true,
        acaoExecutada: 'CONSULTA_CATEGORIA',
        mensagemResposta: `🎉 **Estilo de Vida & Supérfluos:**\n• Total Gasto: **${formatarBRL(totalSup)}**\n• Limite Sugerido (30%): **${formatarBRL(tetoSup)}**\n• Saldo Disponível na Categoria: **${formatarBRL(Math.max(0, tetoSup - totalSup))}**`,
      };
    }

    if (cmdMinusculo.includes('invest') || cmdMinusculo.includes('aporte') || cmdMinusculo.includes('reserva') || cmdMinusculo.includes('guardei')) {
      const totalInv = calculos.totalInvestimentos;
      const metaInv = calculos.metaInvestimentos;
      return {
        sucesso: true,
        acaoExecutada: 'CONSULTA_CATEGORIA',
        mensagemResposta: `📈 **Investimentos & Aportes:**\n• Total Aportado: **${formatarBRL(totalInv)}**\n• Objetivo (20%): **${formatarBRL(metaInv)}**\n• Atingimento da Meta: **${((totalInv / (metaInv || 1)) * 100).toFixed(0)}%**`,
      };
    }

    // Busca itens por termo específico (ex: "mercado", "luz", "gasolina")
    const itensFiltrados = estadoAtual.itens.filter((it) => {
      const tit = it.titulo.toLowerCase();
      const sub = it.tipoDetalhado.toLowerCase();
      return tit.split(/\s+/).some((w) => w.length >= 3 && cmdMinusculo.includes(w)) ||
             sub.split(/\s+/).some((w) => w.length >= 3 && cmdMinusculo.includes(w));
    });

    if (itensFiltrados.length > 0) {
      const totalFiltro = itensFiltrados.reduce((acc, it) => acc + it.valor, 0);
      const detalhes = itensFiltrados.map((it) => `• ${it.titulo}: ${formatarBRL(it.valor)}`).join('\n');
      return {
        sucesso: true,
        acaoExecutada: 'CONSULTA_FILTRO',
        mensagemResposta: `🛒 **Gastos Localizados (${formatarBRL(totalFiltro)} no total):**\n${detalhes}`,
      };
    }
  }

  // -----------------------------------------------------------------------
  // CONSULTA 3: Saldo Livre / Visão Geral / Diagnóstico
  // -----------------------------------------------------------------------
  if (
    cmdMinusculo.includes('saldo') ||
    cmdMinusculo.includes('quanto sobrou') ||
    cmdMinusculo.includes('quanto tenho') ||
    cmdMinusculo.includes('resumo') ||
    cmdMinusculo.includes('estou no vermelho') ||
    cmdMinusculo.includes('como está meu orçamento') ||
    cmdMinusculo.includes('como estao minhas contas')
  ) {
    const saldo = calculos.saldoLivre;
    const situacao = saldo >= 0 ? '🟢 Positivo e equilibrado' : '🔴 Em déficit orçamentário';
    return {
      sucesso: true,
      acaoExecutada: 'CONSULTA_SALDO',
      mensagemResposta: `📊 **Resumo Financeiro em Tempo Real:**\n• **Renda Familiar:** ${formatarBRL(estadoAtual.rendaFamiliar)}\n• **Total Comprometido:** ${formatarBRL(calculos.totalGastos)} (${calculos.taxaComprometimento.toFixed(1)}%)\n• **Saldo Livre:** ${formatarBRL(saldo)}\nDiagnóstico: **${situacao}**!`,
    };
  }

  // -----------------------------------------------------------------------
  // CONSULTA 4: Contas Pendentes / A Pagar
  // -----------------------------------------------------------------------
  if (
    (cmdMinusculo.includes('pendente') || cmdMinusculo.includes('a pagar') || cmdMinusculo.includes('falta pagar') || cmdMinusculo.includes('o que devo')) &&
    !cmdMinusculo.includes('marcar') && !cmdMinusculo.includes('muda') && !cmdMinusculo.includes('desmarcar')
  ) {
    const pendentes = estadoAtual.itens.filter((it) => !it.pago);
    if (pendentes.length === 0) {
      return {
        sucesso: true,
        acaoExecutada: 'CONSULTA_PENDENTES',
        mensagemResposta: '🎉 **Parabéns!** Todas as suas despesas do mês já estão quitadas e marcadas como pagas!',
      };
    }

    const totalPendente = pendentes.reduce((acc, it) => acc + it.valor, 0);
    const lista = pendentes.slice(0, 6).map((it) => `• **${it.titulo}**: ${formatarBRL(it.valor)} (${it.vencimento})`).join('\n');
    return {
      sucesso: true,
      acaoExecutada: 'CONSULTA_PENDENTES',
      mensagemResposta: `📋 **Contas Pendentes (${pendentes.length} no total • ${formatarBRL(totalPendente)}):**\n${lista}${pendentes.length > 6 ? `\n• ... e mais ${pendentes.length - 6} contas.` : ''}`,
    };
  }

  // -----------------------------------------------------------------------
  // CONSULTA 4.1: Lembretes de Vencimento e WhatsApp
  // -----------------------------------------------------------------------
  if (
    cmdMinusculo.includes('whatsapp') ||
    cmdMinusculo.includes('lembrete') ||
    cmdMinusculo.includes('lembrar contas') ||
    cmdMinusculo.includes('contas a vencer') ||
    cmdMinusculo.includes('vencendo')
  ) {
    const pendentes = estadoAtual.itens.filter((it) => !it.pago);
    if (pendentes.length === 0) {
      return {
        sucesso: true,
        acaoExecutada: 'LEMBRETE_WHATSAPP',
        mensagemResposta: '✅ **Nenhuma conta a vencer!** Todas as despesas cadastradas já estão quitadas.',
      };
    }

    const totalPendente = pendentes.reduce((acc, it) => acc + it.valor, 0);
    const lista = pendentes.slice(0, 5).map((it) => `• **${it.titulo}**: ${formatarBRL(it.valor)} (${it.vencimento})`).join('\n');

    return {
      sucesso: true,
      acaoExecutada: 'LEMBRETE_WHATSAPP',
      mensagemResposta: `📲 **Lembretes de Contas a Vencer:**\n\nIdentifiquei **${pendentes.length} conta(s) pendente(s)** somando **${formatarBRL(totalPendente)}**:\n\n${lista}${pendentes.length > 5 ? `\n• ... e mais ${pendentes.length - 5} conta(s)` : ''}\n\n👉 Para disparar o resumo formatado para o seu celular, use o botão **WhatsApp** no topo ou o banner de lembrete!`,
    };
  }

  // -----------------------------------------------------------------------
  // INTENÇÃO B: Atualização de Renda Familiar / Salário
  // Ex: "meu salário aumentou para 12k", "minha renda é 8500", "ganhei aumento agora é 10 mil"
  // -----------------------------------------------------------------------
  if (
    cmdMinusculo.includes('renda') ||
    cmdMinusculo.includes('salário') ||
    cmdMinusculo.includes('salario') ||
    cmdMinusculo.includes('faturamento') ||
    cmdMinusculo.includes('ganho líquido') ||
    cmdMinusculo.includes('ganho liquido') ||
    (cmdMinusculo.includes('aumento') && (cmdMinusculo.includes('para') || cmdMinusculo.includes('pra') || cmdMinusculo.includes('de')))
  ) {
    const novoValorRenda = normalizarValorMonetario(cmdMinusculo);
    if (novoValorRenda && novoValorRenda > 0) {
      acoes.atualizarRenda(novoValorRenda);
      return {
        sucesso: true,
        acaoExecutada: 'ATUALIZAR_RENDA',
        mensagemResposta: `✅ **Renda Familiar Atualizada!**\nNovo montante: **${formatarBRL(novoValorRenda)}**.\nOs tetos 50-30-20 foram recalculados instantaneamente:\n• **Fixas (50%):** ${formatarBRL(novoValorRenda * 0.5)}\n• **Supérfluos (30%):** ${formatarBRL(novoValorRenda * 0.3)}\n• **Investimentos (20%):** ${formatarBRL(novoValorRenda * 0.2)}`,
      };
    }
  }

  // -----------------------------------------------------------------------
  // INTENÇÃO C: Alterar Metas da Regra 50-30-20
  // Ex: "muda a meta de aporte pra 25%", "reduzir supérfluos para 20%"
  // -----------------------------------------------------------------------
  if (
    cmdMinusculo.includes('meta') ||
    cmdMinusculo.includes('regra') ||
    cmdMinusculo.includes('porcentagem') ||
    cmdMinusculo.includes('percentual')
  ) {
    const valorPercent = normalizarValorMonetario(cmdMinusculo);
    if (valorPercent && valorPercent >= 1 && valorPercent <= 100) {
      if (cmdMinusculo.includes('fixa') || cmdMinusculo.includes('essenci')) {
        acoes.atualizarMetas({ fixas: valorPercent });
        return {
          sucesso: true,
          acaoExecutada: 'ATUALIZAR_META',
          mensagemResposta: `🎯 **Meta Atualizada:** O teto de **Contas Fixas** foi ajustado para **${valorPercent}%** da renda familiar.`,
        };
      }
      if (cmdMinusculo.includes('supérfl') || cmdMinusculo.includes('superfl') || cmdMinusculo.includes('lazer')) {
        acoes.atualizarMetas({ superfluos: valorPercent });
        return {
          sucesso: true,
          acaoExecutada: 'ATUALIZAR_META',
          mensagemResposta: `🎯 **Meta Atualizada:** O limite de **Supérfluos** foi ajustado para **${valorPercent}%** da renda familiar.`,
        };
      }
      if (cmdMinusculo.includes('invest') || cmdMinusculo.includes('aporte') || cmdMinusculo.includes('reserva')) {
        acoes.atualizarMetas({ investimentos: valorPercent });
        return {
          sucesso: true,
          acaoExecutada: 'ATUALIZAR_META',
          mensagemResposta: `🎯 **Meta Atualizada:** O objetivo de **Investimentos & Aportes** foi ajustado para **${valorPercent}%** da renda familiar.`,
        };
      }
    }
  }

  // -----------------------------------------------------------------------
  // INTENÇÃO: Zerar Todo o Painel
  // Ex: "zerar o painel", "zerar painel", "limpar todo o painel", "apagar tudo", "zerar tudo"
  // -----------------------------------------------------------------------
  if (
    cmdMinusculo.includes('zerar o painel') ||
    cmdMinusculo.includes('zerar painel') ||
    cmdMinusculo.includes('limpar o painel') ||
    cmdMinusculo.includes('limpar todo o painel') ||
    cmdMinusculo.includes('zerar tudo') ||
    cmdMinusculo.includes('apagar todo o painel') ||
    cmdMinusculo.includes('apagar todos os dados')
  ) {
    if (acoes.zerarPainel) {
      acoes.zerarPainel(false);
      return {
        sucesso: true,
        acaoExecutada: 'ZERAR_PAINEL',
        mensagemResposta: '🧹 **Todo o painel foi zerado com sucesso!**\nA renda familiar foi redefinida para R$ 0,00 e todos os lançamentos do ledger foram removidos.',
      };
    }
  }

  // -----------------------------------------------------------------------
  // INTENÇÃO D: Quitar Tudo / Quitação em Lote
  // Ex: "quitei todas as contas", "paguei tudo", "marcar tudo como pago"
  // -----------------------------------------------------------------------
  if (
    (cmdMinusculo.includes('quitei') || cmdMinusculo.includes('paguei') || cmdMinusculo.includes('marcar')) &&
    (cmdMinusculo.includes('tudo') || cmdMinusculo.includes('todas as contas') || cmdMinusculo.includes('todos os boletos'))
  ) {
    const pendentes = estadoAtual.itens.filter((it) => !it.pago);
    if (pendentes.length === 0) {
      return {
        sucesso: true,
        acaoExecutada: 'STATUS_PAGAMENTO_LOTE',
        mensagemResposta: '✨ Todas as suas despesas já estavam pagas e quitadas!',
      };
    }

    const totalQuitado = pendentes.reduce((acc, it) => acc + it.valor, 0);
    pendentes.forEach((it) => acoes.atualizarItem(it.id, { pago: true }));

    return {
      sucesso: true,
      acaoExecutada: 'STATUS_PAGAMENTO_LOTE',
      itensModificados: pendentes.length,
      mensagemResposta: `🎉 **Quitação Total Concluída!**\nForam marcadas como pagas todas as **${pendentes.length}** contas pendentes (Total quitado: **${formatarBRL(totalQuitado)}**).`,
    };
  }

  // -----------------------------------------------------------------------
  // INTENÇÃO E: Marcar como Pago ou Pendente (Item Individual ou Múltiplos)
  // Ex: "paguei a conta de luz", "quitei o condomínio", "desmarcar aluguel"
  // -----------------------------------------------------------------------
  if (
    cmdMinusculo.includes('paguei') ||
    cmdMinusculo.includes('quitei') ||
    cmdMinusculo.includes('liquid') ||
    cmdMinusculo.includes('tá pago') ||
    cmdMinusculo.includes('ta pago') ||
    cmdMinusculo.includes('marcar como pago') ||
    cmdMinusculo.includes('como pago') ||
    cmdMinusculo.includes('coloca pago') ||
    cmdMinusculo.includes('coloque pago') ||
    cmdMinusculo.includes('desmarcar') ||
    cmdMinusculo.includes('pendente') ||
    cmdMinusculo.includes('não pago')
  ) {
    const tornarPendente = cmdMinusculo.includes('desmarcar') || cmdMinusculo.includes('pendente') || cmdMinusculo.includes('não pago');

    // Identifica itens do ledger citados na mensagem
    const itensAfetados = estadoAtual.itens.filter((it) => {
      const tit = it.titulo.toLowerCase();
      const palavras = tit.split(/\s+/).filter((w) => w.length >= 3);
      return cmdMinusculo.includes(tit) || palavras.some((w) => cmdMinusculo.includes(w));
    });

    if (itensAfetados.length > 0) {
      itensAfetados.forEach((it) => acoes.atualizarItem(it.id, { pago: !tornarPendente }));
      const nomes = itensAfetados.map((it) => `**"${it.titulo}"** (${formatarBRL(it.valor)})`).join(', ');
      return {
        sucesso: true,
        acaoExecutada: 'STATUS_PAGAMENTO',
        itensModificados: itensAfetados.length,
        mensagemResposta: `✔️ ${itensAfetados.length > 1 ? 'Os lançamentos' : 'O lançamento'} ${nomes} ${itensAfetados.length > 1 ? 'foram marcados' : 'foi marcado'} como **${tornarPendente ? 'Pendente' : 'Pago e Quitado'}**!`,
      };
    }
  }

  // -----------------------------------------------------------------------
  // INTENÇÃO F: Excluir / Remover Lançamento
  // Ex: "excluir a conta de luz", "apagar o almoço", "remover despesa de farmácia", "deletar uber"
  // -----------------------------------------------------------------------
  if (
    cmdMinusculo.includes('excluir') ||
    cmdMinusculo.includes('apagar') ||
    cmdMinusculo.includes('remover') ||
    cmdMinusculo.includes('deletar') ||
    cmdMinusculo.includes('tirar') ||
    cmdMinusculo.includes('cancela')
  ) {
    const itensAfetados = estadoAtual.itens.filter((it) => {
      const tit = it.titulo.toLowerCase();
      const palavras = tit.split(/\s+/).filter((w) => w.length >= 3);
      return cmdMinusculo.includes(tit) || palavras.some((w) => cmdMinusculo.includes(w));
    });

    if (itensAfetados.length > 0) {
      itensAfetados.forEach((it) => acoes.removerItem(it.id));
      const nomes = itensAfetados.map((it) => `**"${it.titulo}"** (${formatarBRL(it.valor)})`).join(', ');
      return {
        sucesso: true,
        acaoExecutada: 'REMOVER_ITEM',
        itensModificados: itensAfetados.length,
        mensagemResposta: `🗑️ ${itensAfetados.length > 1 ? 'Os lançamentos' : 'O lançamento'} ${nomes} ${itensAfetados.length > 1 ? 'foram removidos' : 'foi removido'} do seu orçamento.`,
      };
    }
  }

  // -----------------------------------------------------------------------
  // INTENÇÃO G: Alterar Valor de Item Existente
  // Ex: "mudar o aluguel para 2800", "alterar internet para 140", "ajustar luz para 320"
  // -----------------------------------------------------------------------
  if (
    cmdMinusculo.includes('mudar') ||
    cmdMinusculo.includes('alterar') ||
    cmdMinusculo.includes('ajustar') ||
    cmdMinusculo.includes('corrigir') ||
    cmdMinusculo.includes('trocar valor')
  ) {
    const novoValor = normalizarValorMonetario(cmdMinusculo);
    if (novoValor && novoValor > 0) {
      const itemAlvo = estadoAtual.itens.find((it) => {
        const tit = it.titulo.toLowerCase();
        const palavras = tit.split(/\s+/).filter((w) => w.length >= 3);
        return cmdMinusculo.includes(tit) || palavras.some((w) => cmdMinusculo.includes(w));
      });

      if (itemAlvo) {
        acoes.atualizarItem(itemAlvo.id, { valor: novoValor });
        return {
          sucesso: true,
          acaoExecutada: 'EDITAR_VALOR',
          mensagemResposta: `✏️ O valor de **"${itemAlvo.titulo}"** foi alterado com sucesso de ${formatarBRL(itemAlvo.valor)} para **${formatarBRL(novoValor)}**!`,
        };
      }
    }
  }

  // -----------------------------------------------------------------------
  // INTENÇÃO H: Adição Múltipla / Lote ou Adição Única de Despesas e Aportes
  // Divide frases compostas por quebras de linha, vírgulas, ponto e vírgula ou conectivo "e"
  // Ex: "Almoço 45, farmácia 30 e luz 200"
  // -----------------------------------------------------------------------
  const partes = cmd
    .split(/\r?\n|;|(?:,\s*(?=[a-zá-ú\s]+\d|\d))|(?:(?<=\d)\s+e\s+(?=[a-zá-ú]))|(?:e\s+(?=[a-zá-ú\s]+\d|\d))/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const itensAdicionados: Array<{ 
    titulo: string; 
    valor: number; 
    categoria: string; 
    pilar: string;
    vencimento: string;
    agendadoNoCalendario: boolean;
  }> = [];

  for (const parte of partes) {
    // 1. Extrai o vencimento falado SE e SOMENTE SE o usuário mencionou um dia explicitamente no áudio/texto
    const { vencimento, textoSemVencimento, diaDetectado } = extrairVencimentoFalado(parte);

    // 2. Extrai o valor monetário a partir do texto livre da menção ao dia
    const valor = normalizarValorMonetario(textoSemVencimento);
    if (valor && valor > 0) {
      const { categoria, subcategoria } = identificarCategoriaESubcategoria(textoSemVencimento, cmd);
      const titulo = extrairTituloLimpo(textoSemVencimento, subcategoria);

      acoes.adicionarItem({
        titulo,
        valor,
        categoria,
        tipoDetalhado: subcategoria,
        vencimento, // <-- Se não falou o dia, fica 'A definir' e NÃO vai para o dia 10!
        pago:
          parte.toLowerCase().includes('paguei') ||
          parte.toLowerCase().includes('quitei') ||
          parte.toLowerCase().includes('débito') ||
          parte.toLowerCase().includes('debito'),
      });

      itensAdicionados.push({
        titulo,
        valor,
        categoria: subcategoria,
        pilar: CATEGORIAS_CONFIG[categoria].nome,
        vencimento,
        agendadoNoCalendario: diaDetectado !== null,
      });
    }
  }

  if (itensAdicionados.length > 0) {
    const totalAdicionado = itensAdicionados.reduce((acc, it) => acc + it.valor, 0);

    if (itensAdicionados.length === 1) {
      const item = itensAdicionados[0];
      const statusVencimento = item.agendadoNoCalendario
        ? `• **Vencimento:** ${item.vencimento} *(Agendado no Calendário)*`
        : `• **Vencimento:** Não informado *(Não inserido no calendário)*`;

      return {
        sucesso: true,
        acaoExecutada: 'ADICIONAR_ITEM',
        itensModificados: 1,
        mensagemResposta: `✅ **Lançamento Registrado com Sucesso!**\n• **${item.titulo}**: ${formatarBRL(item.valor)}\n• **Classificação:** ${item.pilar} (${item.categoria})\n${statusVencimento}\nOs limites e gráficos 50-30-20 foram atualizados em tempo real!`,
      };
    }

    const linhas = itensAdicionados
      .map((it) => {
        const agendamento = it.agendadoNoCalendario ? `[${it.vencimento}]` : `[Sem agendamento]`;
        return `• **${it.titulo}**: ${formatarBRL(it.valor)} → *${it.pilar} (${it.categoria})* ${agendamento}`;
      })
      .join('\n');

    return {
      sucesso: true,
      acaoExecutada: 'ADICIONAR_LOTE',
      itensModificados: itensAdicionados.length,
      mensagemResposta: `✅ **${itensAdicionados.length} Lançamentos Adicionados!** (Total: ${formatarBRL(totalAdicionado)})\n${linhas}\nTodos os pilares e o saldo livre foram recalculados!`,
    };
  }

  // -----------------------------------------------------------------------
  // RESPOSTA DE AJUDA INTELIGENTE SE NÃO RECONHECER VALOR ESPECÍFICO
  // -----------------------------------------------------------------------
  return {
    sucesso: false,
    mensagemResposta: `💡 Li sua mensagem: *" ${cmd} "*, mas não encontrei um valor ou comando financeiro direto.

Experimente falar ou digitar assim:
• **Gastos:** *"Gastei 85 no almoço"*, *"50 conto de gasolina"*, *"Pizza 80"*
• **Múltiplos:** *"Mercado 400, luz 220 e farmácia 90"*
• **Investimentos:** *"Aportei 1.500 no CDB"*, *"Guardei 500 no Tesouro"*
• **Renda / Salário:** *"Minha renda subiu para 10k"*, *"Salário de 8.500"*
• **Pagamentos:** *"Paguei a conta de luz"*, *"Quitei todas as contas"*
• **Consultas:** *"Qual é o meu saldo livre?"*, *"Onde gastei mais?"*`,
  };
}
