import { PlayerSubnav } from "@/components/layout/PlayerSubnav";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PlayerSubnav />
      {children}
    </>
  );
}
