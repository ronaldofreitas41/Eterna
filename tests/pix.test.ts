import { describe, expect, it } from "vitest";
import { parseBRL, parseDesign } from "@/lib/design";
import { crc16, normalizePixKey, pixPayload, pixReady } from "@/lib/pix";

describe("presentes por Pix", () => {
  it("calcula o CRC16-CCITT do BR Code", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("gera o mesmo código do exemplo do Banco Central", () => {
    const code = pixPayload({ type: "random", key: "123e4567-e12b-12d1-a456-426655440000", name: "Fulano de Tal", city: "BRASILIA" }, null);
    expect(code).toBe(
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
    );
  });

  it("inclui o valor, tira acentos e respeita os limites de tamanho", () => {
    const code = pixPayload(
      { type: "email", key: "Noivos@Exemplo.com", name: "Maria Conceição da Silva Albuquerque", city: "São José dos Campos" },
      15050,
      "Jantar romântico em Lisboa com vista para o rio",
    )!;
    expect(code).toContain("0118noivos@exemplo.com");
    expect(code).toContain("5406150.50");
    expect(code).toContain("5924Maria Conceicao da Silva");
    expect(code).toContain("6015Sao Jose dos Ca");
    const account = code.slice(code.indexOf("26") + 4, code.indexOf("26") + 4 + Number(code.slice(code.indexOf("26") + 2, code.indexOf("26") + 4)));
    expect(account.length).toBeLessThanOrEqual(99);
    expect(code.slice(-4)).toBe(crc16(code.slice(0, -4)));
  });

  it("normaliza e valida as chaves por tipo", () => {
    expect(normalizePixKey("phone", "(11) 91234-5678")).toBe("+5511912345678");
    expect(normalizePixKey("phone", "+55 11 91234-5678")).toBe("+5511912345678");
    expect(normalizePixKey("cpf", "123.456.789-09")).toBe("12345678909");
    expect(normalizePixKey("cpf", "123")).toBeNull();
    expect(normalizePixKey("email", "sem-arroba")).toBeNull();
    expect(normalizePixKey("random", "não-é-uuid")).toBeNull();
  });

  it("só fica pronto com chave válida, nome e cidade", () => {
    expect(pixReady({ type: "email", key: "a@b.com", name: "Ana", city: "" })).toBe(false);
    expect(pixReady({ type: "email", key: "a@b.com", name: "Ana", city: "Itu" })).toBe(true);
    expect(pixPayload({ type: "cpf", key: "1", name: "Ana", city: "Itu" }, 100)).toBeNull();
  });

  it("designs salvos antes do Pix continuam com os presentes", () => {
    const d = parseDesign({ content: { gifts: [{ title: "Panelas", description: "", url: "", priceCents: 1000 }] } });
    expect(d.content.gifts).toHaveLength(1);
    expect(d.content.pix.key).toBe("");
  });

  it("entende valores escritos de vários jeitos", () => {
    expect(parseBRL("150")).toBe(15000);
    expect(parseBRL("150,50")).toBe(15050);
    expect(parseBRL("R$ 1.500,00")).toBe(150000);
    expect(parseBRL("150.50")).toBe(15050);
    expect(parseBRL("1.500")).toBe(150000);
    expect(parseBRL("")).toBeNull();
    expect(parseBRL("abc")).toBeNull();
  });
});
