"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/convexError";
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
  const [busy, setBusy] = useState(false);
  // Wybór meczu dla transmisji utworzonej bez powiązania - bez tego nigdy
  // nie dałoby się jej zapisać jako archiwum przy meczu.
  const [linkTargets, setLinkTargets] = useState<Record<string, string>>({});

  const previewUrl = youtubeEmbedUrl(youtubeUrl);

  async function handleCreate() {
    if (busy) return;
    setError(null);
    setMessage(null);
    if (!previewUrl) {
      setError("Ten link nie wygląda na poprawny adres YouTube");
      return;
    }
    setBusy(true);
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
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function run(action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await action();
      setMessage(success);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Mecz może mieć już inny link - backend odmawia bez overwrite, my pytamy
  // admina i ponawiamy ze świadomym potwierdzeniem.
  async function handleSaveToMatch(
    streamId: Id<"liveStreams">,
    matchId: Id<"matches">,
  ) {
    if (busy) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await saveToMatch({ id: streamId, matchId });
      setMessage("Link zapisany przy meczu jako archiwum");
    } catch (err) {
      if (err instanceof ConvexError) {
        const question = errorMessage(err);
        if (window.confirm(question)) {
          try {
            await saveToMatch({ id: streamId, matchId, overwrite: true });
            setMessage("Link zapisany przy meczu (nadpisany)");
          } catch (retryErr) {
            setError(errorMessage(retryErr));
          }
        }
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
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
              {busy ? "Zapisywanie…" : "Dodaj transmisję"}
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
                      disabled={busy}
                      onClick={() =>
                        handleSaveToMatch(stream._id, stream.matchId!)
                      }
                    >
                      Zapisz przy meczu
                    </Button>
                  ) : null}
                  {!stream.matchId && stream.status === "ended" ? (
                    <span className="flex items-center gap-2">
                      <select
                        value={linkTargets[stream._id] ?? ""}
                        onChange={(event) =>
                          setLinkTargets((prev) => ({
                            ...prev,
                            [stream._id]: event.target.value,
                          }))
                        }
                        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal"
                      >
                        <option value="">— wybierz mecz —</option>
                        {matchOptions.map((match) => (
                          <option key={match._id} value={match._id}>
                            {match.homeTeam} — {match.awayTeam} (
                            {formatDate(match.date)})
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy || !linkTargets[stream._id]}
                        onClick={() =>
                          handleSaveToMatch(
                            stream._id,
                            linkTargets[stream._id] as Id<"matches">,
                          )
                        }
                      >
                        Zapisz przy meczu
                      </Button>
                    </span>
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
