import Image from "next/image";
import { UserRound } from "lucide-react";

export type CardPerson = {
  name: string;
  number?: string;
  photoUrl?: string | null;
};

export function PersonCard({
  person,
  variant,
}: {
  person: CardPerson;
  variant: "player" | "coach";
}) {
  const initials = person.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="relative aspect-[4/5] bg-muted">
        {person.photoUrl ? (
          <Image
            src={person.photoUrl}
            alt={person.name}
            fill
            sizes="(min-width: 1024px) 170px, (min-width: 640px) 25vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,#1f2d48_0%,#0b1222_65%)]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-background/60 text-2xl font-black text-primary">
              {initials || <UserRound size={30} />}
            </div>
          </div>
        )}
        {variant === "player" && person.number ? (
          <div className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 text-sm font-black text-primary-foreground">
            {person.number}
          </div>
        ) : null}
      </div>
      <div className="p-4">
        <h3 className="text-base font-black leading-tight text-white">
          {person.name}
        </h3>
        <p className="mt-2 text-xs font-bold uppercase text-muted-foreground">
          {variant === "coach" ? "Sztab szkoleniowy" : "RKS Okęcie"}
        </p>
      </div>
    </article>
  );
}
