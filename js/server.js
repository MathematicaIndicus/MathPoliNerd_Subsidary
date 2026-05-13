const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");
const ENV_FILE = path.join(ROOT, ".env");

function loadLocalEnv() {
  if (!fs.existsSync(ENV_FILE)) return;

  const lines = fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/);
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

loadLocalEnv();

const ADMIN_TOKEN = process.env.BLOG_ADMIN_TOKEN;
if (!ADMIN_TOKEN) {
  console.error("Missing BLOG_ADMIN_TOKEN. Set it in your environment before starting the server.");
  process.exit(1);
}
const PUBLIC_ORIGINS = (process.env.PUBLIC_ORIGINS || "*")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(POSTS_FILE)) fs.writeFileSync(POSTS_FILE, "[]\n", "utf8");
}

function readPosts() {
  ensureStore();
  try {
    const raw = fs.readFileSync(POSTS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Could not read posts.json:", error);
    return [];
  }
}

function writePosts(posts) {
  ensureStore();
  fs.writeFileSync(POSTS_FILE, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowAnyOrigin = PUBLIC_ORIGINS.includes("*");
  const allowedOrigin = allowAnyOrigin ? "*" : PUBLIC_ORIGINS.find(item => item === origin);

  if (allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    if (!allowAnyOrigin) res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Admin-Token");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function estimateReadMinutes(content) {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function publicPost(post) {
  return {
    ...post,
    readMinutes: estimateReadMinutes(post.content)
  };
}

function isAuthorized(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.headers["x-admin-token"];
  return token === ADMIN_TOKEN;
}

function normalizePost(input, existing = {}) {
  const now = new Date().toISOString();
  const title = String(input.title || "").trim();
  const slug = slugify(input.slug || title);

  if (!title) throw new Error("Title is required.");
  if (!slug) throw new Error("Slug is required.");

  return {
    id: existing.id || crypto.randomUUID(),
    title,
    slug,
    category: slugify(input.category || "analysis"),
    excerpt: String(input.excerpt || "").trim(),
    image: String(input.image || "").trim(),
    content: String(input.content || "").trim(),
    published: Boolean(input.published),
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}

async function handleApi(req, res, pathname) {
  const posts = readPosts();

  if (req.method === "GET" && pathname === "/api/posts") {
    const isAdmin = isAuthorized(req);
    const visiblePosts = isAdmin ? posts : posts.filter(post => post.published);
    visiblePosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sendJson(res, 200, visiblePosts.map(publicPost));
  }

  if (req.method === "GET" && pathname.startsWith("/api/posts/")) {
    const slug = decodeURIComponent(pathname.replace("/api/posts/", ""));
    const post = posts.find(item => item.slug === slug || item.id === slug);
    if (!post || (!post.published && !isAuthorized(req))) {
      return sendJson(res, 404, { error: "Post not found." });
    }
    return sendJson(res, 200, publicPost(post));
  }

  if (["POST", "PUT", "DELETE"].includes(req.method) && !isAuthorized(req)) {
    return sendJson(res, 401, { error: "Invalid or missing admin token." });
  }

  if (req.method === "POST" && pathname === "/api/posts") {
    try {
      const input = JSON.parse(await readBody(req) || "{}");
      const post = normalizePost(input);
      if (posts.some(item => item.slug === post.slug)) {
        return sendJson(res, 409, { error: "A post with this slug already exists." });
      }
      posts.unshift(post);
      writePosts(posts);
      return sendJson(res, 201, publicPost(post));
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.method === "PUT" && pathname.startsWith("/api/posts/")) {
    try {
      const id = decodeURIComponent(pathname.replace("/api/posts/", ""));
      const index = posts.findIndex(item => item.id === id || item.slug === id);
      if (index === -1) return sendJson(res, 404, { error: "Post not found." });

      const input = JSON.parse(await readBody(req) || "{}");
      const post = normalizePost(input, posts[index]);
      if (posts.some((item, itemIndex) => itemIndex !== index && item.slug === post.slug)) {
        return sendJson(res, 409, { error: "A post with this slug already exists." });
      }

      posts[index] = post;
      writePosts(posts);
      return sendJson(res, 200, publicPost(post));
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/posts/")) {
    const id = decodeURIComponent(pathname.replace("/api/posts/", ""));
    const nextPosts = posts.filter(item => item.id !== id && item.slug !== id);
    if (nextPosts.length === posts.length) return sendJson(res, 404, { error: "Post not found." });
    writePosts(nextPosts);
    return sendJson(res, 200, { success: true });
  }

  return sendJson(res, 404, { error: "API route not found." });
}

function serveStatic(req, res, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(ROOT, requestedPath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    applyCors(req, res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith("/api/")) {
      return handleApi(req, res, pathname);
    }

    return serveStatic(req, res, pathname);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "Internal server error." });
  }
});

ensureStore();
server.listen(PORT, () => {
  console.log(`Math&Poli Nerd backend running at http://localhost:${PORT}`);
  console.log(`Admin editor: http://localhost:${PORT}/admin.html`);
  console.log("Admin token loaded from BLOG_ADMIN_TOKEN.");
});
