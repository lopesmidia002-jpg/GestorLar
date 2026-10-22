import type { CategoriaOrcamentaria, EstadoFinanceiro } from '../types/finance';
import { CATEGORIAS_CONFIG, formatarBRL } from './calculations';

export interface AssistantActionResult {
  mensagemResposta: string;
  sucesso: boolean;
  acaoExecutada?: string;
}

// Dicionário semântico para classificação automática de categorias
const DICIONARIO_CATEGORIAS: Record<CategoriaOrcamentaria, { palavrasChave: string[]; subcategoriaPadrao: string }> = {
  fixas: {
    palavrasChave: [
      'aluguel', 'condomínio', 'condominio', 'imobiliária', 'imobiliaria', 'prestação da casa',
      'luz', 'energia', 'enel', 'cpfl', 'água', 'agua', 'sabesp', 'esgoto',
      'gás', 'gas', 'internet', 'fibra', 'celular', 'telecomunicações', 'telecom', 'plano',
      'mercado', 'supermercado', 'compras do mês', 'alimentação básica', 'açougue', 'feira',
      'saúde', 'saude', 'plano de saúde', 'convênio', 'farmácia', 'farmacia', 'remédio', 'remedio',
      'escola', 'faculdade', 'colégio', 'mensalidade escolar', 'transporte', 'combustível', 'gasolina', 'ipva', 'seguro'
    ],
    subcategoriaPadrao: 'Moradia'
  },
  superfluos: {
    palavrasChave: [
      'restaurante', 'jantar', 'almoço', 'almoco', 'lanche', 'pizza', 'hambúrguer', 'hamburguer', 'sushi', 'rodízio',
      'ifood', 'delivery', 'rappi', 'aiqfome', 'padaria', 'café', 'starbucks', 'sorvete', 'açaí', 'acai',
      'netflix', 'spotify', 'amazon', 'prime', 'disney', 'hbo', 'max', 'streaming', 'youtube',
      'cinema', 'show', 'teatro', 'festa', 'balada', 'bar', 'cerveja', 'happy hour', 'bebida',
      'shopping', 'roupa', 'vestuário', 'vestuario', 'tênis', 'tenis', 'sapato', 'camisa', 'calça',
      'viagem', 'passagem', 'hotel', 'pousada', 'airbnb', 'passeio', 'eletrônico', 'videogame', 'game', 'jogo', 'steam', 'uber'
    ],
    subcategoriaPadrao: 'Restaurantes'
  },
  investimentos: {
    palavrasChave: [
      'cdb', 'lci', 'lca', 'tesouro', 'selic', 'ipca', 'prefixado', 'renda fixa', 'poupança', 'poupanca',
      'ação', 'acao', 'ações', 'acoes', 'fii', 'fiis', 'fundos imobiliários', 'fundos imobiliarios', 'bovespa', 'b3',
      'cripto', 'bitcoin', 'btc', 'ethereum', 'eth', 'reserva', 'emergência', 'emergencia', 'oportunidade',
      'aporte', 'investimento', 'investir', 'guardar', 'aplicação', 'aplicacao', 'corretora', 'rico', 'clear', 'xp', 'nuinvest'
    ],
    subcategoriaPadrao: 'CDB Liquidez'
  }
};

// Extrair valor monetário em texto (ex: "80 reais", "R$ 3.500", "150,50", "400")
function extrairValorMonetario(texto: string): number | null {
  const limpo = texto.toLowerCase()
    .replace(/r\$\s?/g, '')
    .replace(/\s?reais/g, '');

  const regexNumero = /(\d+(?:[.,]\d{1,2})?)/g;
  const matches = limpo.match(regexNumero);
  if (!matches) return null;

  // Pega o primeiro ou maior número detectado
  for (const m of matches) {
    const normalizado = m.replace(',', '.');
    const valor = parseFloat(normalizado);
    if (!isNaN(valor) && valor > 0) return valor;
  }
  return null;
}

// Detectar categoria por palavras-chave
export function detectarCategoriaPorTexto(texto: string): { categoria: CategoriaOrcamentaria; subcategoria: string } {
  const minusculo = texto.toLowerCase();

  // Verifica primeiro Investimentos
  for (const kw of DICIONARIO_CATEGORIAS.investimentos.palavrasChave) {
    if (minusculo.includes(kw)) {
      return { categoria: 'investimentos', subcategoria: 'CDB Liquidez' };
    }
  }

  // Verifica Supérfluos
  for (const kw of DICIONARIO_CATEGORIAS.superfluos.palavrasChave) {
    if (minusculo.includes(kw)) {
      const sub = kw.includes('streaming') || kw.includes('netflix') || kw.includes('spotify')
        ? 'Streaming'
        : kw.includes('ifood') || kw.includes('delivery')
        ? 'Delivery'
        : kw.includes('roupa') || kw.includes('vestuário')
        ? 'Vestuário'
        : 'Restaurantes';
      return { categoria: 'superfluos', subcategoria: sub };
    }
  }

  // Verifica Fixas
  for (const kw of DICIONARIO_CATEGORIAS.fixas.palavrasChave) {
    if (minusculo.includes(kw)) {
      const sub = kw.includes('aluguel') || kw.includes('imobili')
        ? 'Moradia'
        : kw.includes('luz') || kw.includes('energia')
        ? 'Energia'
        : kw.includes('água') || kw.includes('agua')
        ? 'Água'
        : kw.includes('internet') || kw.includes('celular')
        ? 'Telecomunicações'
        : 'Alimentação Básica';
      return { categoria: 'fixas', subcategoria: sub };
    }
  }

  // Padrão quando não houver correspondência exata
  return { categoria: 'superfluos', subcategoria: 'Outros' };
}

export function processarComandoAssistente(
  comando: string,
  estadoAtual: EstadoFinanceiro,
  acoes: {
    adicionarItem: (item: { titulo: string; valor: number; categoria: CategoriaOrcamentaria; tipoDetalhado: string; vencimento: string; pago: boolean }) => void;
    atualizarItem: (id: string, updates: Record<string, any>) => void;
    removerItem: (id: string) => void;
    alternarPago: (id: string) => void;
    atualizarRenda: (novaRenda: number) => void;
    atualizarMetas: (novasMetas: { fixas?: number; superfluos?: number; investimentos?: number }) => void;
  }
): AssistantActionResult {
  const cmd = comando.toLowerCase().trim();

  // 1. Comando: Alterar / Definir Renda Familiar
  // Exemplos: "minha renda aumentou para 15000", "mudar renda para 14.500", "definir renda 13000"
  if (cmd.includes('renda') || cmd.includes('salário') || cmd.includes('salario') || cmd.includes('ganho')) {
    const valor = extrairValorMonetario(cmd);
    if (valor) {
      acoes.atualizarRenda(valor);
      return {
        sucesso: true,
        acaoExecutada: 'ATUALIZAR_RENDA',
        mensagemResposta: `Renda familiar atualizada com sucesso para ${formatarBRL(valor)}! Todos os pilares e tetos 50-30-20 foram recalculados.`,
      };
    }
  }

  // 2. Comando: Alterar Metas Orçamentárias
  // Exemplos: "mudar meta de fixas para 45%", "definir investimentos em 25%", "meta de superfluos 25"
  if (cmd.includes('meta') && (cmd.includes('fixa') || cmd.includes('supérfl') || cmd.includes('superfl') || cmd.includes('invest') || cmd.includes('aporte'))) {
    const valor = extrairValorMonetario(cmd);
    if (valor && valor >= 1 && valor <= 100) {
      if (cmd.includes('fixa')) {
        acoes.atualizarMetas({ fixas: valor });
        return {
          sucesso: true,
          acaoExecutada: 'ATUALIZAR_META',
          mensagemResposta: `Meta do pilar de Contas Fixas atualizada para ${valor}%.`,
        };
      }
      if (cmd.includes('supérfl') || cmd.includes('superfl')) {
        acoes.atualizarMetas({ superfluos: valor });
        return {
          sucesso: true,
          acaoExecutada: 'ATUALIZAR_META',
          mensagemResposta: `Meta do pilar de Gastos Supérfluos atualizada para ${valor}%.`,
        };
      }
      if (cmd.includes('invest') || cmd.includes('aporte')) {
        acoes.atualizarMetas({ investimentos: valor });
        return {
          sucesso: true,
          acaoExecutada: 'ATUALIZAR_META',
          mensagemResposta: `Meta do pilar de Investimentos atualizada para ${valor}%.`,
        };
      }
    }
  }

  // 3. Comando: Marcar despesa como paga ou pendente
  // Exemplos: "marcar internet como paga", "pagar aluguel", "marcar mercado como pendente"
  if (cmd.includes('paga') || cmd.includes('pago') || cmd.includes('quitar') || cmd.includes('pendente')) {
    const pendente = cmd.includes('pendente') || cmd.includes('não pago') || cmd.includes('desmarcar');
    // Encontrar item correspondente no ledger
    const itemEncontrado = estadoAtual.itens.find((it) => {
      const nomeLimpo = it.titulo.toLowerCase();
      const palavras = cmd.split(' ');
      return palavras.some((p) => p.length > 3 && nomeLimpo.includes(p));
    });

    if (itemEncontrado) {
      acoes.atualizarItem(itemEncontrado.id, { pago: !pendente });
      return {
        sucesso: true,
        acaoExecutada: 'ALTERAR_STATUS_PAGAMENTO',
        mensagemResposta: `O lançamento "${itemEncontrado.titulo}" foi marcado como ${pendente ? 'A Pagar (Pendente)' : 'Pago (Liquidado)'}.`,
      };
    }
  }

  // 4. Comando: Excluir / Remover despesa
  // Exemplos: "excluir streaming", "apagar restaurante", "remover despesa de luz"
  if (cmd.includes('excluir') || cmd.includes('apagar') || cmd.includes('remover') || cmd.includes('deletar')) {
    const itemEncontrado = estadoAtual.itens.find((it) => {
      const nomeLimpo = it.titulo.toLowerCase();
      const palavras = cmd.split(' ');
      return palavras.some((p) => p.length > 3 && !['excluir', 'apagar', 'remover', 'deletar', 'despesa'].includes(p) && nomeLimpo.includes(p));
    });

    if (itemEncontrado) {
      acoes.removerItem(itemEncontrado.id);
      return {
        sucesso: true,
        acaoExecutada: 'REMOVER_ITEM',
        mensagemResposta: `O lançamento "${itemEncontrado.titulo}" (${formatarBRL(itemEncontrado.valor)}) foi removido com sucesso.`,
      };
    }
  }

  // 5. Comando: Alterar valor de despesa existente
  // Exemplos: "mudar aluguel para 3500", "alterar energia para 420", "ajustar mercado para 1600"
  if (cmd.includes('mudar') || cmd.includes('alterar') || cmd.includes('ajustar') || cmd.includes('trocar')) {
    const valor = extrairValorMonetario(cmd);
    if (valor) {
      const itemEncontrado = estadoAtual.itens.find((it) => {
        const nomeLimpo = it.titulo.toLowerCase();
        const palavras = cmd.split(' ');
        return palavras.some((p) => p.length > 3 && !['mudar', 'alterar', 'ajustar', 'trocar', 'para'].includes(p) && nomeLimpo.includes(p));
      });

      if (itemEncontrado) {
        acoes.atualizarItem(itemEncontrado.id, { valor });
        return {
          sucesso: true,
          acaoExecutada: 'EDITAR_VALOR',
          mensagemResposta: `O valor de "${itemEncontrado.titulo}" foi alterado de ${formatarBRL(itemEncontrado.valor)} para ${formatarBRL(valor)}.`,
        };
      }
    }
  }

  // 6. Comando: Adicionar nova despesa / aporte com categorização automática
  // Exemplos: "adicionar restaurante 150", "gastei 80 reais no mercado", "comprei remédio por 65", "novo cdb de 500 reais"
  const valorDetectado = extrairValorMonetario(cmd);
  if (valorDetectado && valorDetectado > 0) {
    const { categoria, subcategoria } = detectarCategoriaPorTexto(cmd);
    
    // Tentar extrair um título descritivo do comando
    let tituloLimpo = cmd
      .replace(/adicionar|adiciona|lançar|lance|novo|nova|despesa|gastei|comprei|coloque|no|na|de|por|reais|r\$|\d+(?:[.,]\d+)?/gi, '')
      .trim();

    if (tituloLimpo.length < 3) {
      tituloLimpo = subcategoria || (categoria === 'fixas' ? 'Conta Fixa' : categoria === 'investimentos' ? 'Aporte' : 'Gasto Discricionário');
    }

    // Capitalizar primeira letra
    tituloLimpo = tituloLimpo.charAt(0).toUpperCase() + tituloLimpo.slice(1);

    acoes.adicionarItem({
      titulo: tituloLimpo,
      valor: valorDetectado,
      categoria,
      tipoDetalhado: subcategoria,
      vencimento: 'Dia 10',
      pago: false,
    });

    const nomePilar = CATEGORIAS_CONFIG[categoria].nome;

    return {
      sucesso: true,
      acaoExecutada: 'ADICIONAR_ITEM',
      mensagemResposta: `Lançamento adicionado com sucesso! "${tituloLimpo}" no valor de ${formatarBRL(valorDetectado)} categorizado automaticamente em ${nomePilar} (${subcategoria}).`,
    };
  }

  // 7. Consulta de Saldo / Resumo
  // Exemplos: "qual meu saldo", "quanto sobrou", "resumo orçamentário"
  if (cmd.includes('saldo') || cmd.includes('quanto sobrou') || cmd.includes('resumo') || cmd.includes('status')) {
    const totalGastos = estadoAtual.itens.reduce((acc, it) => acc + it.valor, 0);
    const saldoLivre = estadoAtual.rendaFamiliar - totalGastos;
    return {
      sucesso: true,
      acaoExecutada: 'CONSULTA_SALDO',
      mensagemResposta: `Sua renda líquida é ${formatarBRL(estadoAtual.rendaFamiliar)}. O total em despesas e aportes é ${formatarBRL(totalGastos)}. Seu saldo livre no momento é ${formatarBRL(saldoLivre)}.`,
    };
  }

  // Resposta padrão com orientações
  return {
    sucesso: false,
    mensagemResposta: `Não compreendi exatamente o comando. Você pode dizer ou digitar:
• "Gastei 85 reais no restaurante"
• "Mudar aluguel para 3400"
• "Minha renda é 14000"
• "Pagar energia elétrica"
• "Qual é o meu saldo livre?"`,
  };
}
