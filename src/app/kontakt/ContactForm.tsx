"use client";

import { useState } from "react";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/admin/fields";

type ContactPerson = {
  label: string;
  name: string;
  phone: string;
  email: string;
};

/**
 * Klub nie ma skrzynki odbiorczej na stronie, więc formularz składa gotową
 * wiadomość i przekazuje ją do programu pocztowego. Bez tego przycisk
 * „Wyślij" tylko przeładowywałby stronę i gubił treść.
 */
export function ContactForm({
  people,
  clubEmail,
}: {
  people: ContactPerson[];
  clubEmail: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const subject = encodeURIComponent(
      `Wiadomość ze strony${name ? ` - ${name}` : ""}`,
    );
    const body = encodeURIComponent(
      [message, "", "---", name, email].filter(Boolean).join("\n"),
    );
    window.location.href = `mailto:${clubEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[24px] border border-white/8 bg-card p-6 shadow-sm"
    >
      <div className="mb-6 rounded-[18px] border border-white/8 bg-muted p-5">
        <UsersRound className="text-primary" size={24} />
        <h2 className="mt-3 text-xl font-black text-white">Kogo szukasz?</h2>
        <div className="mt-4 grid gap-3">
          {people.map((person) => (
            <div key={person.email} className="text-sm text-muted-foreground">
              <p className="font-black text-white">{person.label}</p>
              <p>{person.name}</p>
              <p>
                <a className="text-accent" href={`tel:${person.phone.replaceAll(" ", "")}`}>
                  {person.phone}
                </a>{" "}
                ·{" "}
                <a className="text-accent" href={`mailto:${person.email}`}>
                  {person.email}
                </a>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imię i nazwisko">
          <input
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </Field>
        <Field label="Email">
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </Field>
      </div>
      <label className="mt-4 grid gap-2 text-sm font-bold">
        Wiadomość
        <textarea
          className="min-h-36 rounded-md border border-border bg-background p-3 font-normal"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
        />
      </label>

      <Button className="mt-5" type="submit">
        Wyślij wiadomość
      </Button>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Wiadomość otworzy się w Twoim programie pocztowym z gotową treścią.
        Możesz też napisać bezpośrednio na{" "}
        <a
          className="font-bold text-primary hover:underline"
          href={`mailto:${clubEmail}`}
        >
          {clubEmail}
        </a>
        .
      </p>
    </form>
  );
}
