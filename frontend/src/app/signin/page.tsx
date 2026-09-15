// app/(portal)/signin/page.tsx
import { headers } from "next/headers";
import { SigninForm } from "./signinForm";

export default async function SigninPage() {
  const headersList = await headers();
  const currentSubdomain = headersList.get("x-subdomain") || "portal";

  return <SigninForm currentSubdomain={currentSubdomain} />;
}