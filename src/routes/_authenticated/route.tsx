import { createFileRoute, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  getStoredLocalSession,
  saveLocalSession,
  createLocalSession,
} from "@/integrations/supabase/auth-local";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    let session = getStoredLocalSession();
    if (!session) {
      session = createLocalSession("operator@containment.dev", {
        provider: "anonymous",
        name: "Containment Operator",
      });
      saveLocalSession(session);
      try {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      } catch {
        // ignore
      }
    }
    const { data } = await supabase.auth.getUser();
    return { user: data?.user || session.user };
  },
  component: () => <Outlet />,
});
