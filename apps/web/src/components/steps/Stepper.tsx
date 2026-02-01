import { CheckCircle2 } from "lucide-react";

type StepKey = "upload" | "attributes" | "extract" | "results";

export function Stepper({
  steps,
  current,
  onNavigate,
}: {
  steps: { key: StepKey; label: string; number: number }[];
  current: StepKey;
  onNavigate: (step: StepKey) => void;
}) {
  const getStatus = (key: StepKey) => {
    const stepIndex = steps.findIndex((step) => step.key === key);
    const currentIndex = steps.findIndex((step) => step.key === current);
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const status = getStatus(step.key);
        const isLast = index === steps.length - 1;
        return (
          <button
            key={step.key}
            type="button"
            onClick={() => status !== "pending" && onNavigate(step.key)}
            disabled={status === "pending"}
            className="flex cursor-pointer items-center disabled:cursor-default"
          >
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                  status === "active"
                    ? "scale-110 border-primary bg-primary text-primary-foreground"
                    : status === "completed"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 bg-background text-muted-foreground"
                }`}
              >
                {status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="font-semibold text-sm">{step.number}</span>
                )}
              </div>
              <span
                className={`mt-2 font-medium text-xs transition-all duration-300 ${
                  status === "active"
                    ? "text-foreground"
                    : status === "completed"
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`mx-2 h-0.5 w-12 transition-all duration-500 md:w-16 ${
                  status === "completed" ||
                  getStatus(steps[index + 1].key) === "active" ||
                  getStatus(steps[index + 1].key) === "completed"
                    ? "bg-primary"
                    : "bg-muted-foreground/30"
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
