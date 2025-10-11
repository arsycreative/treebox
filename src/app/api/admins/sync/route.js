import { NextResponse } from "next/server";
import { createSupabaseServerAdmin } from "@/lib/supabaseAdminServer";

/**
 * POST /api/admins/create
 * body: { email, password, display_name? }
 * hasil: membuat user Auth (email_confirmed) + sync ke public.admins (role=crew, aktif)
 */
export async function POST(req) {
  try {
    const { email, password, display_name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "email & password wajib diisi" },
        { status: 400 }
      );
    }

    const admin = createSupabaseServerAdmin();

    // 1) Buat user di Auth + password + langsung confirmed
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name, role: "crew" },
      app_metadata: { role: "crew" },
    });
    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 400 });
    }

    const userId = created?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Gagal mendapatkan user id dari Supabase." },
        { status: 500 }
      );
    }

    // 2) Sync ke public.admins (role crew, aktif)
    const payload = {
      id: userId, // penting: PK = auth.users.id
      email,
      display_name: display_name || null,
      role: "crew",
      is_active: true,
    };

    const { error: upErr } = await admin
      .from("admins")
      .upsert(payload, { onConflict: "id" });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      id: userId,
      email,
      role: "crew",
      message: "Crew berhasil dibuat dan diaktifkan.",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
