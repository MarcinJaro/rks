"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { FbSyncStatus } from "@/components/admin/FbSyncStatus";
import { errorMessage } from "@/lib/convexError";

type FbCategory = NonNullable<Doc<"fbPosts">["category"]>;

const categoryOptions: FbCategory[] = [
  "mecz",
  "trening",
  "turniej",
  "ogłoszenie",
  "wydarzenie",
];

const typeLabels: Record<Doc<"fbPosts">["postType"], string> = {
  text: "tekst",
  photo: "zdjęcie",
  album: "album",
  video: "wideo",
  link: "link",
  event: "wydarzenie",
};

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function AdminFacebookPostsPage() {
  const [includeHidden, setIncludeHidden] = useState(true);
  const posts = useQuery(api.facebook.queries.listForAdmin, {
    limit: 100,
    includeHidden,
  });
  const teams = useQuery(api.teams.list, {});
  const setHidden = useMutation(api.facebook.mutations.setHidden);
  const setPinned = useMutation(api.facebook.mutations.setPinned);
  const categorize = useMutation(api.facebook.mutations.categorize);

  const [error, setError] = useState<string | null>(null);

  async function guard(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <h1 className="text-3xl font-black text-navy">Posty z Facebooka</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Moderacja postów pobieranych automatycznie z klubowego profilu: możesz
        je ukrywać z widoku publicznego, przypinać oraz przypisywać do drużyn i
        kategorii.
      </p>

      <div className="mt-6">
        <FbSyncStatus />
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-500/15 px-4 py-2 text-sm font-bold text-red-300">
          {error}
        </p>
      ) : null}

      <label className="mt-6 flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={includeHidden}
          onChange={(event) => setIncludeHidden(event.target.checked)}
        />
        Pokazuj także ukryte posty
      </label>

      <div className="mt-4 grid gap-3">
        {posts === undefined ? (
          <p className="text-sm text-muted-foreground">Wczytywanie…</p>
        ) : null}
        {(posts ?? []).map((post) => (
          <article
            key={post._id}
            className={`rounded-lg border border-border bg-card p-4 ${
              post.isHidden ? "opacity-60" : ""
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase text-muted-foreground">
                  {typeLabels[post.postType]} · {formatDate(post.publishedAt)} ·{" "}
                  {post.reactionsCount} reakcji
                  {post.isPinned ? (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                      przypięty
                    </span>
                  ) : null}
                  {post.isHidden ? (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5">
                      ukryty
                    </span>
                  ) : null}
                </p>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground">
                  {post.content || "(post bez treści tekstowej)"}
                </p>
                <a
                  href={post.fbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs font-bold text-accent hover:underline"
                >
                  Otwórz na Facebooku
                </a>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      guard(() =>
                        setHidden({ id: post._id, isHidden: !post.isHidden }),
                      )
                    }
                  >
                    {post.isHidden ? "Pokaż" : "Ukryj"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      guard(() =>
                        setPinned({ id: post._id, isPinned: !post.isPinned }),
                      )
                    }
                  >
                    {post.isPinned ? "Odepnij" : "Przypnij"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <select
                    value={post.category ?? ""}
                    onChange={(event) =>
                      guard(() =>
                        categorize({
                          id: post._id,
                          category: (event.target.value ||
                            undefined) as FbCategory | undefined,
                          teamId: post.teamId,
                        }),
                      )
                    }
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal"
                  >
                    <option value="">— kategoria —</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <select
                    value={post.teamId ?? ""}
                    onChange={(event) =>
                      guard(() =>
                        categorize({
                          id: post._id,
                          category: post.category,
                          teamId: (event.target.value ||
                            undefined) as Id<"teams"> | undefined,
                        }),
                      )
                    }
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal"
                  >
                    <option value="">— drużyna —</option>
                    {(teams ?? []).map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </article>
        ))}
        {posts && posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Brak postów — uruchom synchronizację powyżej.
          </p>
        ) : null}
      </div>
    </>
  );
}
