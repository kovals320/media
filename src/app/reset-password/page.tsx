import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ResetForm } from "./ResetForm";

export const metadata = { title: "סיסמה חדשה – המדיה של המשפחה" };

export default async function ResetPasswordPage() {
  const { user } = await getSession();
  if (!user) redirect("/login");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <h1 className="font-display text-4xl">בחירת סיסמה חדשה</h1>
      <ResetForm />
    </main>
  );
}
