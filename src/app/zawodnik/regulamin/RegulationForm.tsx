"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { CheckCircle2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { errorMessage } from "@/lib/convexError";
import { teams } from "@/data/site";

const yearGroupOptions = teams
  .filter((team) => team.yearGroup)
  .map((team) => team.name);

type FormState = {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  parentPesel: string;
  childName: string;
  childPesel: string;
  childYearGroup: string;
  acceptedRegulation: boolean;
  acceptedChildProtection: boolean;
  acceptedDataProcessing: boolean;
};

type ConsentKey =
  | "acceptedRegulation"
  | "acceptedChildProtection"
  | "acceptedDataProcessing";

const consents: {
  key: ConsentKey;
  text: string;
  document?: { label: string; href: string };
}[] = [
  {
    key: "acceptedRegulation",
    text: "Oświadczam, że zapoznałem/zapoznałam się z Regulaminem Klubu RKS Okęcie Warszawa i akceptuję jego postanowienia.",
    document: { label: "Regulamin klubu", href: "/documents/regulamin.pdf" },
  },
  {
    key: "acceptedChildProtection",
    text: "Oświadczam, że zapoznałem/zapoznałam się z Polityką ochrony dzieci obowiązującą w klubie.",
    document: {
      label: "Polityka ochrony dzieci",
      href: "/documents/polityka-ochrony-dzieci.pdf",
    },
  },
  {
    key: "acceptedDataProcessing",
    text: "Wyrażam zgodę na przetwarzanie danych osobowych moich i mojego dziecka w celu udokumentowania powyższych akceptacji.",
    document: {
      label: "Polityka prywatności",
      href: "/polityka-prywatnosci",
    },
  },
];

const emptyForm: FormState = {
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  parentPesel: "",
  childName: "",
  childPesel: "",
  childYearGroup: yearGroupOptions[0] ?? "",
  acceptedRegulation: false,
  acceptedChildProtection: false,
  acceptedDataProcessing: false,
};

export function RegulationForm() {
  const accept = useMutation(api.regulations.accept);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await accept({
        parentName: form.parentName,
        parentEmail: form.parentEmail,
        parentPhone: form.parentPhone || undefined,
        childName: form.childName,
        childYearGroup: form.childYearGroup,
        childPesel: form.childPesel,
        parentPesel: form.parentPesel,
        acceptedRegulation: form.acceptedRegulation,
        acceptedChildProtection: form.acceptedChildProtection,
        acceptedDataProcessing: form.acceptedDataProcessing,
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, "Nie udało się wysłać formularza"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[24px] border border-primary/40 bg-primary/10 p-7">
        <CheckCircle2 className="text-primary" size={34} />
        <h2 className="mt-4 text-2xl font-black text-white">
          Akceptacja zapisana
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Dziękujemy. Zgoda dla zawodnika {form.childName} została
          odnotowana w klubie. W razie pytań skontaktuj się z trenerem
          prowadzącym rocznik.
        </p>
        <Button
          className="mt-6"
          variant="outline"
          onClick={() => {
            setForm(emptyForm);
            setDone(false);
          }}
        >
          Wyślij dla kolejnego dziecka
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[24px] border border-white/8 bg-card p-7"
    >
      <h2 className="text-2xl font-black text-white">
        Formularz akceptacji
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Wypełnia rodzic lub opiekun prawny zawodnika.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Imię i nazwisko rodzica / opiekuna">
          <input
            className={inputClass}
            value={form.parentName}
            onChange={(event) => set("parentName", event.target.value)}
            autoComplete="name"
            required
          />
        </Field>
        <Field label="Adres e-mail">
          <input
            className={inputClass}
            type="email"
            value={form.parentEmail}
            onChange={(event) => set("parentEmail", event.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Telefon (opcjonalnie)">
          <input
            className={inputClass}
            type="tel"
            value={form.parentPhone}
            onChange={(event) => set("parentPhone", event.target.value)}
            autoComplete="tel"
          />
        </Field>
        <Field label="PESEL rodzica / opiekuna">
          <input
            className={inputClass}
            value={form.parentPesel}
            onChange={(event) => set("parentPesel", event.target.value)}
            inputMode="numeric"
            pattern="\d{11}"
            maxLength={11}
            required
          />
        </Field>
        <Field label="Imię i nazwisko dziecka">
          <input
            className={inputClass}
            value={form.childName}
            onChange={(event) => set("childName", event.target.value)}
            required
          />
        </Field>
        <Field label="PESEL dziecka">
          <input
            className={inputClass}
            value={form.childPesel}
            onChange={(event) => set("childPesel", event.target.value)}
            inputMode="numeric"
            pattern="\d{11}"
            maxLength={11}
            required
          />
        </Field>
        <Field label="Rocznik / drużyna">
          <select
            className={inputClass}
            value={form.childYearGroup}
            onChange={(event) => set("childYearGroup", event.target.value)}
            required
          >
            {yearGroupOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-6 grid gap-3">
        {consents.map((consent) => (
          <label
            key={consent.key}
            className="flex gap-3 rounded-[16px] bg-[var(--surface-raised)] p-5 text-sm leading-6 text-muted-foreground"
          >
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]"
              checked={form[consent.key]}
              onChange={(event) => set(consent.key, event.target.checked)}
              required
            />
            <span>
              {consent.text}
              {consent.document ? (
                <>
                  {" "}
                  <a
                    href={consent.document.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-primary hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {consent.document.label}
                  </a>
                </>
              ) : null}
            </span>
          </label>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Administratorem danych jest RKS Okęcie Warszawa, ul. Radarowa 1,
        02-137 Warszawa. Dane podane w formularzu przetwarzamy wyłącznie w celu
        udokumentowania akceptacji regulaminu i polityki ochrony dzieci.
      </p>

      <Feedback error={error} />

      <Button className="mt-6" type="submit" disabled={busy}>
        {busy ? "Wysyłanie…" : "Akceptuję regulamin"}
      </Button>
    </form>
  );
}
