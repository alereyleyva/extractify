import type {
  AttributeInput,
  AttributeType,
} from "@extractify/shared/attribute-model";
import { ChevronDown, ChevronRight, Plus, Trash2, Type } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAttribute } from "@/lib/validation";

export type Attribute = AttributeInput;

type AttributeBuilderProps = {
  attributes: Attribute[];
  onAttributesChange: (attributes: Attribute[]) => void;
  readOnly?: boolean;
};

function updateAttributeInTree(
  attributes: Attribute[],
  id: string,
  updates: Partial<Attribute>,
): Attribute[] {
  return attributes.map((attr) => {
    if (attr.id === id) {
      const updated = { ...attr, ...updates };
      if (
        updates.type !== undefined &&
        (updates.type === "string" || updates.type === "array")
      ) {
        return { ...updated, children: undefined };
      }
      return updated;
    }
    if (attr.children) {
      return {
        ...attr,
        children: updateAttributeInTree(attr.children, id, updates),
      };
    }
    return attr;
  });
}

function removeAttributeFromTree(
  attributes: Attribute[],
  id: string,
): Attribute[] {
  return attributes
    .filter((attr) => attr.id !== id)
    .map((attr) => {
      if (attr.children) {
        return {
          ...attr,
          children: removeAttributeFromTree(attr.children, id),
        };
      }
      return attr;
    });
}

function addChildAttributeToTree(
  attributes: Attribute[],
  parentId: string,
): Attribute[] {
  return attributes.map((attr) => {
    if (attr.id === parentId) {
      const children = attr.children || [];
      return {
        ...attr,
        children: [...children, createAttribute()],
      };
    }
    if (attr.children) {
      return {
        ...attr,
        children: addChildAttributeToTree(attr.children, parentId),
      };
    }
    return attr;
  });
}

function removeChildAttributeFromTree(
  attributes: Attribute[],
  parentId: string,
  childId: string,
): Attribute[] {
  return attributes.map((attr) => {
    if (attr.id === parentId && attr.children) {
      return {
        ...attr,
        children: attr.children.filter((child) => child.id !== childId),
      };
    }
    if (attr.children) {
      return {
        ...attr,
        children: removeChildAttributeFromTree(
          attr.children,
          parentId,
          childId,
        ),
      };
    }
    return attr;
  });
}

function updateChildAttributeInTree(
  attributes: Attribute[],
  parentId: string,
  childId: string,
  updates: Partial<Attribute>,
): Attribute[] {
  return attributes.map((attr) => {
    if (attr.id === parentId && attr.children) {
      return {
        ...attr,
        children: attr.children.map((child) =>
          child.id === childId ? { ...child, ...updates } : child,
        ),
      };
    }
    if (attr.children) {
      return {
        ...attr,
        children: updateChildAttributeInTree(
          attr.children,
          parentId,
          childId,
          updates,
        ),
      };
    }
    return attr;
  });
}

type AttributeItemProps = {
  attribute: Attribute;
  index: number;
  level?: number;
  onUpdate: (id: string, updates: Partial<Attribute>) => void;
  onRemove: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onRemoveChild: (parentId: string, childId: string) => void;
  onUpdateChild: (
    parentId: string,
    childId: string,
    updates: Partial<Attribute>,
  ) => void;
  readOnly?: boolean;
};

function AttributeItem({
  attribute,
  index,
  level = 0,
  onUpdate,
  onRemove,
  onAddChild,
  onRemoveChild,
  onUpdateChild,
  readOnly = false,
}: AttributeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const [showDescription, setShowDescription] = useState(false);
  const isNested = level > 0;
  const hasChildren =
    attribute.type === "record" || attribute.type === "arrayOfRecords";

  return (
    <div
      className={`group relative rounded-lg border transition-all duration-200 ${
        isNested
          ? "ml-6 border-border border-l-2 border-l-primary/30 px-4 py-3"
          : "border-border bg-card p-4 hover:border-primary/50"
      }`}
    >
      <div className="flex items-center gap-3">
        {hasChildren && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0 rounded p-1 transition-colors hover:bg-muted"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
        {!hasChildren && !isNested && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary text-xs">
            {index + 1}
          </div>
        )}
        {!hasChildren && isNested && <div className="h-7 w-7 shrink-0" />}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <Input
            placeholder="Attribute name"
            value={attribute.name}
            onChange={(event) =>
              onUpdate(attribute.id, {
                name: event.target.value,
              })
            }
            className="h-9 min-w-[140px] flex-1 font-mono text-sm"
            disabled={readOnly}
          />
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 shrink-0 px-3 text-xs"
              onClick={() => setShowDescription(!showDescription)}
            >
              {showDescription ? "Hide" : "Desc"}
            </Button>
          )}
          <Select
            value={attribute.type}
            onValueChange={(value) => {
              if (!value) {
                return;
              }
              const nextValue = value as AttributeType;
              onUpdate(attribute.id, {
                type: nextValue,
                children:
                  nextValue === "record" || nextValue === "arrayOfRecords"
                    ? attribute.children || []
                    : undefined,
              });
            }}
            disabled={readOnly}
          >
            <SelectTrigger className="h-9 w-[150px] shrink-0 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="string">String</SelectItem>
              <SelectItem value="array">Array</SelectItem>
              <SelectItem value="record">Record</SelectItem>
              <SelectItem value="arrayOfRecords">Array[Record]</SelectItem>
            </SelectContent>
          </Select>
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
              onClick={() => onRemove(attribute.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {(showDescription || (readOnly && attribute.description)) && (
        <div className="mt-3 ml-10">
          <Textarea
            placeholder="Optional description..."
            value={attribute.description || ""}
            onChange={(event) =>
              onUpdate(attribute.id, {
                description: event.target.value || undefined,
              })
            }
            rows={2}
            className="resize-none text-sm"
            disabled={readOnly}
          />
        </div>
      )}
      {hasChildren && isExpanded && (
        <div className="mt-3 ml-10 space-y-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              {attribute.type === "record" ? "Nested Fields" : "Record Fields"}
            </span>
            {!readOnly && (
              <Button
                type="button"
                onClick={() => onAddChild(attribute.id)}
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Field
              </Button>
            )}
          </div>
          {attribute.children && attribute.children.length > 0 ? (
            <div className="space-y-2">
              {attribute.children.map((child, childIndex) => (
                <AttributeItem
                  key={child.id}
                  attribute={child}
                  index={childIndex}
                  level={level + 1}
                  onUpdate={(id, updates) =>
                    onUpdateChild(attribute.id, id, updates)
                  }
                  onRemove={(id) => onRemoveChild(attribute.id, id)}
                  onAddChild={onAddChild}
                  onRemoveChild={onRemoveChild}
                  onUpdateChild={onUpdateChild}
                  readOnly={readOnly}
                />
              ))}
            </div>
          ) : (
            <div className="rounded border border-dashed py-4 text-center text-muted-foreground text-xs">
              No fields defined. Click "Add Field" to define nested attributes.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AttributeBuilder({
  attributes,
  onAttributesChange,
  readOnly = false,
}: AttributeBuilderProps) {
  const addAttribute = () => {
    if (readOnly) {
      return;
    }
    onAttributesChange([...attributes, createAttribute()]);
  };

  const removeAttribute = (id: string) => {
    if (readOnly) {
      return;
    }
    onAttributesChange(removeAttributeFromTree(attributes, id));
  };

  const updateAttribute = (id: string, updates: Partial<Attribute>) => {
    if (readOnly) {
      return;
    }
    onAttributesChange(updateAttributeInTree(attributes, id, updates));
  };

  const addChildAttribute = (parentId: string) => {
    if (readOnly) {
      return;
    }
    onAttributesChange(addChildAttributeToTree(attributes, parentId));
  };

  const removeChildAttribute = (parentId: string, childId: string) => {
    if (readOnly) {
      return;
    }
    onAttributesChange(
      removeChildAttributeFromTree(attributes, parentId, childId),
    );
  };

  const updateChildAttribute = (
    parentId: string,
    childId: string,
    updates: Partial<Attribute>,
  ) => {
    if (readOnly) {
      return;
    }
    onAttributesChange(
      updateChildAttributeInTree(attributes, parentId, childId, updates),
    );
  };

  return (
    <Card className="border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Attributes</CardTitle>
            {attributes.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {attributes.length}
              </Badge>
            )}
          </div>
          {!readOnly && (
            <Button
              onClick={addAttribute}
              size="sm"
              variant="outline"
              className="h-9"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Attribute
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {attributes.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
            <Type className="mx-auto mb-2 h-7 w-7 text-muted-foreground/50" />
            <p className="mb-1 font-medium text-sm">
              No attributes defined yet
            </p>
            <p className="text-xs">
              Click "Add Attribute" to start defining what to extract
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {attributes.map((attribute, index) => (
              <AttributeItem
                key={attribute.id}
                attribute={attribute}
                index={index}
                onUpdate={updateAttribute}
                onRemove={removeAttribute}
                onAddChild={addChildAttribute}
                onRemoveChild={removeChildAttribute}
                onUpdateChild={updateChildAttribute}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
