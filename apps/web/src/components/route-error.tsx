import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type RouteErrorProps = {
  error: Error;
  title?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function RouteError({
  error,
  title = "Something went wrong",
  actionHref,
  actionLabel = "Go back",
}: RouteErrorProps) {
  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto max-w-3xl px-6">
        <Card className="border">
          <CardContent className="py-12 text-center">
            <p className="font-semibold text-lg">{title}</p>
            <p className="mt-2 text-muted-foreground text-sm">
              {error.message || "Please try again."}
            </p>
            {actionHref && (
              <Button asChild className="mt-6">
                <Link to={actionHref}>{actionLabel}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
