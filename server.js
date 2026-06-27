import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "store.json");
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Lc$9vQ2!mR7#zT4@pX8&wN6";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret-change-me";
const DATABASE_PROVIDER = (process.env.DATABASE_PROVIDER || "local").toLowerCase();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const defaultStore = {
  solutions: [],
  views: []
};

let firebaseDb;

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, JSON.stringify(defaultStore, null, 2));
  }
}

async function readStore() {
  await ensureStore();
  const raw = await readFile(dataFile, "utf8");
  return JSON.parse(raw);
}

async function writeStore(store) {
  await writeFile(dataFile, JSON.stringify(store, null, 2));
}

async function getFirebaseDb() {
  if (firebaseDb) return firebaseDb;

  const admin = await import("firebase-admin");
  const { cert, getApps, initializeApp } = admin.default;
  const { getFirestore } = await import("firebase-admin/firestore");

  if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
      );
      initializeApp({ credential: cert(serviceAccount) });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = JSON.parse(await readFile(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"));
      initializeApp({ credential: cert(serviceAccount) });
    } else {
      initializeApp();
    }
  }

  firebaseDb = getFirestore();
  return firebaseDb;
}

async function readDatabase() {
  if (DATABASE_PROVIDER !== "firebase") return readStore();

  const db = await getFirebaseDb();
  const [solutionsSnapshot, viewsSnapshot] = await Promise.all([
    db.collection("solutions").get(),
    db.collection("views").get()
  ]);

  return {
    solutions: solutionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    views: viewsSnapshot.docs.map((doc) => doc.data())
  };
}

async function saveSolution(solution) {
  if (DATABASE_PROVIDER !== "firebase") {
    const store = await readStore();
    const existingIndex = store.solutions.findIndex((item) => item.id === solution.id);
    if (existingIndex >= 0) store.solutions[existingIndex] = solution;
    else store.solutions.push(solution);
    await writeStore(store);
    return solution;
  }

  const db = await getFirebaseDb();
  await db.collection("solutions").doc(solution.id).set(solution);
  return solution;
}

async function addView(view) {
  if (DATABASE_PROVIDER !== "firebase") {
    const store = await readStore();
    store.views.push(view);
    await writeStore(store);
    return;
  }

  const db = await getFirebaseDb();
  await db.collection("views").add(view);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  );
}

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

function createSession() {
  const payload = JSON.stringify({ role: "admin", exp: Date.now() + 1000 * 60 * 60 * 24 * 7 });
  const token = Buffer.from(payload).toString("base64url");
  return `${token}.${sign(token)}`;
}

function isAdmin(req) {
  const token = parseCookies(req).lc_admin;
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.role === "admin" && session.exp > Date.now();
  } catch {
    return false;
  }
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function normalizeSlug(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function solutionSummary(solution) {
  return {
    id: solution.id,
    questionNumber: solution.questionNumber,
    title: solution.title,
    slug: solution.slug,
    difficulty: solution.difficulty,
    tags: solution.tags,
    date: solution.date,
    updatedAt: solution.updatedAt
  };
}

function createView(solutionId, req) {
  const now = new Date();
  return {
    solutionId,
    viewedAt: now.toISOString(),
    day: now.toISOString().slice(0, 10),
    ipHash: crypto
      .createHash("sha256")
      .update(String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local"))
      .digest("hex")
      .slice(0, 16)
  };
}

function buildAnalytics(store) {
  const bySolution = new Map();
  for (const solution of store.solutions) {
    bySolution.set(solution.id, {
      solutionId: solution.id,
      questionNumber: solution.questionNumber,
      title: solution.title,
      totalViews: 0,
      dailyViews: {}
    });
  }

  const perDay = {};
  for (const view of store.views) {
    perDay[view.day] = (perDay[view.day] || 0) + 1;
    const entry = bySolution.get(view.solutionId);
    if (entry) {
      entry.totalViews += 1;
      entry.dailyViews[view.day] = (entry.dailyViews[view.day] || 0) + 1;
    }
  }

  return {
    totalViews: store.views.length,
    viewsPerDay: Object.entries(perDay)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([day, views]) => ({ day, views })),
    questionViews: [...bySolution.values()].sort((a, b) => b.totalViews - a.totalViews)
  };
}

async function importLeetCode(questionNumber) {
  const listResponse = await fetch("https://leetcode.com/api/problems/algorithms/", {
    headers: { "referer": "https://leetcode.com/problemset/" }
  });

  if (!listResponse.ok) {
    throw new Error(`LeetCode problem list returned ${listResponse.status}`);
  }

  const listPayload = await listResponse.json();
  const problem = listPayload.stat_status_pairs?.find(
    (item) => Number(item.stat?.frontend_question_id) === Number(questionNumber)
  );
  if (!problem) throw new Error("Question not found on LeetCode.");

  const detailQuery = {
    query: `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionFrontendId
          title
          titleSlug
          difficulty
          content
          topicTags { name slug }
        }
      }
    `,
    variables: { titleSlug: problem.stat.question__title_slug }
  };

  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "referer": "https://leetcode.com/problemset/"
    },
    body: JSON.stringify(detailQuery)
  });

  if (!response.ok) {
    throw new Error(`LeetCode returned ${response.status}`);
  }

  const payload = await response.json();
  const question = payload?.data?.question;
  if (!question) throw new Error("Question not found on LeetCode.");

  return {
    questionNumber: Number(question.questionFrontendId),
    title: question.title,
    slug: question.titleSlug,
    difficulty: question.difficulty,
    content: question.content || "",
    tags: (question.topicTags || []).map((tag) => tag.name)
  };
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readBody(req);
    if (body.password !== ADMIN_PASSWORD) {
      return sendJson(res, 401, { error: "Invalid password" });
    }
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "set-cookie": `lc_admin=${encodeURIComponent(createSession())}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`,
      "cache-control": "no-store"
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "set-cookie": "lc_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      "cache-control": "no-store"
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (pathname === "/api/auth/me") {
    return sendJson(res, 200, { admin: isAdmin(req) });
  }

  const store = await readDatabase();

  if (pathname === "/api/solutions" && req.method === "GET") {
    return sendJson(res, 200, {
      solutions: store.solutions
        .map(solutionSummary)
        .sort((a, b) => b.date.localeCompare(a.date) || b.questionNumber - a.questionNumber)
    });
  }

  const solutionMatch = pathname.match(/^\/api\/solutions\/([^/]+)$/);
  if (solutionMatch && req.method === "GET") {
    const key = decodeURIComponent(solutionMatch[1]);
    const solution = store.solutions.find((item) => item.id === key || item.slug === key || String(item.questionNumber) === key);
    if (!solution) return sendJson(res, 404, { error: "Solution not found" });
    if (!isAdmin(req)) {
      await addView(createView(solution.id, req));
    }
    return sendJson(res, 200, { solution });
  }

  if (pathname === "/api/admin/analytics") {
    if (!isAdmin(req)) return sendJson(res, 401, { error: "Admin login required" });
    return sendJson(res, 200, buildAnalytics(store));
  }

  if (pathname === "/api/admin/import" && req.method === "POST") {
    if (!isAdmin(req)) return sendJson(res, 401, { error: "Admin login required" });
    const body = await readBody(req);
    const imported = await importLeetCode(body.questionNumber);
    return sendJson(res, 200, { question: imported });
  }

  if (pathname === "/api/admin/solutions" && req.method === "POST") {
    if (!isAdmin(req)) return sendJson(res, 401, { error: "Admin login required" });
    const body = await readBody(req);
    const now = new Date().toISOString();
    const slug = body.slug || normalizeSlug(body.title);
    const existingIndex = store.solutions.findIndex((item) => String(item.questionNumber) === String(body.questionNumber));
    const existingSolution = existingIndex >= 0 ? store.solutions[existingIndex] : null;
    const solution = {
      id: existingSolution?.id || crypto.randomUUID(),
      questionNumber: Number(body.questionNumber),
      title: body.title,
      slug,
      difficulty: body.difficulty || "Medium",
      tags: Array.isArray(body.tags) ? body.tags : [],
      content: body.content || "",
      date: body.date || now.slice(0, 10),
      approach: body.approach || "",
      complexity: body.complexity || "",
      code: {
        cpp: body.code?.cpp || "",
        python: body.code?.python || "",
        java: body.code?.java || ""
      },
      createdAt: existingSolution?.createdAt || now,
      updatedAt: now
    };

    await saveSolution(solution);
    return sendJson(res, 200, { solution });
  }

  return sendJson(res, 404, { error: "Not found" });
}

async function serveStatic(req, res, pathname) {
  const routeFile = pathname === "/admin" ? "admin.html" : pathname === "/" ? "index.html" : pathname.slice(1);
  const safePath = path.normalize(routeFile).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Not a file");
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "content-type": mimeTypes[ext] || "application/octet-stream",
      "cache-control": "no-store"
    });
    createReadStream(filePath).pipe(res);
  } catch {
    const fallback = path.join(publicDir, "index.html");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    createReadStream(fallback).pipe(res);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) await handleApi(req, res, url.pathname);
    else await serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

if (DATABASE_PROVIDER !== "firebase") await ensureStore();
server.listen(PORT, () => {
  console.log(`Daily LeetCode Solutions running at http://localhost:${PORT}`);
  console.log(`Admin page: http://localhost:${PORT}/admin`);
  console.log(`Database provider: ${DATABASE_PROVIDER}`);
  if (ADMIN_PASSWORD === "Lc$9vQ2!mR7#zT4@pX8&wN6") {
    console.log("Using the built-in admin password. Set ADMIN_PASSWORD before deploying.");
  }
});
