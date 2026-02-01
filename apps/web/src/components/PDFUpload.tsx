import { FileText, Image as ImageIcon, Upload, X } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DocumentUploadProps = {
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  selectedFile: File | null;
};

const SUPPORTED_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

function getFileIcon(fileType: string) {
  if (fileType === "application/pdf") {
    return FileText;
  }
  if (fileType.startsWith("image/")) {
    return ImageIcon;
  }
  return FileText;
}

export function PDFUpload({
  onFileSelect,
  onRemove,
  selectedFile,
}: DocumentUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file && (file.type in SUPPORTED_TYPES || file.type === "image/jpg")) {
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_TYPES,
    multiple: false,
    disabled: !!selectedFile,
  });

  return (
    <Card>
      <CardContent className="pt-6">
        {!selectedFile ? (
          <div
            {...getRootProps()}
            className={cn(
              "cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="mb-2 font-semibold text-lg">
                  {isDragActive
                    ? "Drop your document here"
                    : "Upload a document or image"}
                </p>
                <p className="text-muted-foreground text-sm">
                  Drag and drop a PDF or image file (JPEG, PNG), or click to
                  browse
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                {(() => {
                  const Icon = getFileIcon(selectedFile.type);
                  return <Icon className="h-5 w-5 text-primary" />;
                })()}
              </div>
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-muted-foreground text-sm">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
