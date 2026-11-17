const http = require("http");
const fs = require("fs");
const path = require("path");
const { handleStudentAuthRequest } = require("./server/studentAuth");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const BUILD_DIR = path.join(__dirname, "build");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

function serveStaticFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const handled = await handleStudentAuthRequest(req, res);
    if (handled) return;

    const reqPath = (req.url || "/").split("?")[0];
    const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, "");
    const candidate = path.join(BUILD_DIR, safePath === "/" ? "index.html" : safePath);

    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      serveStaticFile(candidate, res);
      return;
    }

    const indexFile = path.join(BUILD_DIR, "index.html");
    if (fs.existsSync(indexFile)) {
      serveStaticFile(indexFile, res);
      return;
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Build output not found. Run `npm run build` first.");
  } catch (err) {
    console.error("[server] Request error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Internal server error." }));
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`HITS Login server listening on http://${HOST}:${PORT}`);
});
