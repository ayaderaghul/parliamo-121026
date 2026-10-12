/**
 * npm run build   →   dist/server.mjs        the Express server
 *                     dist/public/index.html the whole front end, one file
 *                     dist/preview.html      the same page without a server
 *
 * Node only: everything that needs graphviz or Python is already frozen in
 * src/data.json by `npm run data`.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
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

const page = await readFile(at("src", "client", "page.html"), "utf8");
if (!page.includes("/*__APP__*/") || !page.includes("<!--BODY-->")) {
  throw new Error("page.html is missing a placeholder");
}
const fragment = page.replace("/*__APP__*/", () => js);
const [head, body] = fragment.split("<!--BODY-->");

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
