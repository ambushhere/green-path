import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 8787);

const WAQI_TOKEN = process.env.WAQI_TOKEN || process.env.VITE_WAQI_TOKEN || '';

// Comma-separated list of allowed origins, e.g. "https://example.com,http://localhost:5173"
// Defaults to localhost dev server when not set.
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173'];

const getAllowOriginHeader = (origin) => {
  if (!origin) return null;
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
};

const buildCorsHeaders = (origin) => {
  const allowedOrigin = getAllowOriginHeader(origin);
  return {
    'Access-Control-Allow-Origin': allowedOrigin ?? '',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
};

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter: max RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW_MS per IP
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 120);
const rateLimitMap = new Map(); // ip -> { count, resetAt }

const isRateLimited = (ip) => {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
};

// Periodically purge expired rate-limit entries to avoid unbounded growth.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (entry.resetAt < now) rateLimitMap.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS);

const SERVICE_BASES = {
  routing: process.env.ROUTING_API_BASE_URL || 'https://router.project-osrm.org',
  geocoding: process.env.GEOCODING_API_BASE_URL || 'https://nominatim.openstreetmap.org',
  'air-quality': process.env.AIR_QUALITY_API_BASE_URL || 'https://api.openaq.org/v2',
  waqi: process.env.WAQI_API_BASE_URL || 'https://api.waqi.info',
};

const forwardRequest = async (targetUrl, userAgent = 'SafePathProxy/1.0') => {
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': userAgent,
    },
  });

  const body = await response.text();
  return {
    status: response.status,
    body,
  };
};

const sendJson = (res, statusCode, payload, corsHeaders = {}) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...corsHeaders,
  });
  res.end(JSON.stringify(payload));
};

const sendForwarded = (res, statusCode, body, corsHeaders = {}) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=60',
    ...corsHeaders,
  });
  res.end(body);
};

const buildForwardUrl = (baseUrl, incomingPath, incomingSearch) => {
  const pathAfterService = incomingPath.replace(/^\/(routing|geocoding|air-quality|waqi)/, '');
  const normalizedPath = pathAfterService.startsWith('/') ? pathAfterService : `/${pathAfterService}`;
  return `${baseUrl}${normalizedPath}${incomingSearch}`;
};

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const corsHeaders = buildCorsHeaders(origin);

  if (!req.url || !req.method) {
    sendJson(res, 400, { error: 'Invalid request' }, corsHeaders);
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // Reject requests from disallowed origins (non-browser clients have no Origin header and pass).
  if (origin && !getAllowOriginHeader(origin)) {
    sendJson(res, 403, { error: 'Origin not allowed' }, corsHeaders);
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Only GET is supported' }, corsHeaders);
    return;
  }

  // Rate limiting by client IP
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.socket.remoteAddress ?? 'unknown';
  if (isRateLimited(clientIp)) {
    sendJson(res, 429, { error: 'Too many requests. Please slow down.' }, corsHeaders);
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathSegments = requestUrl.pathname.split('/').filter(Boolean);
  const service = pathSegments[0];

  if (requestUrl.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      services: Object.keys(SERVICE_BASES),
    }, corsHeaders);
    return;
  }

  if (!service || !(service in SERVICE_BASES)) {
    sendJson(res, 404, {
      error: 'Unknown service. Use /routing, /geocoding, /air-quality, or /waqi.',
    }, corsHeaders);
    return;
  }

  const baseUrl = SERVICE_BASES[service];

  try {
    let forwardSearch = requestUrl.search;

    if (service === 'waqi') {
      const searchParams = new URLSearchParams(requestUrl.search);
      if (!searchParams.get('token') && WAQI_TOKEN) {
        searchParams.set('token', WAQI_TOKEN);
      }

      if (!searchParams.get('token')) {
        sendJson(res, 400, {
          error: 'WAQI token missing. Set WAQI_TOKEN in proxy environment.',
        }, corsHeaders);
        return;
      }

      forwardSearch = `?${searchParams.toString()}`;
    }

    const targetUrl = buildForwardUrl(baseUrl, requestUrl.pathname, forwardSearch);
    const userAgent = service === 'geocoding' ? 'SafePath/1.0' : 'SafePathProxy/1.0';
    const { status, body } = await forwardRequest(targetUrl, userAgent);
    sendForwarded(res, status, body, corsHeaders);
  } catch (error) {
    sendJson(res, 502, {
      error: 'Upstream request failed',
      detail: error instanceof Error ? error.message : 'Unknown proxy error',
    }, corsHeaders);
  }
});

server.listen(PORT, () => {
  console.log(`Safe Path proxy listening on http://localhost:${PORT}`);
});
