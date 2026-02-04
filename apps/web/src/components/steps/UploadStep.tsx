import { ArrowRight } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";

export function UploadStep({
  selectedFiles,
  onFileSelect,
  onRemoveFile,
  onRemoveAll,
  onContinue,
}: {
  selectedFiles: File[];
  onFileSelect: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onRemoveAll: () => void;
  onContinue: () => void;
}) {
  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="mb-4 font-bold text-4xl tracking-tight md:text-5xl">
          <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Upload Your Document
          </span>
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Upload up to 10 PDF, image, or audio files to extract data from
        </p>
      </div>
      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <FileUpload
            onFileSelect={onFileSelect}
            onRemoveFile={onRemoveFile}
            onRemoveAll={onRemoveAll}
            selectedFiles={selectedFiles}
          />
        </div>
      </div>
      {selectedFiles.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Button onClick={onContinue}>
            Continue to Attributes
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
