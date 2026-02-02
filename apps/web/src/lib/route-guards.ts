import { redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/functions/get-current-user";

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw redirect({
      to: "/",
    });
  }

  return user;
}
