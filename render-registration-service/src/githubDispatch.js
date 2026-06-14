async function dispatchRegistrationToGitHub(config, payload) {
  const url = `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/dispatches`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.githubToken}`,
      "Content-Type": "application/json",
      "User-Agent": "free-games-notifier-render-registration-service",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      event_type: config.githubEventType,
      client_payload: payload,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub repository_dispatch failed with ${response.status}: ${errorText}`
    );
  }
}

module.exports = {
  dispatchRegistrationToGitHub,
};
