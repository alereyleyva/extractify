import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/models")({
  component: ModelsLayout,
});

function ModelsLayout() {
  return <Outlet />;
}
