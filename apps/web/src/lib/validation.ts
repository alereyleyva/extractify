import type { Attribute } from "@/components/AttributeBuilder";

export function createAttribute(): Attribute {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    type: "string",
  };
}

function validateAttributeRecursive(attr: Attribute): boolean {
  if (!attr.name.trim()) {
    return false;
  }
  if (
    (attr.type === "record" || attr.type === "arrayOfRecords") &&
    attr.children
  ) {
    return (
      attr.children.length > 0 &&
      attr.children.every(validateAttributeRecursive)
    );
  }
  return true;
}

export function validateAttributes(attributes: Attribute[]): Attribute[] {
  return attributes.filter(validateAttributeRecursive);
}

export function areAttributesValid(attributes: Attribute[]): boolean {
  return attributes.length > 0 && attributes.every(validateAttributeRecursive);
}
