import UserMenu from "@/components/user-menu";

export default function Header() {
  return (
    <header className="absolute top-0 right-0 z-50 flex h-14 items-center justify-end px-4">
      <UserMenu />
    </header>
  );
}
