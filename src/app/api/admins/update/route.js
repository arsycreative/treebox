import { NextResponse } from "next/server";
import { createSupabaseServerAdmin } from "@/lib/supabaseAdminServer";

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, display_name, role, is_active } = body || {};

    if (!id)
      return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });

    const supabase = createSupabaseServerAdmin();

    // 1️⃣ Cek target admin
    const { data: target, error: targetErr } = await supabase
      .from("admins")
      .select("role")
      .eq("id", id)
      .maybeSingle();

    if (targetErr) throw targetErr;
    if (!target)
      return NextResponse.json(
        { error: "Admin tidak ditemukan." },
        { status: 404 }
      );

    // Tidak boleh ubah super
    if (target.role === "super") {
      return NextResponse.json(
        { error: "Admin super tidak boleh diubah." },
        { status: 403 }
      );
    }

    // 2️⃣ Payload yang aman
    const safePayload = {
      ...(display_name !== undefined
        ? { display_name: display_name.trim() }
        : {}),
      ...(is_active !== undefined ? { is_active: !!is_active } : {}),
    };

    // Role hanya boleh 'crew'
    if (role !== undefined) {
      if (role !== "crew") {
        return NextResponse.json(
          { error: "Role hanya boleh 'crew'." },
          { status: 400 }
        );
      }
      safePayload.role = "crew";
    }

    // 3️⃣ Update di tabel admins
    const { error: upErr } = await supabase
      .from("admins")
      .update(safePayload)
      .eq("id", id);

    if (upErr) throw upErr;

    // 4️⃣ Sinkron metadata di auth (optional tapi bagus untuk konsistensi)
    if (display_name !== undefined || role !== undefined) {
      await supabase.auth.admin
        .updateUserById(id, {
          user_metadata: {
            ...(display_name !== undefined ? { display_name } : {}),
            ...(role !== undefined ? { role: "crew" } : {}),
          },
          app_metadata: role !== undefined ? { role: "crew" } : undefined,
        })
        .catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Update admin error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
