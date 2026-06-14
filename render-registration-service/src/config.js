function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function getConfig() {
  return {
    port: Number(process.env.PORT || 10000),
    githubToken: getRequiredEnv("GITHUB_TOKEN"),
    githubOwner: getRequiredEnv("GITHUB_OWNER"),
    githubRepo: getRequiredEnv("GITHUB_REPO"),
    githubEventType: (process.env.GITHUB_EVENT_TYPE || "register-subscriber").trim(),
    allowedOrigin: (process.env.ALLOWED_ORIGIN || "").trim(),
  };
}

module.exports = {
  getConfig,
};
