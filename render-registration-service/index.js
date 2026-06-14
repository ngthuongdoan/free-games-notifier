const http = require("http");

const { getConfig } = require("./src/config");
const { dispatchRegistrationToGitHub } = require("./src/githubDispatch");
const { createRequestHandler } = require("./src/http");

const config = getConfig();
const handler = createRequestHandler({
  config,
  dispatchRegistration: (payload) =>
    dispatchRegistrationToGitHub(config, payload),
});

const server = http.createServer((request, response) => {
  handler(request, response).catch((error) => {
    console.error(error);
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(
      JSON.stringify({
        error: "Internal server error",
      })
    );
  });
});

server.listen(config.port, "0.0.0.0", () => {
  console.log(
    `Render registration service listening on http://0.0.0.0:${config.port}`
  );
});
