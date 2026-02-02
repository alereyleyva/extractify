import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
} from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateCost,
  formatCost,
  formatTokenCount,
  type TokenUsage,
} from "@/lib/cost-calculation";
import { LLM_MODELS, type LlmModelId } from "@/lib/llm-models";

type ExtractionResultsProps = {
  results: Record<string, unknown> | null;
  usage: TokenUsage | null;
  isLoading: boolean;
  modelId: LlmModelId;
  onReset: () => void;
};

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

type AttributeResult = {
  value: string | null;
  confidence: number;
};

function isAttributeResult(value: unknown): value is AttributeResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "confidence" in value
  );
}

function getConfidence(value: unknown): number | null {
  if (isAttributeResult(value)) {
    return value.confidence;
  }
  return null;
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function getConfidenceBgColor(confidence: number): string {
  if (confidence >= 0.8)
    return "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400";
  if (confidence >= 0.6)
    return "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400";
  if (confidence >= 0.4)
    return "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400";
  return "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400";
}

function ArrayRecordItem({
  item,
  index,
  total,
}: {
  item: Record<string, unknown>;
  index: number;
  total: number;
}) {
  const entries = Object.entries(item);
  const hasManyFields = entries.length > 4;

  return (
    <div className="group relative overflow-hidden rounded-lg border-2 border-border bg-card transition-all duration-200 hover:border-primary/50">
      <div className="border-border border-b bg-linear-to-r from-primary/5 to-primary/0 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
              {index + 1}
            </div>
            <span className="font-medium text-muted-foreground text-sm">
              Record {index + 1} of {total}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`p-4 ${hasManyFields ? "grid grid-cols-1 gap-3 md:grid-cols-2" : "space-y-3"}`}
      >
        {entries.map(([key, value]) => {
          const confidence = getConfidence(value);
          const actualValue = isAttributeResult(value) ? value.value : value;
          const isSimpleValue =
            actualValue === null ||
            actualValue === undefined ||
            (typeof actualValue !== "object" && !Array.isArray(actualValue));

          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  {formatKey(key)}
                </span>
                {confidence !== null && (
                  <Badge
                    variant="outline"
                    className={`${getConfidenceBgColor(confidence)} h-4 border px-1.5 text-[10px]`}
                  >
                    {formatConfidence(confidence)}
                  </Badge>
                )}
              </div>
              <div className="text-foreground text-sm">
                {isSimpleValue ? (
                  actualValue === null || actualValue === undefined ? (
                    <span className="text-muted-foreground text-xs italic">
                      Not found
                    </span>
                  ) : (
                    <span className="break-words">{String(actualValue)}</span>
                  )
                ) : Array.isArray(actualValue) ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(actualValue as unknown[]).map((arrItem, arrIndex) => (
                      <span
                        key={`${arrIndex}-${String(arrItem)}`}
                        className="inline-flex items-center rounded border border-border bg-muted/50 px-2 py-0.5 font-mono text-xs"
                      >
                        {String(arrItem)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 rounded border border-border bg-muted/20 p-2">
                    {Object.entries(actualValue as Record<string, unknown>).map(
                      ([nestedKey, nestedValue]) => {
                        const nestedConfidence = getConfidence(nestedValue);
                        const nestedActual = isAttributeResult(nestedValue)
                          ? nestedValue.value
                          : nestedValue;
                        return (
                          <div
                            key={nestedKey}
                            className="flex flex-col gap-0.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-muted-foreground text-xs">
                                {formatKey(nestedKey)}
                              </span>
                              {nestedConfidence !== null && (
                                <Badge
                                  variant="outline"
                                  className={`${getConfidenceBgColor(nestedConfidence)} h-3 border px-1 text-[10px]`}
                                >
                                  {formatConfidence(nestedConfidence)}
                                </Badge>
                              )}
                            </div>
                            <span className="break-words text-foreground text-xs">
                              {nestedActual === null ||
                              nestedActual === undefined
                                ? "Not found"
                                : String(nestedActual)}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AttributeCard({
  keyName,
  value,
  confidence,
  level = 0,
}: {
  keyName: string;
  value: unknown;
  confidence: number | null;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(level === 0);

  const actualValue = isAttributeResult(value) ? value.value : value;
  const isNestedObject =
    typeof actualValue === "object" &&
    actualValue !== null &&
    !Array.isArray(actualValue);
  const isArrayOfObjects =
    Array.isArray(actualValue) &&
    actualValue.length > 0 &&
    typeof actualValue[0] === "object" &&
    actualValue[0] !== null;
  const isArrayOfPrimitives = Array.isArray(actualValue) && !isArrayOfObjects;
  const isCollapsible = isNestedObject || isArrayOfObjects;

  const handleToggle = () => {
    if (isCollapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  const containerClassName = `
    ${isCollapsible ? "w-full cursor-pointer text-left hover:border-primary/50" : ""}
    group relative rounded-lg border bg-card transition-all duration-200
    ${level === 0 ? "p-4 shadow-sm hover:shadow-md" : "p-3"}
    ${level > 0 ? "border-l-2 border-l-primary/30 bg-muted/30" : "border-border"}
  `;

  const content = (
    <div className="flex items-start gap-3">
      {isCollapsible && (
        <div className="mt-0.5 shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      )}
      {!isCollapsible && level > 0 && <div className="mt-0.5 w-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-base text-foreground">
            {formatKey(keyName)}
          </h3>
          {confidence !== null && (
            <Badge
              variant="outline"
              className={`${getConfidenceBgColor(confidence)} border`}
            >
              {formatConfidence(confidence)}
            </Badge>
          )}
        </div>
        <div className="text-foreground text-sm">
          {isNestedObject ? (
            isExpanded ? (
              <div className="mt-3 space-y-3">
                {Object.entries(actualValue as Record<string, unknown>).map(
                  ([nestedKey, nestedValue]) => {
                    const nestedConfidence = getConfidence(nestedValue);
                    return (
                      <AttributeCard
                        key={nestedKey}
                        keyName={nestedKey}
                        value={nestedValue}
                        confidence={nestedConfidence}
                        level={level + 1}
                      />
                    );
                  },
                )}
              </div>
            ) : (
              <div className="text-muted-foreground text-xs italic">
                {Object.keys(actualValue as Record<string, unknown>).length}{" "}
                field
                {Object.keys(actualValue as Record<string, unknown>).length !==
                1
                  ? "s"
                  : ""}
              </div>
            )
          ) : isArrayOfObjects ? (
            isExpanded ? (
              <div className="mt-4 space-y-4">
                {(actualValue as unknown[]).map((item, index) => {
                  const itemKey =
                    typeof item === "object" && item !== null
                      ? `${index}-${JSON.stringify(item).slice(0, 50)}`
                      : `${index}-${String(item)}`;
                  return (
                    <ArrayRecordItem
                      key={itemKey}
                      item={item as Record<string, unknown>}
                      index={index}
                      total={(actualValue as unknown[]).length}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <span className="italic">
                  {(actualValue as unknown[]).length} record
                  {(actualValue as unknown[]).length !== 1 ? "s" : ""}
                </span>
                <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                  Click to expand
                </Badge>
              </div>
            )
          ) : isArrayOfPrimitives ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {(actualValue as unknown[]).map((item, index) => (
                <span
                  key={`${index}-${String(item)}`}
                  className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-1 font-mono text-sm"
                >
                  {String(item)}
                </span>
              ))}
            </div>
          ) : actualValue === null || actualValue === undefined ? (
            <span className="text-muted-foreground italic">Not found</span>
          ) : (
            <span className="break-words">{String(actualValue)}</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`${level > 0 ? "ml-4" : ""}`}>
      {isCollapsible ? (
        <button
          type="button"
          className={containerClassName}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
        >
          {content}
        </button>
      ) : (
        <div className={containerClassName}>{content}</div>
      )}
    </div>
  );
}

function FormattedView({ results }: { results: Record<string, unknown> }) {
  const entries = Object.entries(results);

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="mb-2 font-medium text-lg">No data extracted</p>
        <p className="text-sm">The extraction did not return any results.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => {
        const confidence = getConfidence(value);
        return (
          <AttributeCard
            key={key}
            keyName={key}
            value={value}
            confidence={confidence}
          />
        );
      })}
    </div>
  );
}

function removeConfidence(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (isAttributeResult(value)) {
      cleaned[key] = value.value;
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

function JSONView({ results }: { results: Record<string, unknown> }) {
  const cleanedResults = removeConfidence(results);
  const jsonString = JSON.stringify(cleanedResults, null, 2);

  return (
    <div className="max-h-[600px] overflow-hidden rounded-lg bg-muted/50">
      <SyntaxHighlighter
        language="json"
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "transparent",
          fontSize: "0.875rem",
        }}
      >
        {jsonString}
      </SyntaxHighlighter>
    </div>
  );
}

export function ExtractionResults({
  results,
  usage,
  isLoading,
  modelId,
  onReset,
}: ExtractionResultsProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (results) {
      const cleanedResults = removeConfidence(results);
      navigator.clipboard.writeText(JSON.stringify(cleanedResults, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const costInfo = usage ? calculateCost(usage, modelId) : null;
  const modelLabel =
    LLM_MODELS.find((model) => model.id === modelId)?.label ?? modelId;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">
              Extracting data from your PDF...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return null;
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Extraction Complete
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              disabled={copied}
            >
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copied!" : "Copy JSON"}
            </Button>
            <Button variant="outline" size="sm" onClick={onReset}>
              Extract Another
            </Button>
          </div>
        </div>
        {usage && costInfo && (
          <div className="mt-6 border-border border-t pt-6">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">LLM model:</span>
                <span className="font-medium">{modelLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Input tokens:</span>
                <span className="font-medium">
                  {formatTokenCount(usage.inputTokens)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Output tokens:</span>
                <span className="font-medium">
                  {formatTokenCount(usage.outputTokens)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total tokens:</span>
                <span className="font-medium">
                  {formatTokenCount(usage.totalTokens)}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-muted-foreground">Estimated cost:</span>
                <span className="font-semibold text-primary">
                  {formatCost(costInfo.totalCost)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="formatted" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="formatted">Formatted View</TabsTrigger>
            <TabsTrigger value="json">JSON View</TabsTrigger>
          </TabsList>
          <TabsContent value="formatted" className="mt-6">
            <div className="max-h-[600px] overflow-auto rounded-lg bg-muted/30 p-6">
              <FormattedView results={results} />
            </div>
          </TabsContent>
          <TabsContent value="json" className="mt-6">
            <JSONView results={results} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
