import { redirect } from "next/navigation";

// Endereço antigo: mensagens, histórias e fotos agora ficam juntas em "Memórias".
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/painel/${id}/memorias`);
}
