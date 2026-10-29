// Pix estático (BR Code, padrão EMV do Banco Central): o convidado paga direto na conta dos noivos.
// Não passa pela Eterna e não tem taxa. Sem dependências: roda no servidor e no navegador.

export type PixKeyType = "cpf" | "phone" | "email" | "random";
export type PixSettings = { type: PixKeyType; key: string; name: string; city: string };

export const PIX_KEY_TYPES: Record<PixKeyType, string> = {
  random: "Chave aleatória",
  email: "E-mail",
  phone: "Celular",
  cpf: "CPF ou CNPJ",
};

export const EMPTY_PIX: PixSettings = { type: "random", key: "", name: "", city: "" };

/** Chave no formato que o Pix exige, ou null se não for válida para o tipo escolhido. */
export function normalizePixKey(type: PixKeyType, raw: string): string | null {
  const key = raw.trim();
  const digits = key.replace(/\D/g, "");
  switch (type) {
    case "cpf":
      return digits.length === 11 || digits.length === 14 ? digits : null;
    case "phone":
      if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
      if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return `+${digits}`;
      return null;
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key) && key.length <= 77 ? key.toLowerCase() : null;
    case "random":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key) ? key.toLowerCase() : null;
  }
}

/** O BR Code só aceita letras sem acento, números e alguns símbolos. */
function ascii(s: string, max: number) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .,\-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

export function pixReady(p: PixSettings) {
  return Boolean(normalizePixKey(p.type, p.key) && ascii(p.name, 25) && ascii(p.city, 15));
}

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no fim do BR Code. */
export function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Código "Pix Copia e Cola". Sem valor, o convidado escolhe quanto quer dar. */
export function pixPayload(p: PixSettings, amountCents: number | null, description = ""): string | null {
  const key = normalizePixKey(p.type, p.key);
  const name = ascii(p.name, 25);
  const city = ascii(p.city, 15);
  if (!key || !name || !city) return null;
  // O campo da conta (26) tem no máximo 99 caracteres: a descrição usa o que sobrar.
  const room = 99 - tlv("00", "br.gov.bcb.pix").length - tlv("01", key).length - 4;
  const desc = room > 0 ? ascii(description, room) : "";
  const account = tlv("00", "br.gov.bcb.pix") + tlv("01", key) + (desc ? tlv("02", desc) : "");
  const body =
    tlv("00", "01") +
    tlv("26", account) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (amountCents && amountCents > 0 ? tlv("54", (amountCents / 100).toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", name) +
    tlv("60", city) +
    tlv("62", tlv("05", "***")) +
    "6304";
  return body + crc16(body);
}
