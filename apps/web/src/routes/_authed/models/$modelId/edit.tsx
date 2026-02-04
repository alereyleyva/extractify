import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ModelEditSkeleton } from "@/components/skeletons/models-skeletons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteModel, updateModel } from "@/functions/models";
import { getErrorMessage } from "@/lib/error-handling";
import { useModelQuery } from "@/lib/query-hooks";
import { queryKeys } from "@/lib/query-keys";

type ModelDetail = {
  id: string;
  name: string;
  description?: string | null;
};

export const Route = createFileRoute("/_authed/models/$modelId/edit")({
  component: ModelEditPage,
});

function ModelEditPage() {
  const { modelId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useModelQuery(modelId);
  const model = data as ModelDetail | undefined;
  const updateModelFn = useServerFn(updateModel);
  const deleteModelFn = useServerFn(deleteModel);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(model?.name || "");
    setDescription(model?.description || "");
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
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!model) {
      return;
    }
    try {
      await deleteModelFn({ data: { modelId: model.id } });
      toast.success("Model deleted");
      await queryClient.invalidateQueries({ queryKey: queryKeys.models });
      await navigate({ to: "/models" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isLoading) {
    return <ModelEditSkeleton />;
  }

  if (isError || !model) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-16">
        <div className="container mx-auto max-w-4xl px-6">
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
      <div className="container mx-auto max-w-4xl px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Button asChild size="sm" variant="ghost">
            <Link to="/models/$modelId" params={{ modelId }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to model
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete model
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete model</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete{" "}
                  <span className="font-medium text-foreground">
                    {model.name}
                  </span>{" "}
                  and all of its versions. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  Delete model
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Card className="border-0 bg-card/40 shadow-sm ring-1 ring-border/40">
          <CardHeader className="border-border/40 border-b">
            <CardTitle className="text-2xl">Edit Model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
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
