import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/functions/get-current-user";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
  component: LandingPage,
  beforeLoad: async () => {
    const user = await getCurrentUser();
    return { user };
  },
});

function LandingPage() {
  const { user } = Route.useRouteContext();

  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8">
            <div className="mb-6 flex items-center justify-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Sparkles className="h-8 w-8" />
              </div>
              <h1 className="font-bold text-4xl tracking-tight">Extractify</h1>
            </div>
          </div>

          <h2 className="mb-6 font-bold text-5xl tracking-tight md:text-6xl">
            <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Extract Data from PDFs
            </span>
            <br />
            <span className="text-foreground">with AI Precision</span>
          </h2>

          <p className="mx-auto mb-12 max-w-2xl text-muted-foreground text-xl">
            Upload your PDF, define what to extract, and get structured JSON
            output in seconds. No coding required.
          </p>

          {user ? (
            <Button asChild size="lg" className="h-12 min-w-48 text-lg">
              <Link to="/extraction">
                Start extracting
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-12 min-w-48 text-lg"
              onClick={handleSignIn}
            >
              <GoogleIcon className="mr-2 h-6 w-6" />
              Start with Google
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
