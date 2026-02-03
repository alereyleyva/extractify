import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/models")({
  component: ModelsLayout,
});

function ModelsLayout() {
  return <Outlet />;
}
