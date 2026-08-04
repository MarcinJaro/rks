import { describe, expect, it } from "vitest";
import { cleanText, decodeIso88592, htmlDecode, stripTags } from "./encoding";

describe("decodeIso88592", () => {
  it("dekoduje polskie znaki", () => {
    // "Okęcie" w ISO-8859-2: O k ę(0xEA) c i e
    const bytes = new Uint8Array([0x4f, 0x6b, 0xea, 0x63, 0x69, 0x65]);
    expect(decodeIso88592(bytes)).toBe("Okęcie");
  });

  it("dekoduje pozostałe polskie diakrytyki", () => {
    const bytes = new Uint8Array([0xb1, 0xe6, 0xb3, 0xf1, 0xf3, 0xb6, 0xbf, 0xac]);
    expect(decodeIso88592(bytes)).toBe("ąćłńóśżŹ");
  });

  it("zostawia ASCII bez zmian", () => {
    const bytes = new Uint8Array([0x41, 0x42, 0x43]);
    expect(decodeIso88592(bytes)).toBe("ABC");
  });
});

describe("cleanText", () => {
  it("zdejmuje tagi, encje i nadmiarowe spacje", () => {
    expect(cleanText("<b>  Okęcie&nbsp;Warszawa  </b>")).toBe("Okęcie Warszawa");
  });

  it("stripTags zamienia tagi na spacje", () => {
    expect(stripTags("<b>a</b><i>b</i>").trim()).toBe("a  b".trim());
  });

  it("htmlDecode rozwija encje", () => {
    expect(htmlDecode("a&amp;b&quot;c")).toBe('a&b"c');
  });
});
