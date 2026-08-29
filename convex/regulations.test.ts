import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

// PESEL-e wygenerowane z poprawną sumą kontrolną (fikcyjne osoby).
const validSubmission = {
  parentName: "Anna Kowalska",
  parentEmail: "Anna.Kowalska@Example.COM",
  parentPhone: "600 100 200",
  parentPesel: "88112345671",
  childName: "Jan Kowalski",
  childPesel: "15230712342",
  childYearGroup: "Rocznik 2015",
  acceptedRegulation: true,
  acceptedChildProtection: true,
  acceptedDataProcessing: true,
};

describe("regulations.accept", () => {
  it("zapisuje zgodę razem z wersją regulaminu", async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(api.regulations.accept, validSubmission);
    expect(result.status).toBe("created");

    const stored = await t.run(async (ctx) =>
      await ctx.db.query("regulationAcceptances").collect(),
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].childName).toBe("Jan Kowalski");
    expect(stored[0].parentEmail).toBe("anna.kowalska@example.com");
    expect(stored[0].documentVersion).toBe(result.version);
    expect(stored[0].childPesel).toBe("15230712342");
    expect(stored[0].parentPesel).toBe("88112345671");
    expect(stored[0].acceptedAt).toBeGreaterThan(0);
  });

  it("nie tworzy duplikatu dla tego samego dziecka i wersji", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.regulations.accept, validSubmission);
    const second = await t.mutation(api.regulations.accept, {
      ...validSubmission,
      // Ten sam PESEL dziecka = ten sam wpis, niezależnie od pisowni nazwiska.
      childName: "  jan   KOWALSKI ",
      parentPhone: "600 100 999",
    });

    expect(second.status).toBe("updated");
    const stored = await t.run(async (ctx) =>
      await ctx.db.query("regulationAcceptances").collect(),
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].parentPhone).toBe("600 100 999");
  });

  it("nie nadpisuje cudzej zgody - inny e-mail rodzica tworzy nowy wpis", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.regulations.accept, validSubmission);
    const second = await t.mutation(api.regulations.accept, {
      ...validSubmission,
      parentEmail: "obcy@example.com",
      parentName: "Ktoś Obcy",
    });

    expect(second.status).toBe("conflict");
    const stored = await t.run(async (ctx) =>
      await ctx.db.query("regulationAcceptances").collect(),
    );
    // Oryginalny wpis nietknięty + drugi jako sporny.
    expect(stored).toHaveLength(2);
    const original = stored.find((r) => r.parentEmail === "anna.kowalska@example.com");
    expect(original?.parentName).toBe("Anna Kowalska");
  });

  it("odrzuca zgłoszenie bez akceptacji regulaminu", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.regulations.accept, {
        ...validSubmission,
        acceptedRegulation: false,
      }),
    ).rejects.toThrow(/regulaminu/i);
  });

  it("odrzuca zgłoszenie bez akceptacji polityki ochrony dzieci", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.regulations.accept, {
        ...validSubmission,
        acceptedChildProtection: false,
      }),
    ).rejects.toThrow(/ochrony dzieci/i);
  });

  it("odrzuca zgłoszenie bez zgody na przetwarzanie danych", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.regulations.accept, {
        ...validSubmission,
        acceptedDataProcessing: false,
      }),
    ).rejects.toThrow(/przetwarzanie danych/i);
  });

  it("odrzuca niepoprawny e-mail", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.regulations.accept, {
        ...validSubmission,
        parentEmail: "anna(at)example.com",
      }),
    ).rejects.toThrow(/e-mail/i);
  });

  it("odrzuca PESEL z błędną sumą kontrolną", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.regulations.accept, {
        ...validSubmission,
        childPesel: "15230712341",
      }),
    ).rejects.toThrow(/błędny numer PESEL/i);
  });

  it("odrzuca PESEL o złej długości", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.regulations.accept, {
        ...validSubmission,
        parentPesel: "1234567890",
      }),
    ).rejects.toThrow(/11 cyfr/);
  });

  it("odrzuca puste imię dziecka", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.regulations.accept, {
        ...validSubmission,
        childName: "   ",
      }),
    ).rejects.toThrow(/dziecka/i);
  });
});

describe("regulations.adminList", () => {
  it("odmawia dostępu bez zalogowania", async () => {
    const t = convexTest(schema, modules);

    await expect(t.query(api.regulations.adminList, {})).rejects.toThrow(
      /autoryzacji/i,
    );
  });

  it("odmawia dostępu, gdy ADMIN_EMAILS nie jest ustawione", async () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ email: "kto@example.com" });

    await expect(asUser.query(api.regulations.adminList, {})).rejects.toThrow(
      /ADMIN_EMAILS/,
    );
  });

  it("odmawia dostępu kontu spoza listy ADMIN_EMAILS", async () => {
    const t = convexTest(schema, modules);
    const asOutsider = t.withIdentity({ email: "obcy@example.com" });

    await expect(asOutsider.query(api.regulations.adminList, {})).rejects.toThrow(
      /uprawnień/i,
    );
  });

  it("wpuszcza konto z listy ADMIN_EMAILS", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity({ email: "admin@rksokecie.pl" });

    expect(await asAdmin.query(api.regulations.adminList, {})).toEqual([]);
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});
