import { NextResponse } from "next/server";
import { createSupabaseServerAdmin } from "@/lib/supabaseAdminServer";

export async function POST(req) {
  try {
    const { userId, email, display_name } = await req.json();

    if (!userId && !email) {
      return NextResponse.json(
        { error: "Wajib kirim salah satu: userId atau email" },
        { status: 400 }
      );
    }

    const admin = createSupabaseServerAdmin();

    // 1) Temukan user di Auth
    let targetUser = null;

    if (userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) throw error;
      targetUser = data?.user ?? null;
    } else if (email) {
      // fallback by email: listUsers lalu cari yang cocok
      // (JS SDK v2 belum ada getUserByEmail langsung)
      let page = 1;
      const perPage = 1000;
      while (!targetUser) {
        const { data, error } = await admin.auth.admin.listUsers({
          page,
          perPage,
        });
        if (error) throw error;
        const found = data?.users?.find(
          (u) => (u.email || "").toLowerCase() === email.toLowerCase()
        );
        if (found) targetUser = found;
        if (!data?.users?.length || data.users.length < perPage) break;
        page += 1;
      }
      if (!targetUser) {
        return NextResponse.json(
          { error: `User dengan email ${email} tidak ditemukan di Auth` },
          { status: 404 }
        );
      }
    }

    const uid = targetUser.id;
    const finalEmail = targetUser.email || email;

    // 2) Update app_metadata & user_metadata di Auth → role: super
    {
      const { error } = await admin.auth.admin.updateUserById(uid, {
        app_metadata: { ...(targetUser.app_metadata || {}), role: "super" },
        user_metadata: {
          ...(targetUser.user_metadata || {}),
          role: "super",
          display_name: display_name || targetUser.user_metadata?.display_name,
        },
      });
      if (error) throw error;
    }

    // 3) Upsert ke public.admins
    {
      const payload = {
        id: uid,
        email: finalEmail,
        display_name: display_name || null,
        role: "super",
        is_active: true,
      };
      const { error } = await admin
        .from("admins")
        .upsert(payload, { onConflict: "id" });
      if (error) throw error;
    }

    return NextResponse.json({
      ok: true,
      id: uid,
      email: finalEmail,
      role: "super",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
