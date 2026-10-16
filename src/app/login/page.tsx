import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "כניסה – המדיה של המשפחה" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user } = await getViewer();
  if (user) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div aria-hidden className="mb-8 flex gap-2">
        <span className="h-10 w-10 -rotate-6 rounded-xl bg-sun" />
        <span className="h-10 w-10 rotate-3 rounded-xl bg-lake" />
      </div>
      <h1 className="font-display text-[2.6rem] leading-[1.05]">המדיה של המשפחה</h1>
      <p className="mt-2 text-lg text-muted">כניסת מנהל, להוספת תמונות וסרטונים.</p>
      <LoginForm linkError={error === "link"} />
    </main>
  );
}
