"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { youtubeEmbedUrl } from "@/lib/youtube";

const statusLabels: Record<string, string> = {
  scheduled: "Zaplanowana",
  live: "Na żywo",
  ended: "Zakończona",
};

function formatDate(timestamp?: number) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function AdminLivePage() {
  const streams = useQuery(api.liveStreams.list);
  const matchOptions = useQuery(api.matches.adminMatchOptions) ?? [];
  const createStream = useMutation(api.liveStreams.create);
  const startStream = useMutation(api.liveStreams.start);
  const endStream = useMutation(api.liveStreams.end);
  const saveToMatch = useMutation(api.liveStreams.saveToMatch);
  const removeStream = useMutation(api.liveStreams.remove);

  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [matchId, setMatchId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = youtubeEmbedUrl(youtubeUrl);

  async function handleCreate() {
    setError(null);
    setMessage(null);
    if (!previewUrl) {
      setError("Ten link nie wygląda na poprawny adres YouTube");
      return;
    }
    try {
      await createStream({
        title,
        youtubeUrl,
        matchId: matchId ? (matchId as Id<"matches">) : undefined,
      });
      setTitle("");
      setYoutubeUrl("");
      setMatchId("");
      setMessage("Transmisja dodana — możesz ją rozpocząć poniżej");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    }
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    }
  }

  return (
    <>
      <h1 className="text-3xl font-black text-navy">Transmisja live</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Wklej link z YouTube (tam streamuje kamera VEO), sprawdź podgląd i
        rozpocznij transmisję — sekcja &ldquo;Mecz live&rdquo; pojawi się na
        stronie głównej automatycznie.
      </p>

      {message ? (
        <p className="mt-4 rounded-md bg-primary/15 px-4 py-2 text-sm font-bold text-primary">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-md bg-red-500/15 px-4 py-2 text-sm font-bold text-red-300">
          {error}
        </p>
      ) : null}

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-black text-navy">Nowa transmisja</h2>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm font-bold">
            Tytuł
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="RKS Okęcie — Znicz II Pruszków"
              className="rounded-md border border-border bg-background px-3 py-2 font-normal"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Link do transmisji YouTube
            <input
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://youtube.com/live/..."
              className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm font-normal"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Powiązany mecz (opcjonalnie)
            <select
              value={matchId}
              onChange={(event) => setMatchId(event.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 font-normal"
            >
              <option value="">— bez powiązania —</option>
              {matchOptions.map((match) => (
                <option key={match._id} value={match._id}>
                  {match.homeTeam} — {match.awayTeam} ({formatDate(match.date)})
                </option>
              ))}
            </select>
          </label>
          {previewUrl ? (
            <div className="aspect-video max-w-xl overflow-hidden rounded-md">
              <iframe
                src={previewUrl}
                title="Podgląd transmisji"
                className="h-full w-full"
                allowFullScreen
              />
            </div>
          ) : youtubeUrl ? (
            <p className="text-sm font-bold text-red-300">
              Nie rozpoznano identyfikatora wideo w tym linku
            </p>
          ) : null}
          <div>
            <Button onClick={handleCreate} disabled={!title || !previewUrl}>
              Dodaj transmisję
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-black text-navy">Transmisje</h2>
        <div className="mt-4 grid gap-3">
          {(streams ?? []).map((stream) => (
            <article
              key={stream._id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-black text-navy">{stream.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {statusLabels[stream.status]}
                    {stream.startsAt
                      ? ` · start ${formatDate(stream.startsAt)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stream.status !== "live" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        run(
                          () => startStream({ id: stream._id }),
                          "Transmisja włączona — sekcja live jest na stronie głównej",
                        )
                      }
                    >
                      Rozpocznij
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        run(
                          () => endStream({ id: stream._id }),
                          "Transmisja zakończona",
                        )
                      }
                    >
                      Zakończ
                    </Button>
                  )}
                  {stream.matchId && stream.status === "ended" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        run(
                          () =>
                            saveToMatch({
                              id: stream._id,
                              matchId: stream.matchId!,
                            }),
                          "Link zapisany przy meczu jako archiwum",
                        )
                      }
                    >
                      Zapisz przy meczu
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Usunąć tę transmisję? Tej operacji nie można cofnąć.",
                        )
                      ) {
                        return;
                      }
                      run(
                        () => removeStream({ id: stream._id }),
                        "Transmisja usunięta",
                      );
                    }}
                  >
                    Usuń
                  </Button>
                </div>
              </div>
            </article>
          ))}
          {streams && streams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Brak transmisji — dodaj pierwszą powyżej.
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}
