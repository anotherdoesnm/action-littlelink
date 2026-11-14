// Renders one self-contained LittleLink-style page from site.json + links.json.
//
// Everything stylistic belongs upstream: the layout mirrors sethcottle/littlelink,
// and button colours are lifted rule-by-rule from the vendored brands.css files
// that action.yml downloads. This script only decides what goes where.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ACTION_DIR = process.env.ACTION_DIR ?? process.cwd();
const CONFIG_DIR = process.env.CONFIG_DIR ?? ".";
const OUTPUT_DIR = process.env.OUTPUT_DIR ?? "dist";
const BRANDS_DIR = process.env.BRANDS_DIR ?? join(ACTION_DIR, "assets", "brands");

const readIf = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const site = JSON.parse(readIf(join(CONFIG_DIR, "site.json")) || "{}");
const allLinks = JSON.parse(readIf(join(CONFIG_DIR, "links.json")) || "[]");
const links = allLinks.filter((l) => l.url && l.url.trim());
for (const l of allLinks.filter((l) => !l.url || !l.url.trim())) console.warn(`skipping "${l.label}" — no url`);

// --- brand rules -----------------------------------------------------------
const sources = [
  ["main", readIf(join(BRANDS_DIR, "main.css"))],
  ["extended", readIf(join(BRANDS_DIR, "extended.css"))],
  ["local", readIf(join(ACTION_DIR, "assets", "brands", "local.css"))],
];
const brands = [...new Set(links.map((l) => l.brand).filter(Boolean))];
const missing = [];
const brandCss = brands
  .map((brand) => {
    for (const [, css] of sources) {
      const m = css.match(new RegExp(`\\.button-${brand}\\s*\\{[^}]*\\}`, "m"));
      if (m) return m[0];
    }
    // Fall back to an explicit colour in the config, computing readable text:
    // that is how a site adds a brand upstream does not know at all.
    const link = links.find((l) => l.brand === brand && l.color);
    if (link) {
      const h = link.color.replace("#", "");
      const [r, g, b] = [0, 2, 4]
        .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      const light = 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45;
      return `.button-${brand}{--button-background:${link.color};--button-text:${light ? "#000000" : "#ffffff"}}`;
    }
    missing.push(brand);
    return "";
  })
  .filter(Boolean)
  .join("\n");

// --- icons and avatar ------------------------------------------------------
const iconPath = (n) => join(CONFIG_DIR, "assets", "icons", `${n}.svg`);

function iconSymbol(name) {
  const raw = readIf(iconPath(name));
  if (!raw) {
    console.warn(`icon "${name}" missing — using a letter badge`);
    return null;
  }
  return raw
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^<svg([^>]*)>/, (_, attrs) => `<symbol id="i-${name}"${attrs.replace(/\s(width|height)="[^"]*"/g, "")}>`)
    .replace(/<\/svg>$/, "</symbol>");
}

const usedIcons = [...new Set(links.map((l) => l.icon).filter((n) => n && existsSync(iconPath(n))))];
const iconDefs = usedIcons.length
  ? `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${usedIcons.map(iconSymbol).join("")}</svg>\n`
  : "";

function avatarTag() {
  if (!site.avatar) return "";
  const file = join(CONFIG_DIR, site.avatar);
  if (!existsSync(file)) {
    console.warn(`avatar ${site.avatar} missing`);
    return "";
  }
  const ext = site.avatar.split(".").pop().toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  return `  <img class="avatar" src="data:${mime};base64,${readFileSync(file).toString("base64")}" alt="${esc(site.title)}" width="128" height="128">\n`;
}

function renderLink({ label, url, icon, brand }) {
  const mark = icon && existsSync(iconPath(icon))
    ? `<svg class="icon" aria-hidden="true"><use href="#i-${esc(icon)}"/></svg>`
    : `<span class="badge">${esc(label.slice(0, 1))}</span>`;
  const safeUrl = /^(https?:|mailto:|matrix:)/i.test(url) ? url : "#";
  const cls = brand ? `button button-${esc(brand)}` : "button";
  return `    <a class="${cls}" href="${esc(safeUrl)}" rel="me noopener" target="_blank">${mark}${esc(label)}</a>`;
}

// --- output ----------------------------------------------------------------
const minifyCss = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();

const themeVars = Object.entries(site.theme ?? {}).map(([k, v]) => `--${k}:${v}`).join(";");
const html = `<!DOCTYPE html>
<html lang="${esc(site.lang ?? "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.title)}${site.subtitle ? ` — ${esc(site.subtitle)}` : ""}</title>
<style>:root{${themeVars}}${minifyCss(readIf(join(ACTION_DIR, "assets", "style.css")))}${minifyCss(brandCss)}</style>
</head>
<body>
${iconDefs}<div class="container"><main>
${avatarTag()}  <h1>${esc(site.title)}</h1>
  <p class="bio">${esc(site.subtitle ?? "")}</p>
  <nav class="button-stack" aria-label="links">
${links.map(renderLink).join("\n")}
  </nav>
  <footer>${esc(site.footer ?? "")}${site.footerUrl ? ` · <a href="${esc(site.footerUrl)}" rel="noopener">${esc(site.footerText ?? "repo")}</a>` : ""}</footer>
</main></div>
</body>
</html>
`;

mkdirSync(join(CONFIG_DIR, OUTPUT_DIR), { recursive: true });
writeFileSync(join(CONFIG_DIR, OUTPUT_DIR, "index.html"), html);
if (missing.length) console.warn(`no CSS for brand(s): ${missing.join(", ")} — add a color in links.json or a rule in local.css`);
console.log(`built ${OUTPUT_DIR}/index.html — ${html.length} bytes, ${links.length} links, ${usedIcons.length} icons, ${brands.length} brands`);
