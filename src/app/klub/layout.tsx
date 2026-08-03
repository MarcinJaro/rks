import { ClubSubnav } from "@/components/layout/ClubSubnav";

export default function ClubLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClubSubnav />
      {children}
    </>
  );
}
