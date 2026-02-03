import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/history")({
  component: HistoryLayout,
});

function HistoryLayout() {
  return <Outlet />;
}
