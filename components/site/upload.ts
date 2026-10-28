"use client";

// Reduz a imagem no navegador antes do envio (até 2400 px no maior lado, JPEG 86%).
// Fotos de celular de 8 a 12 MB costumam virar 0,8 a 1,5 MB, abaixo do limite de 4 MB do servidor.

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIDE = 2400;
const MAX_BYTES = 4 * 1024 * 1024;

export async function prepareImage(file: File): Promise<File> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Envie uma imagem JPG, PNG, WEBP ou GIF.");
  // GIFs animados perderiam a animação; vão como estão.
  if (file.type === "image/gif") {
    if (file.size > MAX_BYTES) throw new Error("O GIF passa de 4 MB.");
    return file;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Não foi possível ler a imagem. Tentem outro arquivo.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new Error("Não foi possível preparar a imagem.");
  if (blob.size > MAX_BYTES) throw new Error("A imagem continua grande demais depois de reduzida.");
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}
