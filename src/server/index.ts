import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { createApp } from "./app";
import { requireSecret } from "./auth";
import { SCHEMA } from "./schema";
import { Outside } from "./outside";
import { Meteo } from "./meteo";

declare const BUILD_ID: string;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
const secret = requireSecret(process.env.JWT_SECRET);
const production = process.env.NODE_ENV === "production";
// Closed unless explicitly opened: REGISTRATION_OPEN=true on Render reopens it, no deploy needed.
const registrationOpen = process.env.REGISTRATION_OPEN === "true";

const db = new pg.Pool({ connectionString: databaseUrl, max: 5 });
await db.query(SCHEMA);

const here = dirname(fileURLToPath(import.meta.url));
// Nominatim must be switchable off on OSMF's request without a deploy.
const nominatimEnabled = () => process.env.NOMINATIM_ENABLED !== "false";
const outside = new Outside(db);
await outside.load();
const meteo = new Meteo(db, outside, nominatimEnabled);

const app = createApp({
  db, secret, secure: production, publicDir: join(here, "public"), registrationOpen, meteo, buildId: BUILD_ID, allowForcing: !production,
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`parliamo on http://localhost:${port}`));
