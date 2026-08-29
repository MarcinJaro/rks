import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireAdminWithEmail } from "./adminAuth";

/**
 * Wersja regulaminu, pod którą składane są zgody. Po każdej podmianie pliku
 * `public/documents/regulamin.pdf` trzeba tę wartość podbić - inaczej nie da
 * się odróżnić rodziców, którzy zaakceptowali starą treść, od tych, którzy
 * widzieli nową.
 */
export const REGULATION_VERSION = "2026-08";

const MAX_NAME = 120;
const MAX_EMAIL = 200;
const MAX_PHONE = 40;
const MAX_YEAR_GROUP = 40;

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function dedupeKeyFor(childPesel: string, version: string) {
  return `${childPesel}|${version}`;
}

function requireText(value: string, label: string, max: number) {
  const text = normalize(value);
  if (text.length < 2) throw new ConvexError(`Uzupełnij pole: ${label}`);
  if (text.length > max) throw new ConvexError(`Pole ${label} jest za długie`);
  return text;
}

/**
 * PESEL: 11 cyfr, ostatnia jest sumą kontrolną z wagami 1,3,7,9,1,3,7,9,1,3.
 */
function requirePesel(value: string, label: string) {
  const pesel = normalize(value).replace(/\s/g, "");
  if (!/^\d{11}$/.test(pesel)) {
    throw new ConvexError(`Pole ${label} musi mieć 11 cyfr`);
  }
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const sum = weights.reduce(
    (acc, weight, index) => acc + weight * Number(pesel[index]),
    0,
  );
  if ((10 - (sum % 10)) % 10 !== Number(pesel[10])) {
    throw new ConvexError(`Pole ${label} zawiera błędny numer PESEL`);
  }
  return pesel;
}

function requireEmail(value: string) {
  const email = normalize(value).toLowerCase();
  if (email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ConvexError("Podaj poprawny adres e-mail");
  }
  return email;
}

export const currentVersion = query({
  args: {},
  handler: async () => REGULATION_VERSION,
});

/**
 * Publiczny endpoint - formularz wypełniają rodzice, którzy nie są zalogowani.
 * Ponowne wysłanie zgody dla tego samego dziecka i tej samej wersji regulaminu
 * aktualizuje istniejący wpis zamiast tworzyć duplikat.
 */
export const accept = mutation({
  args: {
    parentName: v.string(),
    parentEmail: v.string(),
    parentPhone: v.optional(v.string()),
    childName: v.string(),
    childYearGroup: v.string(),
    childPesel: v.string(),
    parentPesel: v.string(),
    acceptedRegulation: v.boolean(),
    acceptedChildProtection: v.boolean(),
    acceptedDataProcessing: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.acceptedRegulation) {
      throw new ConvexError("Zaznacz akceptację regulaminu");
    }
    if (!args.acceptedChildProtection) {
      throw new ConvexError("Zaznacz akceptację polityki ochrony dzieci");
    }
    if (!args.acceptedDataProcessing) {
      throw new ConvexError("Zaznacz zgodę na przetwarzanie danych");
    }

    const parentName = requireText(args.parentName, "imię i nazwisko rodzica", MAX_NAME);
    const parentEmail = requireEmail(args.parentEmail);
    const childName = requireText(args.childName, "imię i nazwisko dziecka", MAX_NAME);
    const childYearGroup = requireText(args.childYearGroup, "rocznik", MAX_YEAR_GROUP);
    const childPesel = requirePesel(args.childPesel, "PESEL zawodnika");
    const parentPesel = requirePesel(args.parentPesel, "PESEL rodzica");
    const parentPhone = args.parentPhone
      ? normalize(args.parentPhone).slice(0, MAX_PHONE)
      : undefined;

    const dedupeKey = dedupeKeyFor(childPesel, REGULATION_VERSION);
    const acceptedAt = Date.now();

    const existing = await ctx.db
      .query("regulationAcceptances")
      .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", dedupeKey))
      .first();

    if (existing) {
      // Ten sam PESEL dziecka + inny e-mail rodzica = to nie jest ten sam
      // nadawca. Nie nadpisujemy oryginalnego dowodu prawnego cudzymi danymi;
      // zapisujemy nowy wiersz, panel pokaże oba i pozwoli rozstrzygnąć.
      if (existing.parentEmail !== parentEmail) {
        await ctx.db.insert("regulationAcceptances", {
          parentName,
          parentEmail,
          parentPhone,
          childName,
          childYearGroup,
          childPesel,
          parentPesel,
          documentVersion: REGULATION_VERSION,
          acceptedRegulation: true,
          acceptedChildProtection: true,
          acceptedDataProcessing: true,
          acceptedAt,
          // Oznaczamy jako sporny, żeby unikalność dedupeKey nie kolidowała.
          dedupeKey: `${dedupeKey}|${acceptedAt}`,
        });
        return { status: "conflict" as const, version: REGULATION_VERSION };
      }
      await ctx.db.patch(existing._id, {
        parentName,
        parentEmail,
        parentPhone,
        childName,
        childYearGroup,
        childPesel,
        parentPesel,
        acceptedRegulation: true,
        acceptedChildProtection: true,
        acceptedDataProcessing: true,
        acceptedAt,
      });
      return { status: "updated" as const, version: REGULATION_VERSION };
    }

    await ctx.db.insert("regulationAcceptances", {
      parentName,
      parentEmail,
      parentPhone,
      childName,
      childYearGroup,
      childPesel,
      parentPesel,
      documentVersion: REGULATION_VERSION,
      acceptedRegulation: true,
      acceptedChildProtection: true,
      acceptedDataProcessing: true,
      acceptedAt,
      dedupeKey,
    });

    return { status: "created" as const, version: REGULATION_VERSION };
  },
});

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminWithEmail(ctx);

    return await ctx.db
      .query("regulationAcceptances")
      .withIndex("by_acceptedAt")
      .order("desc")
      .collect();
  },
});

export const removeAcceptance = mutation({
  args: { id: v.id("regulationAcceptances") },
  handler: async (ctx, { id }) => {
    await requireAdminWithEmail(ctx);
    await ctx.db.delete(id);
  },
});
