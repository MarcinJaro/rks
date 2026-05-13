import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { FacebookFeedGrid } from "@/components/facebook/FacebookFeedGrid";

export function LatestFbPosts() {
  return (
    <section className="bg-[var(--section-alt)] py-20">
      <div className="container-page">
        <div className="mb-12 flex items-center gap-5">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--icon-blue)] text-accent">
            <Newspaper size={28} />
          </span>
          <h2 className="text-4xl font-black tracking-normal text-white">
            Z życia klubu
          </h2>
        </div>

        <FacebookFeedGrid limit={3} source="all" />

        <div className="mt-10">
          <Link
            href="/aktualnosci"
            className="inline-flex items-center gap-2 text-sm font-black text-accent hover:underline"
          >
            Wszystkie aktualności <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
