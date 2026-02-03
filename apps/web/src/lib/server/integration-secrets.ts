import crypto from "node:crypto";
import { env } from "@extractify/env/server";
import type { EncryptedSecret } from "@/lib/integrations/types";

const KEY_LENGTH = 32;

function getIntegrationKey(): Buffer {
  const key = Buffer.from(env.INTEGRATION_SECRETS_KEY, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error("INTEGRATION_SECRETS_KEY must be 32 bytes base64");
  }

  return key;
}

export function encryptSecret(plaintext: string): EncryptedSecret {
  const key = getIntegrationKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    version: "v1",
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function decryptSecret(payload: EncryptedSecret): string {
  const key = getIntegrationKey();
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const encrypted = Buffer.from(payload.data, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
