"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";

const settingSections = [
  {
    title: "Dane kontaktowe",
    description: "Dane kontaktowe i linki społecznościowe używane na stronie.",
    fields: [
      ["contact_email", "E-mail kontaktowy", ""],
      ["contact_phone", "Telefon", ""],
      ["contact_address", "Adres", ""],
      ["facebook_url", "Link do Facebooka", ""],
      ["youtube_url", "Link do kanału YouTube", ""],
      ["instagram_url", "Link do Instagrama", ""],
    ],
  },
  {
    title: "Stroje meczowe",
    description:
      "Wyświetlane na stronie Zawodnik → Stroje i sklep. Puste pole = wartość domyślna ze strony.",
    fields: [
      ["kit_price", "Koszt kompletu meczowego", "320 zł"],
      [
        "kit_includes",
        "Co wchodzi w skład kompletu",
        "np. koszulka, spodenki i getry meczowe",
      ],
      ["kit_order_email", "E-mail do zamówień strojów", "stroje@rksokecie.pl"],
    ],
  },
] satisfies {
  title: string;
  description: string;
  fields: [key: string, label: string, placeholder: string][];
}[];

const settingFields = settingSections.flatMap((section) => section.fields);

export default function AdminSettingsPage() {
  const settings = useQuery(api.settings.list);
  const setSetting = useMutation(api.settings.set);

  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      const loaded: Record<string, string> = {};
      for (const setting of settings) {
        loaded[setting.key] = setting.value;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues((prev) => ({ ...loaded, ...prev }));
    }
  }, [settings]);

  async function handleSave() {
    setError(null);
    setMessage(null);
    try {
      for (const [key] of settingFields) {
        const value = values[key];
        if (value !== undefined) {
          await setSetting({ key, value });
        }
      }
      setMessage("Ustawienia zapisane");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    }
  }

  return (
    <>
      <h1 className="text-3xl font-black text-navy">Ustawienia</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Treści używane w różnych miejscach strony.
      </p>
      <Feedback error={error} message={message} />
      {settingSections.map((section) => (
        <section
          key={section.title}
          className="mt-6 grid max-w-xl gap-4 rounded-lg border border-border bg-card p-5"
        >
          <div>
            <h2 className="text-lg font-black text-navy">{section.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {section.description}
            </p>
          </div>
          {section.fields.map(([key, label, placeholder]) => (
            <Field key={key} label={label}>
              <input
                value={values[key] ?? ""}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [key]: event.target.value }))
                }
                placeholder={placeholder}
                className={inputClass}
              />
            </Field>
          ))}
        </section>
      ))}
      <div className="mt-6">
        <Button onClick={handleSave}>Zapisz ustawienia</Button>
      </div>
    </>
  );
}
