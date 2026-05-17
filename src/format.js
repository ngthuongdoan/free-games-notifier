function formatVnd(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unknown";
  return `${value.toLocaleString("vi-VN")}₫`;
}

function formatDate(value) {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPrice(game) {
  if (game.store === "Epic Games Store") {
    return `${game.originalPrice || "Unknown"} → ${game.discountPrice || "Free"}`;
  }

  if (game.kind === "free") {
    return `${formatVnd(game.originalPrice)} → Free`;
  }

  return `${formatVnd(game.originalPrice)} → ${formatVnd(game.discountPrice)}`;
}

module.exports = {
  formatVnd,
  formatDate,
  formatPrice,
};
