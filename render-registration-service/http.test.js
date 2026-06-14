const test = require("node:test");
const assert = require("node:assert/strict");

const { createRequestHandler } = require("./src/http");

function createMockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body = "") {
      this.body = body;
    },
  };
}

function createRequest({ method, url, origin, body }) {
  return {
    method,
    url,
    headers: {
      origin,
    },
    async *[Symbol.asyncIterator]() {
      if (body !== undefined) {
        yield Buffer.from(body);
      }
    },
  };
}

test("registration endpoint accepts valid payload and dispatches it", async () => {
  let dispatchedPayload = null;
  const handler = createRequestHandler({
    config: {
      allowedOrigin: "https://example.com",
    },
    dispatchRegistration: async (payload) => {
      dispatchedPayload = payload;
    },
  });

  const response = createMockResponse();
  await handler(
    createRequest({
      method: "POST",
      url: "/register",
      origin: "https://example.com",
      body: JSON.stringify({
        email: "Player@example.com",
        steamMaxPriceVnd: 200000,
        listName: "daily-free-games",
      }),
    }),
    response
  );

  assert.equal(response.statusCode, 202);
  assert.deepEqual(dispatchedPayload, {
    email: "player@example.com",
    steamMaxPriceVnd: 200000,
    listName: "daily-free-games",
    source: "github-pages",
  });
});

test("registration endpoint rejects disallowed origins", async () => {
  const handler = createRequestHandler({
    config: {
      allowedOrigin: "https://example.com",
    },
    dispatchRegistration: async () => {},
  });

  const response = createMockResponse();
  await handler(
    createRequest({
      method: "POST",
      url: "/register",
      origin: "https://evil.example",
      body: JSON.stringify({
        email: "player@example.com",
        steamMaxPriceVnd: 200000,
        listName: "daily-free-games",
      }),
    }),
    response
  );

  assert.equal(response.statusCode, 403);
});

test("health endpoint returns ok", async () => {
  const handler = createRequestHandler({
    config: {
      allowedOrigin: "",
    },
    dispatchRegistration: async () => {},
  });

  const response = createMockResponse();
  await handler(
    createRequest({
      method: "GET",
      url: "/healthz",
      origin: "",
    }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.match(response.body, /"ok":true/);
});
