"use client";

import { Download, FileText } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Stagger, StaggerItem } from "@/components/shared/Motion";
import { Button } from "@/components/ui/button";
import { legacyDocuments } from "@/data/legacy";

type DocumentItem = { title: string; href: string; category: string };

const fallback: DocumentItem[] = legacyDocuments.map(([title, href]) => ({
  title,
  href,
  category: "Dokument PDF",
}));

export function DocumentsList() {
  const managed = useQuery(api.documents.list);
  const documents: DocumentItem[] =
    managed && managed.length > 0
      ? managed.flatMap((document) =>
          document.fileUrl
            ? [
                {
                  title: document.title,
                  href: document.fileUrl,
                  category: document.category,
                },
              ]
            : [],
        )
      : fallback;

  return (
    <Stagger className="grid gap-4">
      {documents.map((document) => (
        <StaggerItem key={document.href}>
          <article className="flex flex-col gap-5 rounded-[18px] border border-white/8 bg-muted p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                <FileText size={22} />
              </span>
              <div>
                <h2 className="text-lg font-black text-white">
                  {document.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {document.category}
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <a href={document.href} target="_blank" rel="noreferrer">
                <Download size={18} />
                Pobierz
              </a>
            </Button>
          </article>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
