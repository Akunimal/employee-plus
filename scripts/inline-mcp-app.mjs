import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = fileURLToPath(new URL("../", import.meta.url));
const distDir = resolve(repoDir, "apps/mcp-app/dist");
const indexPath = resolve(distDir, "index.html");
let html = readFileSync(indexPath, "utf8");

html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => {
  const cssPath = resolve(distDir, href.replace(/^\//, ""));
  return `<style>\n${readFileSync(cssPath, "utf8")}\n</style>`;
});

html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const jsPath = resolve(distDir, src.replace(/^\//, ""));
  const javascript = readFileSync(jsPath, "utf8").replace(/\s*\/\/#[#]? sourceMappingURL=.*$/gm, "");
  return `<script type="module">\n${javascript}\n</script>`;
});

if (/<(?:script[^>]+src|link[^>]+href)=/i.test(html)) {
  throw new Error("The MCP App bundle still contains an external asset reference.");
}

writeFileSync(resolve(distDir, "index.inline.html"), html, "utf8");
console.log(`Created ${resolve(distDir, "index.inline.html")}`);
