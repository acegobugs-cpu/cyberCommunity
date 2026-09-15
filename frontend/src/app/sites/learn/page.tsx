import { AccountSwitcher } from "@/components/account-switcher";

export const metadata = { title: "Learn — Cyber Club Portal" };
export const dynamic = "force-dynamic";

import { getSessionToken } from "@/lib/server/session";
import { redirect } from "next/navigation";


export default async function LearnCataloguePage() {  

  const token = await getSessionToken();
  if(token) {
    redirect("/dash");
  }
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 w-full">
      <AccountSwitcher service="learn" />
    </main>
  );
}