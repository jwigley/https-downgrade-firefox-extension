function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

async function loadDomains() {
  const { domains = [] } = await browser.storage.sync.get("domains");

  const statuses = await Promise.all(
    domains.map(async d => {
      const granted = await browser.permissions.contains({
        origins: [`https://*.${d}/*`]
      });
      return { domain: d, granted };
    })
  );

  const list = document.getElementById("list");
  const empty = document.getElementById("empty");
  const hint = document.getElementById("hint");
  const hasRevoked = statuses.some(s => !s.granted);

  empty.style.display = statuses.length === 0 ? "block" : "none";
  hint.style.display = hasRevoked ? "block" : "none";

  list.innerHTML = statuses.map(({ domain, granted }) => `
    <li class="domain-item">
      <span class="domain-name">
        <span class="domain-prefix">*.</span>${domain}
      </span>
      ${granted
        ? `<span class="badge badge-ok">Active</span>`
        : `<span class="badge badge-warn">Revoked</span>
           <button class="btn btn-ghost" style="height:28px;padding:0 10px;font-size:12px" data-regrant="${domain}">Re-grant</button>`
      }
      <button class="btn btn-danger-ghost" data-d="${domain}" title="Remove" style="height:28px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </li>
  `).join("");

  list.querySelectorAll("button[data-d]").forEach(btn => {
    btn.onclick = () => removeDomain(btn.dataset.d);
  });

  list.querySelectorAll("button[data-regrant]").forEach(btn => {
    btn.onclick = async () => {
      const granted = await browser.permissions.request({
        origins: [`https://*.${btn.dataset.regrant}/*`]
      });
      if (granted) {
        const { domains = [] } = await browser.storage.sync.get("domains");
        browser.runtime.sendMessage({ type: "update", domains });
        showToast("Permission restored");
      }
      loadDomains();
    };
  });
}

async function removeDomain(domain) {
  const { domains = [] } = await browser.storage.sync.get("domains");
  const updated = domains.filter(d => d !== domain);
  await browser.storage.sync.set({ domains: updated });

  await browser.permissions.remove({
    origins: [`https://*.${domain}/*`]
  });

  browser.runtime.sendMessage({ type: "update", domains: updated });
  showToast(`Removed ${domain}`);
  loadDomains();
}

document.getElementById("save").onclick = async () => {
  const input = document.getElementById("input").value.trim().toLowerCase();

  if (!input || !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(input)) {
    showToast("Enter a valid suffix e.g. lan or local");
    return;
  }

  const granted = await browser.permissions.request({
    origins: [`https://*.${input}/*`]
  });

  if (!granted) {
    showToast("Permission denied");
    return;
  }

  const { domains = [] } = await browser.storage.sync.get("domains");
  const updated = [...new Set([...domains, input])];
  await browser.storage.sync.set({ domains: updated });
  browser.runtime.sendMessage({ type: "update", domains: updated });
  document.getElementById("input").value = "";
  showToast(`Added ${input}`);
  loadDomains();
};

document.getElementById("input").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("save").click();
});

loadDomains();
