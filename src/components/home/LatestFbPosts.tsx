import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fallbackPosts } from "@/data/site";
import { FeedItem } from "@/components/facebook/FeedItem";
import { Stagger, StaggerItem } from "@/components/shared/Motion";

export function LatestFbPosts() {
  return (
    <section className="bg-[#090e1b] py-20">
      <div className="container-page">
        <div className="mb-12 flex items-center gap-5">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[#12326a] text-accent">
            <span className="text-3xl font-black">f</span>
          </span>
          <h2 className="text-4xl font-black tracking-normal text-white">
            Z życia klubu
          </h2>
        </div>

        <Stagger className="grid gap-8 md:grid-cols-3">
          {fallbackPosts.map((post) => (
            <StaggerItem key={post.title}>
              <FeedItem {...post} />
            </StaggerItem>
          ))}
        </Stagger>

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
