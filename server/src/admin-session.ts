import crypto from 'node:crypto';
import type { Request } from 'express';

interface AdminSessionPayload {
  email?: string;
  scope?: string;
  exp?: number;
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** Valida o mesmo token HMAC emitido pela função lovablack-api. */
export function hasValidAdminSession(req: Request): boolean {
  const secret = process.env.MRO_ADMIN_SESSION_SECRET?.trim();
  const token = req.header('x-admin-token')?.trim();
  if (!secret || !token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  try {
    const payloadBytes = decodeBase64Url(parts[0]);
    const suppliedSignature = decodeBase64Url(parts[1]);
    const expectedSignature = crypto.createHmac('sha256', secret).update(payloadBytes).digest();
    if (
      suppliedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(suppliedSignature, expectedSignature)
    ) return false;

    const payload = JSON.parse(payloadBytes.toString('utf8')) as AdminSessionPayload;
    return payload.scope === 'mro-main-admin' &&
      typeof payload.email === 'string' &&
      typeof payload.exp === 'number' &&
      payload.exp >= Date.now();
  } catch {
    return false;
  }
}