import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireUser } from "@/lib/route-guards";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const user = await requireUser();
    return { user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return <Outlet />;
}
