import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { createApp } from "./app";
import { requireSecret } from "./auth";
import { SCHEMA } from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
const secret = requireSecret(process.env.JWT_SECRET);
const production = process.env.NODE_ENV === "production";
// Closed unless explicitly opened: REGISTRATION_OPEN=true on Render reopens it, no deploy needed.
const registrationOpen = process.env.REGISTRATION_OPEN === "true";

const db = new pg.Pool({ connectionString: databaseUrl, max: 5 });
await db.query(SCHEMA);

const here = dirname(fileURLToPath(import.meta.url));
const app = createApp({ db, secret, secure: production, publicDir: join(here, "public"), registrationOpen });

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`parliamo on http://localhost:${port}`));
