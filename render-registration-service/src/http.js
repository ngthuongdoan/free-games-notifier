const { normalizeRegistrationPayload } = require("../../src/subscriberRegistry");

function createCorsHeaders(origin, allowedOrigin) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };

  if (!allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = "*";
  } else if (origin === allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }

  return headers;
}

function isOriginAllowed(origin, allowedOrigin) {
  if (!allowedOrigin) {
    return true;
  }

  return origin === allowedOrigin;
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw) {
    throw new Error("Request body is required");
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("Request body must be valid JSON");
  }
}

function jsonResponse(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function createRequestHandler({ config, dispatchRegistration }) {
  return async function handleRequest(request, response) {
    const origin = request.headers.origin || "";
    const corsHeaders = createCorsHeaders(origin, config.allowedOrigin);

    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders);
      response.end();
      return;
    }

    if (request.method === "GET" && request.url === "/healthz") {
      jsonResponse(
        response,
        200,
        {
          ok: true,
          service: "render-registration-service",
        },
        corsHeaders
      );
      return;
    }

    if (request.method !== "POST" || request.url !== "/register") {
      jsonResponse(
        response,
        404,
        {
          error: "Not found",
        },
        corsHeaders
      );
      return;
    }

    if (!isOriginAllowed(origin, config.allowedOrigin)) {
      jsonResponse(
        response,
        403,
        {
          error: "Origin is not allowed",
        },
        corsHeaders
      );
      return;
    }

    try {
      const payload = await readJsonBody(request);
      const registration = normalizeRegistrationPayload(payload);

      await dispatchRegistration({
        ...registration,
        source:
          typeof payload.source === "string" && payload.source.trim() !== ""
            ? payload.source.trim()
            : "github-pages",
      });

      jsonResponse(
        response,
        202,
        {
          ok: true,
          message: "Registration request accepted. A repository_dispatch event was sent.",
        },
        corsHeaders
      );
    } catch (error) {
      const statusCode =
        error.message === "Origin is not allowed"
          ? 403
          : error.message.startsWith("Request body") ||
              error.message.startsWith("Registration payload")
            ? 400
            : 502;

      jsonResponse(
        response,
        statusCode,
        {
          error: error.message,
        },
        corsHeaders
      );
    }
  };
}

module.exports = {
  createRequestHandler,
};
