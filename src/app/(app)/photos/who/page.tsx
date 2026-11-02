import { BackLink } from "@/components/BackLink";
import { getPeopleNames, getUnnamedPeople } from "@/lib/immich";
import { UnnamedGrid } from "./UnnamedGrid";

export const metadata = { title: "מי זה? – המדיה של המשפחה" };
export const revalidate = 600;

export default async function WhoPage() {
  let ids: string[] | null = null;
  let names: string[] = [];
  try {
    const [unnamed, known] = await Promise.all([getUnnamedPeople(), getPeopleNames().catch(() => new Map<string, string>())]);
    ids = unnamed;
    names = [...new Set(known.values())].sort((a, b) => a.localeCompare(b, "he"));
  } catch {
    ids = null;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <BackLink href="/photos" label="לתמונות" />
      <div className="flex flex-wrap items-baseline gap-x-4">
        <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl">מי זה?</h1>
        {ids && ids.length > 0 && <span className="text-lg text-muted">{ids.length.toLocaleString("he-IL")} פנים בלי שם</span>}
      </div>
      <p className="mt-2 max-w-2xl text-lg text-muted">
        אלה פנים שהמערכת זיהתה אבל עוד לא יודעת של מי הן. מכירים? לחצו והציעו שם. השם יתווסף לכל התמונות של אותן פנים אחרי
        אישור. הפנים שמופיעות בהכי הרבה תמונות מופיעות ראשונות.
      </p>

      {ids === null ? (
        <p className="mt-8 rounded-[2rem] border-2 border-dashed border-sun-deep/50 p-10 text-center text-lg text-muted">
          שרת התמונות לא זמין כרגע. נסו שוב בעוד כמה דקות.
        </p>
      ) : ids.length === 0 ? (
        <p className="mt-8 rounded-[2rem] bg-lake/10 p-10 text-center text-lg text-lake-deep">לכל הפנים כבר יש שם. תודה!</p>
      ) : (
        <UnnamedGrid ids={ids} names={names} />
      )}
    </main>
  );
}
