import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AttributeBuilder } from "@/components/AttributeBuilder";
import { VersionEditorSkeleton } from "@/components/skeletons/models-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createModelVersion } from "@/functions/models";
import { getErrorMessage } from "@/lib/error-handling";
import type { ModelDetail, ModelVersion } from "@/lib/models-types";
import { useModelQuery } from "@/lib/query-hooks";
import { queryKeys } from "@/lib/query-keys";
import { areAttributesValid, validateAttributes } from "@/lib/validation";

export const Route = createFileRoute("/_authed/models/$modelId/versions/new")({
  component: VersionCreatePage,
});

function VersionCreatePage() {
  const { modelId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useModelQuery(modelId);
  const model = data as ModelDetail | undefined;
  const createVersionFn = useServerFn(createModelVersion);
  const [attributes, setAttributes] = useState<ModelVersion["attributes"]>([]);
  const [changelog, setChangelog] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!model) {
      return;
    }
    if (model.versions.length === 0) {
      setAttributes([]);
      return;
    }
    const activeVersion = model.versions.find((version) => version.isActive);
    setAttributes(
      activeVersion?.attributes || model.versions[0].attributes || [],
    );
  }, [model]);

  const handleCreate = async () => {
    if (!model) {
      return;
    }
    const validAttributes = validateAttributes(attributes);
    if (!areAttributesValid(validAttributes)) {
      toast.error("Please define at least one valid attribute");
      return;
    }

    setIsCreating(true);
    try {
      await createVersionFn({
        data: {
          modelId: model.id,
          attributes: validAttributes,
          changelog: changelog.trim() || undefined,
          setActive: true,
        },
      });
      toast.success("New version created");
      await queryClient.invalidateQueries({ queryKey: queryKeys.models });
      if (modelId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.model(modelId),
        });
      }
      await navigate({ to: "/models/$modelId", params: { modelId } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCreating(false);
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

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Button asChild size="sm" variant="ghost">
            <Link to="/models/$modelId" params={{ modelId }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to model
            </Link>
          </Button>
        </div>

        <Card className="border-0 bg-card/40 shadow-sm ring-1 ring-border/40">
          <CardHeader className="border-border/40 border-b">
            <CardTitle className="text-2xl">Create New Version</CardTitle>
            {model && (
              <p className="text-muted-foreground text-sm">{model.name}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <Textarea
              placeholder="Changelog note for this version"
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
              onClick={handleCreate}
              disabled={isCreating}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isCreating ? "Creating..." : "Create version"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
