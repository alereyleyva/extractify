import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/models/$modelId")({
  component: ModelLayout,
});

function ModelLayout() {
  return <Outlet />;
}
