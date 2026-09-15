// app/(portal)/signup/page.tsx
import { headers } from "next/headers";
import { SignupForm } from "./signupForm";

export default async function SignupPage() {
  const headersList = await headers();
  const currentSubdomain = headersList.get("x-subdomain") || "portal";

  return <SignupForm currentSubdomain={currentSubdomain} />;
}