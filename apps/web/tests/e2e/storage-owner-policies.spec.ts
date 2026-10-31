import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { admin, createTestUser, deleteTestUser } from "./_setup/seed";

// SEC-014 (058) a Storage API-n át — amit az SQL-teszt nem tud lefedni:
// idegen fájl törlése API-ból, aláírt feltöltési token átvitele más útvonalra,
// névtelen listázás, és hogy a publikus URL-es kiszolgálás a szűkített SELECT mellett is működik.
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHfoAAAAASUVORK5CYII=", "base64");

test("storage: own-folder writes only, no cross-user delete/list, token bound to its path, public URL still served", async ({ request }) => {
  test.setTimeout(60_000);
  const a = await createTestUser("sec014-a");
  const b = await createTestUser("sec014-b");
  const bPath = `${b.id}/b-cover.png`;
  try {
    // B fájlja (szolgáltatói kulccsal, mintha B töltötte volna fel)
    const seeded = await admin.storage.from("trip-covers").upload(bPath, PNG_1PX, { contentType: "image/png" });
    expect(seeded.error).toBeNull();

    const asA = createClient(URL_, ANON, { auth: { persistSession: false } });
    const signIn = await asA.auth.signInWithPassword({ email: a.email, password: a.password });
    expect(signIn.error).toBeNull();

    // A nem törölheti B fájlját
    await asA.storage.from("trip-covers").remove([bPath]);
    const afterDelete = await admin.storage.from("trip-covers").list(b.id);
    expect((afterDelete.data ?? []).map((o) => o.name)).toEqual(["b-cover.png"]);

    // A nem listázhatja B mappáját, és nem írhat bele
    const listB = await asA.storage.from("trip-covers").list(b.id);
    expect(listB.data ?? []).toEqual([]);
    const intoB = await asA.storage.from("trip-covers").upload(`${b.id}/evil.png`, PNG_1PX, { contentType: "image/png" });
    expect(intoB.error).not.toBeNull();

    // Az A-nak kiadott aláírt token nem vihető át B útvonalára
    const ticket = await asA.storage.from("trip-covers").createSignedUploadUrl(`${a.id}/own.png`);
    expect(ticket.error).toBeNull();
    const hijack = await asA.storage.from("trip-covers").uploadToSignedUrl(`${b.id}/hijack.png`, ticket.data!.token, PNG_1PX, { contentType: "image/png" });
    expect(hijack.error).not.toBeNull();
    const own = await asA.storage.from("trip-covers").uploadToSignedUrl(ticket.data!.path, ticket.data!.token, PNG_1PX, { contentType: "image/png" });
    expect(own.error).toBeNull();
    const bAfter = await admin.storage.from("trip-covers").list(b.id);
    expect((bAfter.data ?? []).map((o) => o.name)).toEqual(["b-cover.png"]);

    // Névtelen látogató semmit nem listáz
    const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
    expect((await anon.storage.from("trip-covers").list(b.id)).data ?? []).toEqual([]);
    expect((await anon.storage.from("avatars").list("")).data ?? []).toEqual([]);

    // A publikus URL továbbra is kiszolgál
    const publicUrl = admin.storage.from("trip-covers").getPublicUrl(bPath).data.publicUrl;
    const res = await request.get(publicUrl);
    expect(res.status()).toBe(200);
  } finally {
    for (const [user, bucket] of [[a, "trip-covers"], [b, "trip-covers"]] as const) {
      const { data } = await admin.storage.from(bucket).list(user.id);
      if (data?.length) await admin.storage.from(bucket).remove(data.map((o) => `${user.id}/${o.name}`));
    }
    await deleteTestUser(a.id);
    await deleteTestUser(b.id);
  }
});
