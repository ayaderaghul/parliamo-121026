import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const COOKIE = "parliamo_sid";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

/** Refuse to start without a real secret: no fallback, no unsigned tokens. */
export function requireSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long");
  }
  return secret;
}

export function setSession(res: Response, userId: string, secret: string, secure: boolean) {
  const token = jwt.sign({ sub: userId }, secret, { algorithm: "HS256", expiresIn: MAX_AGE_S });
  res.cookie(COOKIE, token, {
    httpOnly: true, // not readable from JavaScript
    sameSite: "lax", // not sent on cross-site POSTs
    secure, // HTTPS only in production
    maxAge: MAX_AGE_S * 1000,
    path: "/",
  });
}

export function clearSession(res: Response, secure: boolean) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: "lax", secure, path: "/" });
}

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

/** Guard for every route that touches a user's data. */
export function requireAuth(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.[COOKIE];
    if (typeof token !== "string") return res.status(401).json({ error: "Accedi per continuare." });
    try {
      // algorithms pinned: a token signed any other way is rejected
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
      if (typeof payload !== "object" || typeof payload.sub !== "string") throw new Error();
      req.userId = payload.sub;
      next();
    } catch {
      return res.status(401).json({ error: "Sessione scaduta. Accedi di nuovo." });
    }
  };
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);

// Compared against when the email doesn't exist, so a wrong email takes as long
// as a wrong password and response time doesn't reveal who is registered.
const DUMMY_HASH = bcrypt.hashSync("parliamo-dummy-password", 12);

export async function checkPassword(pw: string, hash: string | undefined) {
  const ok = await bcrypt.compare(pw, hash ?? DUMMY_HASH);
  return ok && hash !== undefined;
}

/** Small fixed-window limiter for the auth routes. In memory: one instance. */
export function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const h = hits.get(key);
    if (!h || h.reset < now) {
      hits.set(key, { n: 1, reset: now + windowMs });
      return next();
    }
    if (++h.n > max) {
      res.setHeader("Retry-After", Math.ceil((h.reset - now) / 1000));
      return res.status(429).json({ error: "Troppi tentativi. Riprova tra qualche minuto." });
    }
    next();
  };
}
