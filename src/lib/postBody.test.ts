import { describe, expect, it } from "vitest";
import { parsePostBody } from "./postBody";

const sample =
  '🔵⚪ GODZINA DO MECZU! ⚽🔥<br><br>Już za godzinę nasi Lotnicy zmierzą się z Laurą Chylice! 💪<br><br>Trzymamy kciuki!<br><br>WALCZYMY RAZEM! 🔵⚪<br><br><span class="hashtag">#RKSOkęcie</span> <span class="hashtag">#Lotnicy</span>';

describe("parsePostBody", () => {
  it("pomija akapit powtarzający tytuł i awansuje pierwszy akapit na lede", () => {
    const blocks = parsePostBody(sample, "GODZINA DO MECZU!");
    expect(blocks[0].kind).toBe("lede");
    expect((blocks[0] as { html: string }).html).toContain("Już za godzinę");
  });

  it("krzyczące linie zamienia w bloki shout", () => {
    const blocks = parsePostBody(sample, "GODZINA DO MECZU!");
    const shout = blocks.find((block) => block.kind === "shout");
    expect(shout).toBeTruthy();
    expect((shout as { html: string }).html).toContain("WALCZYMY RAZEM");
  });

  it("zbiera hasztagi z końcowego akapitu w listę tagów", () => {
    const blocks = parsePostBody(sample, "GODZINA DO MECZU!");
    const tags = blocks.at(-1);
    expect(tags).toEqual({ kind: "tags", tags: ["#RKSOkęcie", "#Lotnicy"] });
  });

  it("nie wycina pierwszego akapitu, gdy tytuł jest inny (artykuły CMS)", () => {
    const blocks = parsePostBody("Pierwszy akapit treści.<br><br>Drugi.", "Inny tytuł");
    expect(blocks[0]).toEqual({ kind: "lede", html: "Pierwszy akapit treści." });
    expect(blocks[1].kind).toBe("paragraph");
  });

  it("hasztagi w środku zdania zostają w akapicie", () => {
    const blocks = parsePostBody(
      'Gramy z <span class="hashtag">#Laura</span> w sobotę.',
      "Tytuł",
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("lede");
  });
});
