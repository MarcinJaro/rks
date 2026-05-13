import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { LatestFbPosts } from "@/components/home/LatestFbPosts";
import { MatchCenter } from "@/components/home/MatchCenter";
import { SponsorBar } from "@/components/home/SponsorBar";
import { TeamsGrid } from "@/components/home/TeamsGrid";
import { BackgroundPreviewShell } from "./BackgroundPreviewShell";

export const metadata: Metadata = {
  title: "Podgląd tła",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BackgroundPreviewPage() {
  return (
    <BackgroundPreviewShell>
      <Hero />
      <MatchCenter />
      <TeamsGrid />
      <LatestFbPosts />
      <SponsorBar />
    </BackgroundPreviewShell>
  );
}
