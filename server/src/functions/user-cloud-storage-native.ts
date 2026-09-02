import type { Request, Response } from "express";
import { hasValidAdminSession } from "../admin-session.js";
import { adminQuery } from "../db.js";
import { RestError } from "../rest/identifiers.js";

interface UserSessionRow {
  id: string;
  squarecloud_username: string;
  updated_at: string;
  days_remaining: number | null;
  profile_sessions: unknown;
}

interface NativeRequestBody {
  action?: unknown;
  username?: unknown;
  activate?: unknown;
}

function parseBody(req: Request): NativeRequestBody {
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString("utf8")) as NativeRequestBody;
    } catch {
      throw new RestError(400, "Corpo JSON inválido.");
    }
  }
  return (req.body ?? {}) as NativeRequestBody;
}

function sessionsFrom(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
    );
  }
  if (typeof value === "string") {
    try {
      return sessionsFrom(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Executa localmente apenas as duas ações administrativas desta função.
 * As ações save/load continuam na função original para preservar seu fluxo.
 */
export async function handleNativeUserCloudStorage(
  req: Request,
  res: Response,
): Promise<boolean> {
  if (req.method !== "POST") return false;

  const body = parseBody(req);
  const action = typeof body.action === "string" ? body.action : "";
  if (action !== "get_creatives_pro_users" && action !== "set_creatives_pro") {
    return false;
  }

  if (!hasValidAdminSession(req)) {
    res.status(401).json({ success: false, error: "Sessão administrativa inválida ou expirada" });
    return true;
  }

  if (action === "get_creatives_pro_users") {
    const rows = await adminQuery<UserSessionRow>(
      `SELECT id, squarecloud_username, updated_at, days_remaining, profile_sessions
         FROM user_sessions
        ORDER BY updated_at DESC`,
    );
    const users = rows
      .filter((row) => sessionsFrom(row.profile_sessions).some((session) => session.creativesUnlocked === true))
      .map((row) => ({
        squarecloud_username: row.squarecloud_username,
        activated_at: row.updated_at,
        days_remaining: row.days_remaining,
      }));
    res.json({ success: true, users });
    return true;
  }

  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  if (!username || username.length > 255) {
    throw new RestError(400, "Username inválido.");
  }
  const activate = body.activate !== false;
  const existing = await adminQuery<UserSessionRow>(
    `SELECT id, squarecloud_username, updated_at, days_remaining, profile_sessions
       FROM user_sessions
      WHERE lower(squarecloud_username) = $1
      LIMIT 1`,
    [username],
  );

  if (existing.length === 0) {
    await adminQuery(
      `INSERT INTO user_sessions
         (squarecloud_username, profile_sessions, days_remaining)
       VALUES ($1, $2::jsonb, $3)`,
      [
        username,
        JSON.stringify([{ creativesUnlocked: activate, creativesRemaining: 6, activatedAt: new Date().toISOString() }]),
        9999,
      ],
    );
  } else {
    const current = existing[0];
    const sessions = sessionsFrom(current.profile_sessions);
    const updatedSessions = (sessions.length > 0 ? sessions : [{}]).map((session) => ({
      ...session,
      creativesUnlocked: activate,
      creativesRemaining: activate ? 6 : session.creativesRemaining,
      ...(sessions.length === 0 ? { activatedAt: new Date().toISOString() } : {}),
    }));
    await adminQuery(
      `UPDATE user_sessions
          SET profile_sessions = $1::jsonb,
              lifetime_creative_used_at = CASE WHEN $2 THEN NULL ELSE lifetime_creative_used_at END,
              updated_at = now()
        WHERE id = $3`,
      [JSON.stringify(updatedSessions), activate, current.id],
    );
  }

  res.json({ success: true, activated: activate });
  return true;
}