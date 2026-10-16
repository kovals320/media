import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { signOut } from "@/app/actions";

export const metadata = { title: "אין גישה – המדיה של המשפחה" };

export default async function NoAccessPage() {
  const { user, member } = await getSession();
  if (!user) redirect("/login");
  if (member) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <h1 className="font-display text-4xl leading-tight">עוד לא ברשימת המשפחה</h1>
      <p className="mt-3 text-lg text-muted">
        החשבון <span dir="ltr" className="font-semibold text-ink">{user.email}</span> נכנס בהצלחה, אבל
        עוד לא נוסף לאפליקציה. בקשו ממנהל האפליקציה להוסיף את האימייל הזה, ואז היכנסו שוב.
      </p>
      <form action={signOut} className="mt-8">
        <button className="rounded-2xl bg-ink px-5 py-3.5 text-lg font-semibold text-white">יציאה</button>
      </form>
    </main>
  );
}
