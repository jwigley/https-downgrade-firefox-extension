function redirectHandler(details) {
  console.log("Redirecting:", details.url);
  return { redirectUrl: details.url.replace("https://", "http://") };
}

async function registerListeners(domains) {
  if (browser.webRequest.onBeforeRequest.hasListener(redirectHandler)) {
    browser.webRequest.onBeforeRequest.removeListener(redirectHandler);
  }

  if (domains.length === 0) return;

  const urls = domains.map(d => `https://*.${d}/*`);

  browser.webRequest.onBeforeRequest.addListener(
    redirectHandler,
    { urls },
    ["blocking"]
  );
}

browser.runtime.onMessage.addListener(({ type, domains }) => {
  if (type === "update") registerListeners(domains);
});

// Load saved domains on startup
browser.storage.sync.get("domains").then(({ domains }) => {
  if (domains && domains.length > 0) registerListeners(domains);
});

browser.runtime.onInstalled.addListener(() => {
  browser.runtime.openOptionsPage();
});

browser.action.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});

browser.action.enable();
