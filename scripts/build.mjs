/**
 * npm run build   →   dist/server.mjs        the Express server
 *                     dist/public/index.html the whole front end, one file
 *                     dist/preview.html      the same page without a server
 *
 * Node only: everything that needs graphviz or Python is already frozen in
 * src/data.json by `npm run data`.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";

const at = (...p) => join(process.cwd(), ...p);

// fail before building anything if the content is incomplete
const data = JSON.parse(await readFile(at("src", "data.json"), "utf8"));
for (const s of data.skills) {
  if (!data.lessons[s.id]) throw new Error(`no lesson for ${s.id}`);
  if (!(data.items[s.id] || []).length) throw new Error(`no items for ${s.id}`);
}

const client = await build({
  entryPoints: [at("src", "client", "main.ts")],
  bundle: true, format: "iife", minify: true, write: false, target: "es2020",
  logLevel: "warning",
});
const js = client.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

// ── fonts, self-hosted ──────────────────────────────────────────────────────
// Each file is copied under a name that contains its content hash, so it can be
// cached for a year (see app.ts) and a new font version gets a new URL.
const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";
const BODONI = "node_modules/@fontsource-variable/bodoni-moda/files/bodoni-moda";
const TITILLIUM = "node_modules/@fontsource/titillium-web/files/titillium-web";
const FONTS = [];
for (const [subset, range] of [["latin", LATIN], ["latin-ext", LATIN_EXT]]) {
  for (const style of ["normal", "italic"]) {
    FONTS.push({ family: "Bodoni Moda", style, weight: "400 900", range, file: `${BODONI}-${subset}-opsz-${style}.woff2` });
  }
  for (const w of [400, 600, 700]) {
    FONTS.push({ family: "Titillium Web", style: "normal", weight: String(w), range, file: `${TITILLIUM}-${subset}-${w}-normal.woff2` });
  }
}
await mkdir(at("dist", "public", "fonts"), { recursive: true });
let fontCss = "";
for (const f of FONTS) {
  const bytes = await readFile(at(f.file));
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
  const name = `${basename(f.file, ".woff2")}-${hash}.woff2`;
  await writeFile(at("dist", "public", "fonts", name), bytes);
  fontCss += `@font-face{font-family:"${f.family}";font-style:${f.style};font-weight:${f.weight};` +
    `font-display:swap;src:url(/fonts/${name}) format("woff2");unicode-range:${f.range}}\n`;
}

const page = await readFile(at("src", "client", "page.html"), "utf8");
if (!page.includes("/*__APP__*/") || !page.includes("<!--BODY-->") || !page.includes("/*__FONTS__*/")) {
  throw new Error("page.html is missing a placeholder");
}
const fragment = page.replace("/*__FONTS__*/", () => fontCss).replace("/*__APP__*/", () => js);
const [head, body] = fragment.split("<!--BODY-->");

// Nothing the page loads may come from a third party: every request it makes
// goes to our own server, so no visitor's IP leaves it (GDPR; Google Fonts).
// Checked on the template and the font CSS; links inside lesson text are only
// followed when clicked, so they are not loads.
const outside = (page + fontCss).match(/<(?:link|script|img|iframe)\b[^>]*\b(?:src|href)\s*=\s*["']?(?:https?:)?\/\/[^"'\s>]+|url\(\s*["']?(?:https?:)?\/\/[^)"']+|@import[^;]*\/\//gi);
if (outside) throw new Error(`page.html loads from outside the site: ${outside.join(", ")}`);

await mkdir(at("dist", "public"), { recursive: true });
await writeFile(
  at("dist", "public", "index.html"),
  `<!doctype html>\n<html lang="it">\n<head>\n<meta charset="utf-8">\n` +
    `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n` +
    `${head}</head>\n<body>${body}</body>\n</html>\n`,
);
await writeFile(at("dist", "preview.html"), fragment.replace("<!--BODY-->", ""));

await build({
  entryPoints: [at("src", "server", "index.ts")],
  bundle: true, platform: "node", format: "esm", target: "node20",
  packages: "external", outfile: at("dist", "server.mjs"), logLevel: "warning",
});

console.log(
  `built: ${data.skills.length} skills, ` +
    `${Object.values(data.items).reduce((a, b) => a + b.length, 0)} items, ` +
    `front end ${(fragment.length / 1024).toFixed(0)} kB`,
);
