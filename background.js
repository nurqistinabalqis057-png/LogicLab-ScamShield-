const MENU_ID = "cyberninja-check-link";
let latestScan = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "🥷 Check with CyberNinja",
    contexts: ["link"]
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID || !info.linkUrl) return;
  latestScan = analyseUrl(info.linkUrl);
  chrome.storage.session.set({ latestScan });
  // Opens the extension popup as a new tab so the result is visible after right-click.
  chrome.tabs.create({ url: chrome.runtime.getURL("result.html") });
});

function analyseUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return {
        url: rawUrl,
        status: "Unable to check",
        risk: 0,
        reasons: ["Only HTTP and HTTPS links can be checked by this prototype."],
        advice: "Do not open unknown links if you are unsure of their source."
      };
    }
  } catch {
    return {
      url: rawUrl,
      status: "Invalid URL",
      risk: 0,
      reasons: ["The selected link could not be parsed as a valid URL."],
      advice: "Check the link source before opening it."
    };
  }

  const host = parsed.hostname.toLowerCase();
  const reasons = [];
  if (rawUrl.length > 75) reasons.push("The URL is unusually long.");
  if (rawUrl.includes("@")) reasons.push("The URL contains an @ symbol, which can sometimes disguise the destination.");
  if (/^(\\d{1,3}\\.){3}\\d{1,3}$/.test(host)) reasons.push("The hostname is an IP address rather than a typical domain name.");
  if ((host.match(/\\./g) || []).length >= 4) reasons.push("The hostname contains many dot-separated parts.");
  if (parsed.protocol !== "https:") reasons.push("The link does not use HTTPS.");
  if (/login|verify|secure|account|update|wallet|bank|password/i.test(rawUrl)) {
    reasons.push("The URL includes words often used in account or verification messages; these words alone do not prove a scam.");
  }

  const risk = Math.min(95, 10 + reasons.length * 17);
  const high = reasons.length >= 3;
  if (reasons.length === 0) {
    reasons.push("No warning signs from this small rule set were detected. This does not mean the link is safe.");
  }

  return {
    url: rawUrl,
    domain: host,
    protocol: parsed.protocol.replace(":", "").toUpperCase(),
    status: high ? "Potentially suspicious" : "Use caution",
    risk,
    reasons,
    advice: high
      ? "Avoid entering passwords or payment details. Verify the website through its official app or a trusted source."
      : "Do not rely on this result alone. Check the exact domain and visit the official website directly if unsure.",
    scannedAt: new Date().toISOString()
  };
}