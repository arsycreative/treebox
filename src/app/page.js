"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function RootRedirect() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    let mounted = true;

    const resolveRoute = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    };

    resolveRoute();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  return (
    <div className="flex items-center justify-center grow">
      <div className="rounded-3xl border border-[color:var(--color-border)] bg-white/70 backdrop-blur-xl px-8 py-10 shadow-2xl max-w-sm text-center">
        <p className="text-sm text-[color:var(--color-muted)]">
          Mengarahkan Anda ke panel Treebox…
        </p>
      </div>
    </div>
  );
}
