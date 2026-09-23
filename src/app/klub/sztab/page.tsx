import { PageHeader } from "@/components/shared/PageHeader";
import { StaffGrid } from "@/components/club/StaffGrid";

export default function StaffPage() {
  return (
    <>
      <PageHeader
        title="Sztab szkoleniowy"
        description="Trenerzy prowadzący drużyny RKS Okęcie Warszawa oraz bezpośredni kontakt do grup szkoleniowych."
      />
      <StaffGrid />
    </>
  );
}
