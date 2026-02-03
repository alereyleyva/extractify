import { Link } from "@tanstack/react-router";
import UserMenu from "@/components/user-menu";

type HeaderUser = {
  name?: string | null;
  image?: string | null;
};

type HeaderProps = {
  user: HeaderUser | null;
};

export default function Header({ user }: HeaderProps) {
  if (!user) {
    return null;
  }

  return (
    <header className="absolute top-0 right-0 left-0 z-50 flex h-14 items-center justify-between px-6">
      <div className="flex items-center gap-3 text-sm">
        <Link
          to="/extraction"
          className="rounded-full border border-border/60 px-3 py-1 text-foreground/80 text-xs transition hover:border-primary/40 hover:text-foreground"
        >
          Extraction
        </Link>
        <Link
          to="/models"
          className="rounded-full border border-border/60 px-3 py-1 text-foreground/80 text-xs transition hover:border-primary/40 hover:text-foreground"
        >
          Models
        </Link>
        <Link
          to="/history"
          className="rounded-full border border-border/60 px-3 py-1 text-foreground/80 text-xs transition hover:border-primary/40 hover:text-foreground"
        >
          History
        </Link>
        <Link
          to="/integrations"
          className="rounded-full border border-border/60 px-3 py-1 text-foreground/80 text-xs transition hover:border-primary/40 hover:text-foreground"
        >
          Integrations
        </Link>
      </div>
      <UserMenu user={user} />
    </header>
  );
}
