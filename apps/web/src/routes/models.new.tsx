import type { AttributeInput } from "@extractify/shared/attribute-model";
import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AttributeBuilder } from "@/components/AttributeBuilder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createModel } from "@/functions/models";
import { getErrorMessage } from "@/lib/error-handling";
import { requireUser } from "@/lib/route-guards";
import { areAttributesValid, validateAttributes } from "@/lib/validation";

export const Route = createFileRoute("/models/new")({
  component: ModelCreatePage,
  beforeLoad: async () => {
    const user = await requireUser();
    return { user };
  },
});

function ModelCreatePage() {
  const navigate = useNavigate();
  const router = useRouter();
  const createModelFn = useServerFn(createModel);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [changelog, setChangelog] = useState("");
  const [attributes, setAttributes] = useState<AttributeInput[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateModel = async () => {
    if (!name.trim()) {
      toast.error("Please provide a model name");
      return;
    }

    const validAttributes = validateAttributes(attributes);
    if (!areAttributesValid(validAttributes)) {
      toast.error("Please define at least one valid attribute");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createModelFn({
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          changelog: changelog.trim() || undefined,
          attributes: validAttributes,
        },
      });

      if (result && typeof result === "object" && "modelId" in result) {
        toast.success("Model created");
        await router.invalidate();
        await navigate({
          to: "/models/$modelId",
          params: { modelId: result.modelId as string },
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Button asChild size="sm" variant="ghost">
            <Link to="/models">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to models
            </Link>
          </Button>
        </div>

        <Card className="border-0 bg-card/40 shadow-sm ring-1 ring-border/40">
          <CardHeader className="border-border/40 border-b">
            <CardTitle className="text-2xl">Create Model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <Input
                placeholder="Model name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Textarea
                placeholder="Short description (optional)"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
              <Textarea
                placeholder="Changelog note for v1 (optional)"
                value={changelog}
                onChange={(event) => setChangelog(event.target.value)}
                rows={2}
              />
            </div>
            <AttributeBuilder
              attributes={attributes}
              onAttributesChange={setAttributes}
            />
            <Button
              className="w-full"
              onClick={handleCreateModel}
              disabled={isCreating}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isCreating ? "Creating..." : "Create model"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
