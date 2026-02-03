import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/integrations")({
  component: IntegrationsLayout,
});

function IntegrationsLayout() {
  return <Outlet />;
}
