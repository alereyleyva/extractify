import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AttributeBuilder } from "@/components/AttributeBuilder";
import { VersionEditorSkeleton } from "@/components/skeletons/models-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/error-handling";
import type { ModelDetail, ModelVersion } from "@/lib/models-types";
import {
  useModelQuery,
  useSetActiveModelVersionMutation,
  useUpdateModelVersionMutation,
} from "@/lib/query-hooks";
import { areAttributesValid, validateAttributes } from "@/lib/validation";

export const Route = createFileRoute(
  "/_authed/models/$modelId/versions/$versionId",
)({
  component: VersionDetailPage,
});

function VersionDetailPage() {
  const { modelId, versionId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useModelQuery(modelId);
  const model = data as ModelDetail | undefined;
  const updateVersionMutation = useUpdateModelVersionMutation();
  const setActiveMutation = useSetActiveModelVersionMutation();
  const [attributes, setAttributes] = useState<ModelVersion["attributes"]>([]);
  const [changelog, setChangelog] = useState("");

  const version = useMemo(() => {
    if (!model) {
      return null;
    }
    return model.versions.find((item) => item.id === versionId) || null;
  }, [model, versionId]);

  useEffect(() => {
    if (!model) {
      return;
    }
    const currentVersion =
      model.versions.find((item) => item.id === versionId) || null;
    setAttributes(currentVersion?.attributes || []);
    setChangelog(currentVersion?.changelog || "");
  }, [model, versionId]);

  const handleSave = async () => {
    if (!version) {
      return;
    }
    const validAttributes = validateAttributes(attributes);
    if (!areAttributesValid(validAttributes)) {
      toast.error("Please define at least one valid attribute");
      return;
    }
    try {
      await updateVersionMutation.mutateAsync({
        versionId: version.id,
        attributes: validAttributes,
        changelog: changelog.trim() || null,
        modelId,
      });
      toast.success("Version updated");
      await navigate({ to: "/models/$modelId", params: { modelId } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSetActive = async () => {
    if (!version) {
      return;
    }
    try {
      await setActiveMutation.mutateAsync({ versionId: version.id, modelId });
      toast.success("Active version updated");
      await navigate({ to: "/models/$modelId", params: { modelId } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isLoading) {
    return <VersionEditorSkeleton />;
  }

  if (isError || !model) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-16">
        <div className="container mx-auto max-w-5xl px-6">
          <Card className="border-0 bg-card/40 shadow-sm ring-1 ring-border/40">
            <CardContent className="py-12 text-center">
              <p className="font-medium">Unable to load model</p>
              <p className="mt-2 text-muted-foreground text-sm">
                {error instanceof Error ? error.message : "Please try again."}
              </p>
              <Button asChild className="mt-6">
                <Link to="/models">Back to models</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!model || !version) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto max-w-5xl px-6">
          <Card className="border-0 bg-card/40 shadow-sm ring-1 ring-border/40">
            <CardContent className="py-16 text-center">
              <p className="font-medium">Version not found</p>
              <Button asChild className="mt-4">
                <Link to="/models/$modelId" params={{ modelId }}>
                  Back to model
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Button asChild size="sm" variant="ghost">
            <Link to="/models/$modelId" params={{ modelId }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to model
            </Link>
          </Button>
          {!version.isActive && (
            <Button variant="ghost" onClick={handleSetActive}>
              <Check className="mr-2 h-4 w-4" />
              Set active
            </Button>
          )}
        </div>

        <Card className="border-0 bg-card/40 shadow-sm ring-1 ring-border/40">
          <CardHeader className="border-border/40 border-b">
            <CardTitle className="text-2xl">
              Edit v{version.versionNumber}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{model.name}</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <Textarea
              placeholder="Changelog"
              value={changelog}
              onChange={(event) => setChangelog(event.target.value)}
              rows={2}
            />
            <AttributeBuilder
              attributes={attributes}
              onAttributesChange={setAttributes}
            />
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={updateVersionMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateVersionMutation.isPending ? "Saving..." : "Save version"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
