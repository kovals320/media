import { requireMember } from "@/lib/auth";

// Everything inside (app) is for signed-in family members only.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireMember();
  return children;
}
