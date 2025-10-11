import { NextResponse } from "next/server";
import { createSupabaseServerAdmin } from "@/lib/supabaseAdminServer";

export async function POST(req) {
  try {
    const body = await req.json();
    const { id } = body || {};
    if (!id)
      return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });

    // 1) Gunakan Supabase Admin (karena hanya super admin UI yang bisa trigger)
    const supabase = createSupabaseServerAdmin();

    // 2) Cek target user
    const { data: targetRow, error: fetchErr } = await supabase
      .from("admins")
      .select("role")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!targetRow)
      return NextResponse.json(
        { error: "Admin tidak ditemukan" },
        { status: 404 }
      );
    if (targetRow.role === "super")
      return NextResponse.json(
        { error: "Admin super tidak boleh dihapus." },
        { status: 403 }
      );

    // 3) Hapus dari auth.users & tabel admins
    const { error: delAuthErr } = await supabase.auth.admin.deleteUser(id);
    if (delAuthErr) throw delAuthErr;

    const { error: delRowErr } = await supabase
      .from("admins")
      .delete()
      .eq("id", id);
    if (delRowErr) throw delRowErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
