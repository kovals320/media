import { SectionPage } from "@/components/SectionPage";

export const metadata = { title: "תמונות – המדיה של המשפחה" };

export default function PhotosPage() {
  return <SectionPage title="תמונות" empty="עוד אין כאן תמונות. בקרוב אפשר יהיה להעלות." accent="sun" />;
}
