import { auth } from "@extractify/auth";
import { getRequestHeaders } from "@tanstack/react-start/server";

export async function requireUserId() {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session.user.id;
}
