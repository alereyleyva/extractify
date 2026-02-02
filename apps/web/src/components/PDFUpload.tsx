import { FileText, Image as ImageIcon, Upload, X } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DocumentUploadProps = {
  onFileSelect: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onRemoveAll: () => void;
  selectedFiles: File[];
};

const SUPPORTED_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/jpg": [".jpg"],
};

const MAX_FILES = 10;

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
  onRemoveFile,
  onRemoveAll,
  selectedFiles,
}: DocumentUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remainingSlots = MAX_FILES - selectedFiles.length;
      if (remainingSlots <= 0) {
        return;
      }

      const filteredFiles = acceptedFiles.filter(
        (file) => file.type in SUPPORTED_TYPES || file.type === "image/jpg",
      );
      const nextFiles = filteredFiles.slice(0, remainingSlots);
      if (nextFiles.length > 0) {
        onFileSelect([...selectedFiles, ...nextFiles]);
      }
    },
    [onFileSelect, selectedFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_TYPES,
    multiple: true,
    disabled: selectedFiles.length >= MAX_FILES,
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div
          {...getRootProps()}
          className={cn(
            "cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            selectedFiles.length >= MAX_FILES &&
              "cursor-not-allowed opacity-60",
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
                  ? "Drop your documents here"
                  : "Upload documents or images"}
              </p>
              <p className="text-muted-foreground text-sm">
                Drag and drop up to {MAX_FILES} PDF or image files (JPEG, PNG),
                or click to browse
              </p>
            </div>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {selectedFiles.length} file
                {selectedFiles.length === 1 ? "" : "s"} selected
              </p>
              <Button variant="ghost" size="sm" onClick={onRemoveAll}>
                Clear all
              </Button>
            </div>
            {selectedFiles.map((file, index) => {
              const Icon = getFileIcon(file.type);
              return (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{file.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveFile(index)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
