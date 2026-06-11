/* Lokaler Dev-/Test-Server: statische Dateien + /api/quote wie auf Vercel.
 * Nutzung: GOOGLE_AI_STUDIO=... node dev-server.mjs [port]  */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const quoteHandler = require("./api/quote.js");
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2] || 8742);

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".png": "image/png", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".json": "application/json"
};

function vercelify(req, res, body) {
  req.body = body;
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); return res; };
  return { req, res };
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/quote")) {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 6 * 1024 * 1024) req.destroy(); });
    req.on("end", () => {
      let body = null;
      try { body = JSON.parse(raw); } catch (e) { body = raw; }
      vercelify(req, res, body);
      Promise.resolve(quoteHandler(req, res)).catch((e) => {
        res.status(500).json({ ok: false, error: String(e) });
      });
    });
    return;
  }
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/") p = "/index.html";
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404; res.end("not found"); return;
  }
  res.setHeader("Content-Type", MIME[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log(`dev-server http://127.0.0.1:${PORT}`));
