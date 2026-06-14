(function bootstrapRegistrationPage() {
  const config = window.FGN_CONFIG || {};
  const registration = config.registration || {};
  const form = document.querySelector("#registration-form");
  const statusNode = document.querySelector("#form-status");
  const submitButton = form ? form.querySelector('button[type="submit"]') : null;

  if (!form || !statusNode || !submitButton) {
    return;
  }

  const emailInput = form.querySelector("#email");
  const priceInput = form.querySelector("#steamMaxPriceVnd");
  const listInput = form.querySelector("#listName");

  if (registration.defaultListName && listInput) {
    listInput.value = registration.defaultListName;
  }

  function setStatus(variant, message) {
    statusNode.className = "form-status is-visible";
    statusNode.classList.add(`is-${variant}`);
    statusNode.innerHTML = message;
  }

  function clearStatus() {
    statusNode.className = "form-status";
    statusNode.textContent = "";
  }

  function setSubmitting(isSubmitting) {
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting
      ? "Sending registration..."
      : "Send my registration";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function createIssueUrl(payload) {
    const issueUrl = registration.githubIssueUrl;

    if (!issueUrl) {
      return "";
    }

    const body = [
      "Please add this subscriber to the notifier registry.",
      "",
      `- Email: ${payload.email}`,
      `- Steam price limit (VND): ${payload.steamMaxPriceVnd}`,
      `- List: ${payload.listName}`,
      `- Source: ${payload.source}`
    ].join("\n");

    const url = new URL(issueUrl);
    url.searchParams.set("title", `Subscriber request: ${payload.email}`);
    url.searchParams.set("body", body);
    return url.toString();
  }

  function createMailtoUrl(payload) {
    const fallbackEmail = registration.fallbackEmail;

    if (!fallbackEmail) {
      return "";
    }

    const subject = "Free Games Notifier registration request";
    const body = [
      "Please register me for Free Games Notifier.",
      "",
      `Email: ${payload.email}`,
      `Steam price limit (VND): ${payload.steamMaxPriceVnd}`,
      `List: ${payload.listName}`,
      `Source: ${payload.source}`
    ].join("\n");

    return `mailto:${encodeURIComponent(fallbackEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function getPayload() {
    const email = emailInput.value.trim();
    const steamMaxPriceVnd = Number(priceInput.value);
    const listName = listInput.value || registration.defaultListName || "daily-free-games";

    if (!email) {
      throw new Error("Please enter your email address.");
    }

    if (!emailInput.checkValidity()) {
      throw new Error("Please provide a valid email address.");
    }

    if (!Number.isFinite(steamMaxPriceVnd) || steamMaxPriceVnd <= 0) {
      throw new Error("Please enter a Steam price limit greater than 0 VND.");
    }

    return {
      email,
      steamMaxPriceVnd,
      listName,
      source: "github-pages"
    };
  }

  async function submitToEndpoint(payload) {
    if (!registration.endpoint) {
      return false;
    }

    const response = await fetch(registration.endpoint, {
      method: registration.method || "POST",
      headers: registration.headers || {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Registration endpoint returned ${response.status}.`);
    }

    return true;
  }

  function showFallback(payload, messagePrefix) {
    const issueUrl = createIssueUrl(payload);
    const mailtoUrl = createMailtoUrl(payload);
    const links = [];

    if (issueUrl) {
      links.push(
        `<a href="${escapeHtml(issueUrl)}" target="_blank" rel="noreferrer">open a prefilled GitHub issue</a>`
      );
    }

    if (mailtoUrl) {
      links.push(
        `<a href="${escapeHtml(mailtoUrl)}">open a prefilled email</a>`
      );
    }

    const fallbackCopy = links.length > 0
      ? `${messagePrefix} Meanwhile, you can ${links.join(" or ")}.`
      : `${messagePrefix} No fallback channel is configured yet.`;

    setStatus("warning", fallbackCopy);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus();

    let payload;

    try {
      payload = getPayload();
    } catch (error) {
      setStatus("error", escapeHtml(error.message));
      return;
    }

    setSubmitting(true);

    try {
      const didSubmit = await submitToEndpoint(payload);

      if (didSubmit) {
        form.reset();
        if (registration.defaultListName && listInput) {
          listInput.value = registration.defaultListName;
        }
        setStatus(
          "success",
          escapeHtml(
            registration.successMessage ||
              "Registration submitted successfully."
          )
        );
      } else {
        showFallback(
          payload,
          "No registration endpoint is configured for this GitHub Pages site."
        );
      }
    } catch (error) {
      showFallback(
        payload,
        `The registration endpoint could not be reached. ${escapeHtml(error.message)}`
      );
    } finally {
      setSubmitting(false);
    }
  });
})();
