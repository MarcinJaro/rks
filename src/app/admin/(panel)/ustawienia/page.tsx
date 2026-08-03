"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";

const settingFields = [
  ["contact_email", "E-mail kontaktowy"],
  ["contact_phone", "Telefon"],
  ["contact_address", "Adres"],
  ["facebook_url", "Link do Facebooka"],
  ["youtube_url", "Link do kanału YouTube"],
  ["instagram_url", "Link do Instagrama"],
] as const;

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
        Dane kontaktowe i linki społecznościowe używane na stronie.
      </p>
      <Feedback error={error} message={message} />
      <section className="mt-6 grid max-w-xl gap-4 rounded-lg border border-border bg-card p-5">
        {settingFields.map(([key, label]) => (
          <Field key={key} label={label}>
            <input
              value={values[key] ?? ""}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, [key]: event.target.value }))
              }
              className={inputClass}
            />
          </Field>
        ))}
        <div>
          <Button onClick={handleSave}>Zapisz ustawienia</Button>
        </div>
      </section>
    </>
  );
}
