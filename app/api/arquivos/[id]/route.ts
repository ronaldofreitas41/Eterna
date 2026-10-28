import { readFileIfAllowed } from "@/lib/files";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await readFileIfAllowed(id);
  if (!file) return new Response("Arquivo não encontrado.", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.data.length),
      // Arquivos públicos podem ficar em cache por um tempo curto (uma foto removida deixa de aparecer logo).
      "Cache-Control": file.cacheable ? "public, max-age=300" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
