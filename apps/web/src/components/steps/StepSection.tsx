import type { ReactNode } from "react";

export function StepSection({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`transition-all duration-700 ease-in-out ${
        active
          ? "visible translate-y-0 scale-100 opacity-100"
          : "pointer-events-none invisible absolute inset-0 translate-y-8 scale-95 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
