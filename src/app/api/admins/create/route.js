import { NextResponse } from "next/server";
import { createSupabaseServerAdmin } from "@/lib/supabaseAdminServer";

export async function POST(req) {
  try {
    const body = await req.json();
    const email = (body?.email || "").trim().toLowerCase();
    const password = body?.password || "";
    const display_name = (body?.display_name || "").trim();
    const role = "crew"; // crew only (super admin tidak bisa dibuat lewat form)

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    if (!display_name) {
      return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    }

    // Gunakan Supabase Service Role Client
    const supabase = createSupabaseServerAdmin();

    // 1) Cek apakah email sudah ada di tabel admins
    const { data: existing } = await supabase
      .from("admins")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar sebagai admin." },
        { status: 400 }
      );
    }

    // 2) Buat user baru di Supabase Auth
    const { data: created, error: createErr } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name, role },
        app_metadata: { role },
      });

    if (createErr) throw createErr;

    const userId = created?.user?.id;
    if (!userId) throw new Error("Gagal membuat akun Supabase Auth.");

    // 3) Simpan juga di tabel public.admins
    const { error: upErr } = await supabase.from("admins").upsert(
      {
        id: userId,
        email,
        display_name,
        role,
        is_active: true,
      },
      { onConflict: "id" } // pastikan tidak duplikat
    );

    if (upErr) throw upErr;

    return NextResponse.json({
      ok: true,
      id: userId,
      email,
      role,
      display_name,
    });
  } catch (e) {
    console.error("Error create admin:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
