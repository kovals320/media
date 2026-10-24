import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Lets cached pages find out, in the browser, whether the visitor is the admin.
export async function GET() {
  const { isAdmin } = await getViewer();
  return NextResponse.json({ isAdmin }, { headers: { "Cache-Control": "private, no-store" } });
}
