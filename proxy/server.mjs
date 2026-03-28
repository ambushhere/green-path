import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 8787);

const WAQI_TOKEN = process.env.WAQI_TOKEN || process.env.VITE_WAQI_TOKEN || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(payload));
};

const sendForwarded = (res, statusCode, body) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=60',
    ...CORS_HEADERS,
  });
  res.end(body);
};

const buildForwardUrl = (baseUrl, incomingPath, incomingSearch) => {
  const pathAfterService = incomingPath.replace(/^\/(routing|geocoding|air-quality|waqi)/, '');
  const normalizedPath = pathAfterService.startsWith('/') ? pathAfterService : `/${pathAfterService}`;
  return `${baseUrl}${normalizedPath}${incomingSearch}`;
};

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) {
    sendJson(res, 400, { error: 'Invalid request' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Only GET is supported' });
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathSegments = requestUrl.pathname.split('/').filter(Boolean);
  const service = pathSegments[0];

  if (requestUrl.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      services: Object.keys(SERVICE_BASES),
    });
    return;
  }

  if (!service || !(service in SERVICE_BASES)) {
    sendJson(res, 404, {
      error: 'Unknown service. Use /routing, /geocoding, /air-quality, or /waqi.',
    });
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
        });
        return;
      }

      forwardSearch = `?${searchParams.toString()}`;
    }

    const targetUrl = buildForwardUrl(baseUrl, requestUrl.pathname, forwardSearch);
    const userAgent = service === 'geocoding' ? 'SafePath/1.0' : 'SafePathProxy/1.0';
    const { status, body } = await forwardRequest(targetUrl, userAgent);
    sendForwarded(res, status, body);
  } catch (error) {
    sendJson(res, 502, {
      error: 'Upstream request failed',
      detail: error instanceof Error ? error.message : 'Unknown proxy error',
    });
  }
});

server.listen(PORT, () => {
  console.log(`Safe Path proxy listening on http://localhost:${PORT}`);
});
