// src/app/api/admins/invite/route.js
import { NextResponse } from "next/server";
import { createSupabaseServerAdmin } from "@/lib/supabaseAdminServer";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, display_name, role } = body || {};
    if (!email || !role || !["super", "crew"].includes(role)) {
      return NextResponse.json(
        { error: "email & role wajib diisi (super/crew)" },
        { status: 400 }
      );
    }

    const admin = createSupabaseServerAdmin();

    // kirim undangan via Supabase (akan mengirim email)
    const { data: inviteData, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: { display_name, role },
      });
    if (inviteError) throw inviteError;

    // sinkronkan row di public.admins (agar role sesuai)
    const userId = inviteData?.user?.id ?? null;
    const payload = {
      email,
      display_name: display_name || null,
      role,
      is_active: true,
    };

    if (userId) {
      const { error: upErr } = await admin
        .from("admins")
        .upsert({ id: userId, ...payload }, { onConflict: "id" });
      if (upErr) throw upErr;
    } else {
      // belum punya id (misal email belum terdaftar), upsert by email via RPC sederhana
      const { error: upErr2 } = await admin
        .from("admins")
        .upsert(payload, { onConflict: "email" });
      if (upErr2) throw upErr2;
    }

    return NextResponse.json({ ok: true, invited: email });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
