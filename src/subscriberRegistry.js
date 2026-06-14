function normalizeRegistrationPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Registration payload is required");
  }

  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const listName =
    typeof payload.listName === "string" ? payload.listName.trim() : "";
  const steamMaxPriceVnd = Number(payload.steamMaxPriceVnd);

  if (!email) {
    throw new Error("Registration payload must include an email");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Registration email "${email}" is invalid`);
  }

  if (!listName) {
    throw new Error("Registration payload must include a listName");
  }

  if (!Number.isFinite(steamMaxPriceVnd) || steamMaxPriceVnd <= 0) {
    throw new Error("Registration payload must include a valid steamMaxPriceVnd");
  }

  return {
    email,
    listName,
    steamMaxPriceVnd,
  };
}

function upsertSubscriberInLists(lists, payload) {
  const normalizedPayload = normalizeRegistrationPayload(payload);

  if (!lists || typeof lists !== "object" || Array.isArray(lists)) {
    throw new Error("Email lists must be a plain object");
  }

  if (!Array.isArray(lists[normalizedPayload.listName])) {
    throw new Error(`Email list "${normalizedPayload.listName}" does not exist`);
  }

  const nextLists = JSON.parse(JSON.stringify(lists));
  const targetList = nextLists[normalizedPayload.listName];

  let changed = false;
  let action = "noop";

  const existingIndex = targetList.findIndex((entry) => {
    if (typeof entry === "string") {
      return entry.trim().toLowerCase() === normalizedPayload.email;
    }

    return (
      entry &&
      typeof entry === "object" &&
      typeof entry.email === "string" &&
      entry.email.trim().toLowerCase() === normalizedPayload.email
    );
  });

  const normalizedEntry = {
    email: normalizedPayload.email,
    steamMaxPriceVnd: normalizedPayload.steamMaxPriceVnd,
  };

  if (existingIndex === -1) {
    targetList.push(normalizedEntry);
    changed = true;
    action = "created";
  } else {
    const currentEntry = targetList[existingIndex];
    const currentNormalized =
      typeof currentEntry === "string"
        ? {
            email: currentEntry.trim().toLowerCase(),
            steamMaxPriceVnd: undefined,
          }
        : {
            email: currentEntry.email.trim().toLowerCase(),
            steamMaxPriceVnd: Number(currentEntry.steamMaxPriceVnd),
          };

    if (
      currentNormalized.email !== normalizedEntry.email ||
      currentNormalized.steamMaxPriceVnd !== normalizedEntry.steamMaxPriceVnd
    ) {
      targetList[existingIndex] = normalizedEntry;
      changed = true;
      action = "updated";
    }
  }

  return {
    changed,
    action,
    lists: nextLists,
    entry: normalizedEntry,
  };
}

module.exports = {
  normalizeRegistrationPayload,
  upsertSubscriberInLists,
};
