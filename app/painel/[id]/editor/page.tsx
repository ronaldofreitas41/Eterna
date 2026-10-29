import { redirect } from "next/navigation";

// Endereço antigo: o editor e o assistente agora ficam juntos em "Meu site".
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/painel/${id}/site?aba=textos`);
}
