import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WebhookMethod } from "@/lib/integrations/types";

type WebhookIntegrationFieldsProps = {
  url: string;
  onUrlChange: (value: string) => void;
  method: WebhookMethod;
  onMethodChange: (value: WebhookMethod) => void;
  secret: string;
  onSecretChange: (value: string) => void;
  secretPlaceholder: string;
  hasSecret?: boolean;
  clearSecret?: boolean;
  onClearSecretChange?: (checked: boolean) => void;
};

export function WebhookIntegrationFields({
  url,
  onUrlChange,
  method,
  onMethodChange,
  secret,
  onSecretChange,
  secretPlaceholder,
  hasSecret = false,
  clearSecret = false,
  onClearSecretChange,
}: WebhookIntegrationFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Webhook URL</Label>
        <Input
          placeholder="https://hooks.example.com/extractify"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Method</Label>
          <Select
            value={method}
            onValueChange={(value) => onMethodChange(value as WebhookMethod)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Signing secret (optional)</Label>
          <Input
            placeholder={secretPlaceholder}
            value={secret}
            onChange={(event) => onSecretChange(event.target.value)}
          />
          {onClearSecretChange ? (
            <p className="text-muted-foreground text-xs">
              {hasSecret
                ? "A secret is currently set."
                : "No secret is set yet."}
            </p>
          ) : null}
        </div>
      </div>

      {onClearSecretChange ? (
        <div className="flex items-center gap-2 text-sm">
          <Checkbox
            id="clear-secret"
            checked={clearSecret}
            onCheckedChange={(value) => onClearSecretChange(value === true)}
          />
          <Label htmlFor="clear-secret">Clear existing secret</Label>
        </div>
      ) : null}
    </div>
  );
}
