import "server-only";
import type { PoolClient } from "pg";
import { getCurrentUser } from "./auth";
import { one, query } from "./db";

// Arquivos de imagem guardados no banco (tabela files) e servidos por /api/arquivos/[id].

export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export type FileKind = "photo" | "memory" | "cover" | "reference";

const SIGNATURES: { mime: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/gif", test: (b) => b.subarray(0, 4).toString("ascii") === "GIF8" },
  { mime: "image/webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

export class FileError extends Error {}

/** Valida tamanho e conteúdo real (assinatura do arquivo, não só a extensão) e grava. */
export async function saveFile(weddingId: string, kind: FileKind, file: File, db?: PoolClient) {
  if (!file || file.size === 0) throw new FileError("Escolha uma imagem.");
  if (file.size > MAX_FILE_BYTES) throw new FileError("A imagem passa de 4 MB. Tente uma versão menor.");
  const data = Buffer.from(await file.arrayBuffer());
  const mime = SIGNATURES.find((s) => s.test(data))?.mime;
  if (!mime) throw new FileError("Envie uma imagem JPG, PNG, WEBP ou GIF.");
  const row = await one<{ id: string }>(
    "insert into files (wedding_id, kind, mime, size, data) values ($1, $2, $3, $4, $5) returning id",
    [weddingId, kind, mime, data.length, data],
    db,
  );
  return row!.id;
}

export const fileUrl = (id: string | null | undefined) => (id ? `/api/arquivos/${id}` : null);

/**
 * Quem pode ver um arquivo:
 *   - o dono do casamento, sempre;
 *   - qualquer pessoa, se for a capa, uma foto aprovada ou a foto de uma contribuição publicada de um site publicado.
 * Referências visuais são só dos noivos.
 */
export async function readFileIfAllowed(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const file = await one<{ mime: string; data: Buffer; kind: FileKind; owner_id: string; is_public: boolean }>(
    `select f.mime, f.data, f.kind, w.owner_id,
       (w.published and f.kind <> 'reference' and (
          w.cover_file_id = f.id
          or exists (select 1 from photos p where p.file_id = f.id and p.status = 'approved')
          or exists (select 1 from contributions c where c.photo_file_id = f.id and c.status = 'published')
       )) as is_public
     from files f join weddings w on w.id = f.wedding_id
     where f.id = $1`,
    [id],
  );
  if (!file) return null;
  if (file.is_public) return { ...file, cacheable: true };
  const user = await getCurrentUser();
  if (user?.id === file.owner_id) return { ...file, cacheable: false };
  return null;
}

export async function deleteFiles(weddingId: string, ids: (string | null | undefined)[], db?: PoolClient) {
  const list = ids.filter((x): x is string => Boolean(x));
  if (list.length) await query("delete from files where wedding_id = $1 and id = any($2::uuid[])", [weddingId, list], db);
}
