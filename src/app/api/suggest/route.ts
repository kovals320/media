import { getFaces, isUuid } from "@/lib/faces";
import { getImmichPerson } from "@/lib/immich";
import { createPublicClient } from "@/lib/supabase/public";

// A visitor suggests a name for a face. It is only saved as a suggestion;
// nothing changes in Immich until the admin approves it.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const { assetId, faceId, personId } = body;
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const by = typeof body.by === "string" ? body.by.trim().slice(0, 40) : "";
  if (name.length < 1 || name.length > 60) return Response.json({ error: "name" }, { status: 400 });

  // A name for a whole face group (from the "who is this?" page).
  if (!faceId && isUuid(personId)) {
    const person = await getImmichPerson(personId);
    if (!person) return Response.json({ error: "not found" }, { status: 404 });
    const { error } = await createPublicClient()
      .from("media_face_suggestions")
      .insert({ person_id: personId, current_name: person.name?.trim() || null, name, suggested_by: by || null });
    if (error && error.code !== "23505") return Response.json({ error: "save" }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (!isUuid(assetId) || !isUuid(faceId)) return Response.json({ error: "bad request" }, { status: 400 });

  // Check the face really is in that photo, and keep where it is for the admin page.
  let face;
  try {
    face = (await getFaces(assetId)).find((f) => f.id === faceId);
  } catch {
    return Response.json({ error: "unavailable" }, { status: 502 });
  }
  if (!face) return Response.json({ error: "not found" }, { status: 404 });

  const { error } = await createPublicClient()
    .from("media_face_suggestions")
    .insert({
      asset_id: assetId,
      face_id: faceId,
      person_id: face.personId,
      current_name: face.name,
      name,
      suggested_by: by || null,
      box: face.box,
      aspect: face.aspect,
    });
  // Same suggestion already waiting: fine.
  if (error && error.code !== "23505") return Response.json({ error: "save" }, { status: 500 });
  return Response.json({ ok: true });
}
