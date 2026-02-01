import { ArrowRight } from "lucide-react";
import { PDFUpload } from "@/components/PDFUpload";
import { Button } from "@/components/ui/button";

export function UploadStep({
  selectedFile,
  onFileSelect,
  onRemove,
  onContinue,
}: {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
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
          Select a PDF or image file to extract data from
        </p>
      </div>
      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <PDFUpload
            onFileSelect={onFileSelect}
            onRemove={onRemove}
            selectedFile={selectedFile}
          />
        </div>
      </div>
      {selectedFile && (
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
