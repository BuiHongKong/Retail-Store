/**
 * Prometheus metrics for all backend services.
 * Use: app.use(metrics.middleware); app.get("/metrics", metrics.handler);
 */
const { Registry, Counter, Histogram, collectDefaultMetrics } = require("prom-client");

const register = new Registry();

// Optional: default Node.js metrics (heap, event loop, etc.)
collectDefaultMetrics({ register, prefix: "node_" });

const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status_code"],
  registers: [register],
});

const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

/**
 * Normalize path to avoid high cardinality (e.g. /api/products/abc -> /api/products/:slug)
 */
function normalizePath(path) {
  if (!path || path === "/") return path;
  const segments = path.split("?")[0].split("/").filter(Boolean);
  const normalized = segments.map((seg, i) => {
    if (/^\d+$/.test(seg)) return ":id";
    if (/^[a-f0-9-]{36}$/i.test(seg)) return ":id";
    if (i === segments.length - 1 && /^[a-z0-9-]+$/i.test(seg) && seg.length <= 30) return ":slug";
    return seg;
  });
  return "/" + normalized.join("/");
}

function middleware(req, res, next) {
  const rawPath = req.path || req.url?.split("?")[0] || "/";
  if (rawPath === "/health" || rawPath === "/metrics") return next();
  const start = Date.now();
  const path = normalizePath(rawPath);
  res.on("finish", () => {
    const status = String(res.statusCode);
    const method = req.method;
    httpRequestsTotal.inc({ method, path, status_code: status });
    httpRequestDurationSeconds.observe(
      { method, path, status_code: status },
      (Date.now() - start) / 1000
    );
  });
  next();
}

async function handler(req, res) {
  res.setHeader("Content-Type", register.contentType);
  res.end(await register.metrics());
}

module.exports = {
  register,
  middleware,
  handler,
  httpRequestsTotal,
  httpRequestDurationSeconds,
};
