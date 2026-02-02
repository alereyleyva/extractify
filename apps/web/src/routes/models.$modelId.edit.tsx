import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteModel, updateModel } from "@/functions/models";
import { getErrorMessage } from "@/lib/error-handling";
import { fetchModel } from "@/lib/models-queries";
import { requireUser } from "@/lib/route-guards";

type ModelDetail = {
  id: string;
  name: string;
  description?: string | null;
};

export const Route = createFileRoute("/models/$modelId/edit")({
  component: ModelEditPage,
  loader: async ({ params }) => {
    return fetchModel(params.modelId);
  },
  beforeLoad: async () => {
    const user = await requireUser();
    return { user };
  },
});

function ModelEditPage() {
  const { modelId } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const model = Route.useLoaderData() as ModelDetail;
  const updateModelFn = useServerFn(updateModel);
  const deleteModelFn = useServerFn(deleteModel);
  const [name, setName] = useState(model.name || "");
  const [description, setDescription] = useState(model.description || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(model.name || "");
    setDescription(model.description || "");
  }, [model]);

  const handleSave = async () => {
    if (!model) {
      return;
    }
    if (!name.trim()) {
      toast.error("Model name is required");
      return;
    }
    setIsSaving(true);
    try {
      await updateModelFn({
        data: {
          modelId: model.id,
          name: name.trim(),
          description: description.trim() || null,
        },
      });
      toast.success("Model updated");
      await router.invalidate();
      await navigate({ to: "/models/$modelId", params: { modelId } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!model) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this model and all versions? This cannot be undone.",
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteModelFn({ data: { modelId: model.id } });
      toast.success("Model deleted");
      await router.invalidate();
      await navigate({ to: "/models" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-4xl px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Button asChild size="sm" variant="outline">
            <Link to="/models/$modelId" params={{ modelId }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to model
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete model
          </Button>
        </div>

        <Card className="border">
          <CardHeader>
            <CardTitle className="text-2xl">Edit Model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Model name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Textarea
              placeholder="Model description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
