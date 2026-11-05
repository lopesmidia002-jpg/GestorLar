import { getSupabaseClient } from '../lib/supabase';
import type { EstadoFinanceiro, ItemLancamento, MetasRegra } from '../types/finance';

export const FAMILY_ID = '00000000-0000-0000-0000-000000000001';

export interface DadosNuvemCarregados {
  encontrado: boolean;
  estado?: EstadoFinanceiro;
}

/**
 * Carrega todos os dados diretamente do Supabase filtrados pelo ID do usuário autenticado
 */
export async function carregarDadosNuvem(userId: string = FAMILY_ID): Promise<DadosNuvemCarregados> {
  const client = getSupabaseClient();
  if (!client) return { encontrado: false };

  try {
    // 1. Carrega o perfil do orçamento (renda e metas) do usuário
    const { data: perfilData, error: perfilError } = await client
      .from('perfis_orcamento')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (perfilError) {
      console.warn('Aviso ao consultar perfis_orcamento:', perfilError.message);
    }

    // 2. Carrega todos os lançamentos do usuário
    const { data: itensData, error: itensError } = await client
      .from('itens_lancamento')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (itensError) {
      console.warn('Aviso ao consultar itens_lancamento:', itensError.message);
    }

    if (!perfilData && (!itensData || itensData.length === 0)) {
      return { encontrado: false };
    }

    const itensMapeados: ItemLancamento[] = (itensData || []).map((row: any) => ({
      id: row.id,
      titulo: row.titulo,
      categoria: row.categoria,
      tipoDetalhado: row.tipo_detalhado || 'Geral',
      valor: Number(row.valor) || 0,
      vencimento: row.vencimento || 'A definir',
      pago: Boolean(row.pago),
    }));

    const estadoFinal: EstadoFinanceiro = {
      rendaFamiliar: perfilData ? Number(perfilData.renda_familiar) : 6000,
      metasRegra: {
        fixas: perfilData ? Number(perfilData.meta_fixas) : 50,
        superfluos: perfilData ? Number(perfilData.meta_superfluos) : 30,
        investimentos: perfilData ? Number(perfilData.meta_investimentos) : 20,
      },
      itens: itensMapeados,
    };

    return { encontrado: true, estado: estadoFinal };
  } catch (error) {
    console.error('Erro geral ao carregar dados do Supabase:', error);
    return { encontrado: false };
  }
}

/**
 * Migra ou sincroniza todo o estado local para a nuvem
 */
export async function migrarDadosLocaisParaNuvem(estadoLocal: EstadoFinanceiro, userId: string = FAMILY_ID) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    // Salva perfil
    await client.from('perfis_orcamento').upsert({
      user_id: userId,
      renda_familiar: estadoLocal.rendaFamiliar,
      meta_fixas: estadoLocal.metasRegra.fixas,
      meta_superfluos: estadoLocal.metasRegra.superfluos,
      meta_investimentos: estadoLocal.metasRegra.investimentos,
      updated_at: new Date().toISOString(),
    });

    // Salva itens em lote
    if (estadoLocal.itens.length > 0) {
      const rows = estadoLocal.itens.map((it) => ({
        id: it.id,
        user_id: userId,
        titulo: it.titulo,
        categoria: it.categoria,
        tipo_detalhado: it.tipoDetalhado,
        valor: it.valor,
        vencimento: it.vencimento,
        pago: it.pago,
        updated_at: new Date().toISOString(),
      }));

      await client.from('itens_lancamento').upsert(rows);
    }
  } catch (err) {
    console.error('Falha ao migrar dados locais para a nuvem:', err);
  }
}

/**
 * Sincroniza a renda e metas da família no Supabase
 */
export async function sincronizarPerfilNuvem(
  rendaFamiliar: number,
  metas: MetasRegra,
  userId: string = FAMILY_ID
) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('perfis_orcamento').upsert({
      user_id: userId,
      renda_familiar: rendaFamiliar,
      meta_fixas: metas.fixas,
      meta_superfluos: metas.superfluos,
      meta_investimentos: metas.investimentos,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Erro ao sincronizar perfil no Supabase:', e);
  }
}

/**
 * Sincroniza um item adicionado ou atualizado no Supabase
 */
export async function sincronizarItemNuvem(item: ItemLancamento, userId: string = FAMILY_ID) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('itens_lancamento').upsert({
      id: item.id,
      user_id: userId,
      titulo: item.titulo,
      categoria: item.categoria,
      tipo_detalhado: item.tipoDetalhado,
      valor: item.valor,
      vencimento: item.vencimento,
      pago: item.pago,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Erro ao sincronizar item no Supabase:', e);
  }
}

/**
 * Remove um item do Supabase
 */
export async function removerItemNuvem(itemId: string, userId: string = FAMILY_ID) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client
      .from('itens_lancamento')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId);
  } catch (e) {
    console.warn('Erro ao deletar item no Supabase:', e);
  }
}

/**
 * Inscreve no Supabase Realtime para escutar inserções/atualizações feitas em outros aparelhos
 */
export function inscreverTempoRealNuvem(onUpdate: () => void, userId: string = FAMILY_ID) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const canal = client
    .channel(`gestorlar_sync_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'itens_lancamento',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        onUpdate();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'perfis_orcamento',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(canal);
  };
}
