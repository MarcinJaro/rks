import { Hero } from "@/components/home/Hero";
import { LatestFbPosts } from "@/components/home/LatestFbPosts";
import { MatchCenter } from "@/components/home/MatchCenter";
import { SponsorBar } from "@/components/home/SponsorBar";
import { TeamsGrid } from "@/components/home/TeamsGrid";

export default function Home() {
  return (
    <>
      <Hero />
      <MatchCenter />
      <TeamsGrid />
      <LatestFbPosts />
      <SponsorBar />
    </>
  );
}
