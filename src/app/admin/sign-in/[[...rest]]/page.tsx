import { SignIn } from "@clerk/nextjs";

export default function AdminSignInPage() {
  return (
    <div className="container-page flex justify-center py-16">
      <SignIn fallbackRedirectUrl="/admin" />
    </div>
  );
}
