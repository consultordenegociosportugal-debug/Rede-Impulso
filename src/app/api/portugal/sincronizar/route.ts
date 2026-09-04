import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sincronizarImovel } from "@/lib/portais-externos";

export async function POST(request: NextRequest) {
  const { imovelId } = (await request.json()) as { imovelId?: string };

  if (!imovelId) {
    return NextResponse.json({ erro: "Imóvel inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "É preciso estar logado." }, { status: 401 });
  }

  const { data: imovel } = await supabase
    .from("imoveis")
    .select(
      "id, vendedor_id, titulo, descricao, tipo, finalidade, bairro, cidade, preco, quartos, banheiros, area_m2, imovel_fotos(arquivo_url, ordem)",
    )
    .eq("id", imovelId)
    .maybeSingle();

  if (!imovel || imovel.vendedor_id !== user.id) {
    return NextResponse.json({ erro: "Imóvel não encontrado." }, { status: 404 });
  }

  await supabase.from("imoveis").update({ sincronizar_portugal: true, portugal_status: "pendente" }).eq("id", imovel.id);

  const fotos = [...imovel.imovel_fotos]
    .sort((a, b) => a.ordem - b.ordem)
    .map((f) => f.arquivo_url);

  const resultado = await sincronizarImovel({
    id: imovel.id,
    titulo: imovel.titulo,
    descricao: imovel.descricao,
    tipo: imovel.tipo,
    finalidade: imovel.finalidade,
    bairro: imovel.bairro,
    cidade: imovel.cidade,
    preco: imovel.preco,
    quartos: imovel.quartos,
    banheiros: imovel.banheiros,
    areaM2: imovel.area_m2,
    fotos,
  });

  if (!resultado.ok) {
    await supabase
      .from("imoveis")
      .update({ portugal_status: "erro", portugal_erro: resultado.erro })
      .eq("id", imovel.id);

    return NextResponse.json({ erro: resultado.erro }, { status: 503 });
  }

  await supabase
    .from("imoveis")
    .update({
      portugal_status: "publicado",
      portugal_id_externo: resultado.idExterno,
      portugal_sincronizado_em: new Date().toISOString(),
      portugal_erro: null,
    })
    .eq("id", imovel.id);

  return NextResponse.json({ ok: true, idExterno: resultado.idExterno });
}
