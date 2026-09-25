(() => {
  "use strict";

  const STORAGE_KEY = "fangcun-ledger-v1";
  const BANKS = ["中国工商银行", "中国建设银行", "中国银行", "中国农业银行", "交通银行", "中国邮政储蓄银行", "招商银行", "浦发银行", "中信银行", "中国民生银行", "兴业银行", "中国光大银行", "广发银行", "平安银行", "华夏银行", "宁波银行", "北京银行", "上海银行", "其他银行 / 机构"];
  const TYPE_META = {
    bank: { label: "银行账户", short: "银", kind: "asset", icon: "bank" },
    wealth: { label: "理财账户", short: "财", kind: "asset", icon: "wealth" },
    cash: { label: "现金", short: "现", kind: "asset", icon: "cash" },
    investment: { label: "理财产品", short: "理", kind: "investment", icon: "investment" },
    credit: { label: "信用卡", short: "卡", kind: "liability", icon: "credit" },
    other: { label: "其他资产", short: "他", kind: "asset", icon: "other" }
  };
  const palette = { bank: "#557d95", wealth: "#6f8d80", cash: "#68a88c", investment: "#c69a42", other: "#9a7e6b", credit: "#d4513f" };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const today = () => new Date().toISOString().slice(0, 10);
  const dateLabel = date => new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`));
  const money = value => {
    const amount = Number(value || 0);
    if (state.privacy) return "••••••";
    return `${amount < 0 ? "-" : ""}¥${Math.abs(amount).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const compactMoney = value => {
    if (state.privacy) return "••••";
    const amount = Number(value || 0);
    if (Math.abs(amount) >= 10000) return `${amount < 0 ? "-" : ""}¥${(Math.abs(amount) / 10000).toFixed(1)}万`;
    return money(amount);
  };
  const uid = () => `a_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const clone = value => JSON.parse(JSON.stringify(value));
  const baseDate = new Date();
  const iso = daysAgo => { const date = new Date(baseDate); date.setDate(date.getDate() - daysAgo); return date.toISOString().slice(0, 10); };

  const demoAccounts = [
    { id: "demo-bank", type: "bank", name: "日常储蓄卡", institution: "招商银行", amount: 42860.31, note: "工资与日常开销", updatedAt: iso(0), history: [{ date: iso(30), amount: 37200 }, { date: iso(20), amount: 40100 }, { date: iso(10), amount: 41780 }, { date: iso(0), amount: 42860.31 }] },
    { id: "demo-invest", type: "investment", name: "稳健理财组合", institution: "南方基金", amount: 86340.22, note: "每日记录净值", category: "基金", updatedAt: iso(0), history: [{ date: iso(30), amount: 82450 }, { date: iso(20), amount: 84100 }, { date: iso(10), amount: 85820 }, { date: iso(0), amount: 86340.22 }] },
    { id: "demo-cash", type: "cash", name: "随身现金", institution: "", amount: 1200, note: "", updatedAt: iso(3), history: [{ date: iso(30), amount: 1800 }, { date: iso(20), amount: 1400 }, { date: iso(10), amount: 1200 }, { date: iso(3), amount: 1200 }] },
    { id: "demo-credit", type: "credit", name: "生活信用卡", institution: "中国建设银行", amount: 2830.66, note: "本期待还", updatedAt: iso(0), history: [{ date: iso(30), amount: 1830 }, { date: iso(20), amount: 3310 }, { date: iso(10), amount: 2200 }, { date: iso(0), amount: 2830.66 }] }
  ];

  let state = loadState();
  let activeFilter = "all";
  let trendPeriod = 30;
  let selectedType = "bank";
  let toastTimer;

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && Array.isArray(parsed.accounts)) return { accounts: parsed.accounts, privacy: Boolean(parsed.privacy) };
    } catch (error) { console.warn("Unable to load local data", error); }
    return { accounts: [], privacy: false };
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function accountKind(account) { return TYPE_META[account.type]?.kind || "asset"; }
  function assetTotal() { return state.accounts.filter(account => accountKind(account) !== "liability").reduce((sum, account) => sum + Number(account.amount || 0), 0); }
  function liabilityTotal() { return state.accounts.filter(account => accountKind(account) === "liability").reduce((sum, account) => sum + Number(account.amount || 0), 0); }
  function netWorth() { return assetTotal() - liabilityTotal(); }
  function sortedAccounts() { return [...state.accounts].sort((a, b) => Number(b.amount) - Number(a.amount)); }
  function historyPoints(days = 30) {
    const dates = [];
    for (let i = days - 1; i >= 0; i -= 1) dates.push(iso(i));
    return dates.map(date => {
      let assets = 0; let liabilities = 0;
      state.accounts.forEach(account => {
        const entries = [...(account.history || []), { date: account.updatedAt || today(), amount: account.amount }].filter(item => item.date <= date).sort((a, b) => a.date.localeCompare(b.date));
        const latest = entries.at(-1);
        if (!latest) return;
        if (accountKind(account) === "liability") liabilities += Number(latest.amount || 0); else assets += Number(latest.amount || 0);
      });
      return { date, assets, liabilities, net: assets - liabilities };
    });
  }
  function currentChange() {
    const points = historyPoints(2);
    return points[1].net - points[0].net;
  }

  function render() {
    renderHome(); renderAssets(); renderTrends(); renderPrivacy(); updateHeader();
  }
  function updateHeader() {
    const active = $(".screen.active")?.dataset.screenLabel || "总览";
    $("#page-title").textContent = active === "总览" ? "方寸账本" : active;
    const now = new Date();
    $("#today-label").textContent = new Intl.DateTimeFormat("zh-CN", { weekday: "long", month: "long", day: "numeric" }).format(now);
  }
  function renderHome() {
    $("#net-worth").textContent = money(netWorth());
    $("#total-assets").textContent = compactMoney(assetTotal());
    $("#total-liabilities").textContent = compactMoney(liabilityTotal());
    const change = currentChange();
    $("#net-delta").textContent = change === 0 ? "较昨日暂无变化" : `${change > 0 ? "↑" : "↓"} ${money(Math.abs(change))} 较昨日`;
    drawChart($("#hero-chart"), historyPoints(30), { series: ["net"], compact: true });
    const totals = {};
    state.accounts.forEach(account => { totals[account.type] = (totals[account.type] || 0) + Number(account.amount || 0); });
    const total = Object.entries(totals).filter(([type]) => type !== "credit").reduce((sum, [, value]) => sum + value, 0);
    $("#allocation").innerHTML = total ? `<div class="allocation-bar">${Object.entries(totals).filter(([type]) => type !== "credit").map(([type, value]) => `<span style="width:${Math.max(value / total * 100, 1)}%;background:${palette[type] || palette.other}"></span>`).join("")}</div><div class="allocation-legend">${Object.entries(totals).filter(([type]) => type !== "credit").map(([type, value]) => `<div class="allocation-item"><i style="background:${palette[type] || palette.other}"></i><span>${TYPE_META[type]?.label || "其他"}</span><strong>${state.privacy ? "••••" : `${Math.round(value / total * 100)}%`}</strong></div>`).join("")}</div>` : emptyState("还没有资产分布", "添加账户后，这里会显示你的资产构成。", "添加第一笔");
    const accounts = sortedAccounts().slice(0, 4);
    $("#account-count").textContent = state.accounts.length ? `${state.accounts.length} 个账户` : "开始记录";
    $("#recent-accounts").innerHTML = accounts.length ? accounts.map(accountCard).join("") : emptyState("从一笔账户开始", "银行账户、现金、信用卡和理财，都可以放进同一本账。", "添加第一笔");
    wireAccountCards($("#recent-accounts"));
  }
  function renderAssets() {
    const filtered = sortedAccounts().filter(account => activeFilter === "all" || accountKind(account) === activeFilter || (activeFilter === "investment" && account.type === "investment"));
    $("#assets-summary").innerHTML = `<span>${filtered.length} 个账户</span><strong>${compactMoney(filtered.filter(a => accountKind(a) !== "liability").reduce((sum, a) => sum + Number(a.amount || 0), 0))} 资产</strong>`;
    $("#all-accounts").innerHTML = filtered.length ? filtered.map(accountCard).join("") : emptyState("这里还没有账户", "试试切换分类，或者添加一笔新的记录。", "添加账户");
    wireAccountCards($("#all-accounts"));
    $$("[data-filter]").forEach(button => button.classList.toggle("active", button.dataset.filter === activeFilter));
  }
  function renderTrends() {
    const points = historyPoints(trendPeriod);
    $("#trend-value").textContent = money(netWorth());
    drawChart($("#trend-chart"), points, { series: ["net", "assets"] });
    const products = state.accounts.filter(account => account.type === "investment");
    $("#product-trends").innerHTML = products.length ? products.map(product => `<div class="product-trend-card"><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category || "理财产品")} · ${escapeHtml(product.institution || "自行记录")}</small></div><canvas data-product-chart="${product.id}" aria-label="${escapeHtml(product.name)}趋势"></canvas></div>`).join("") : emptyState("还没有理财产品", "添加一个理财产品，就可以每日记录金额并查看走势。", "添加理财产品");
    products.forEach(product => drawChart($(`[data-product-chart="${product.id}"]`), productHistory(product, trendPeriod), { series: ["amount"], product: true }));
    $$("[data-period]").forEach(button => button.classList.toggle("active", Number(button.dataset.period) === trendPeriod));
  }
  function productHistory(product, days) {
    const dates = []; for (let i = days - 1; i >= 0; i -= 1) dates.push(iso(i));
    return dates.map(date => { const entries = [...(product.history || []), { date: product.updatedAt || today(), amount: product.amount }].filter(item => item.date <= date).sort((a, b) => a.date.localeCompare(b.date)); return { date, amount: entries.at(-1)?.amount || 0 }; });
  }
  function renderPrivacy() {
    $$(".money").forEach(element => element.classList.toggle("hidden-money", state.privacy));
    $("#privacy-toggle").setAttribute("title", state.privacy ? "显示金额" : "隐藏金额");
    $("#privacy-toggle").innerHTML = state.privacy ? '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"></path><path d="M9.9 5.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17.5 17.5 0 0 1-3.1 3.8M6.1 6.2C3.4 8.1 2 12 2 12s3.5 7 10 7c1.3 0 2.5-.3 3.6-.7"></path></svg>' : '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>';
  }
  function accountCard(account) {
    const meta = TYPE_META[account.type] || TYPE_META.other;
    const isLiability = accountKind(account) === "liability";
    const details = [meta.label, account.institution].filter(Boolean).join(" · ");
    return `<article class="account-card" data-account-id="${account.id}"><div class="account-icon ${account.type === "credit" ? "credit" : account.type === "investment" ? "investment" : ""}">${meta.short}</div><div class="account-copy"><strong>${escapeHtml(account.name)}</strong><small>${escapeHtml(details)}${account.note ? ` · ${escapeHtml(account.note)}` : ""}</small></div><div class="account-value"><strong class="${isLiability ? "debt" : ""}">${isLiability ? "-" : ""}${money(account.amount)}</strong><small>${account.updatedAt ? dateLabel(account.updatedAt) : "未记录"}</small>${account.type === "investment" ? `<button class="update-mini" data-update-id="${account.id}">记一笔</button>` : ""}</div></article>`;
  }
  function emptyState(title, description, action) { return `<div class="empty-state"><strong>${title}</strong><p>${description}</p><button data-empty-add="${action}">${action}</button></div>`; }
  function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

  function drawChart(canvas, points, options = {}) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; const width = Math.max(1, rect.width); const height = Math.max(1, rect.height);
    canvas.width = width * dpr; canvas.height = height * dpr; const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height);
    const keys = options.series || ["net"]; const values = points.flatMap(point => keys.map(key => Number(point[key] || 0))); const max = Math.max(...values, 1); const min = Math.min(...values, 0); const range = max - min || 1;
    const pad = options.product ? 6 : options.compact ? 4 : 15; const x = index => pad + (width - pad * 2) * (index / Math.max(points.length - 1, 1)); const y = value => height - pad - (height - pad * 2) * ((value - min) / range);
    if (!options.compact) { ctx.strokeStyle = "#e5eae6"; ctx.lineWidth = 1; for (let i = 1; i < 4; i += 1) { ctx.beginPath(); ctx.moveTo(pad, (height / 4) * i); ctx.lineTo(width - pad, (height / 4) * i); ctx.stroke(); } }
    const colors = { net: "#173f35", assets: "#c69a42", amount: "#557d95" };
    keys.forEach(key => { ctx.beginPath(); points.forEach((point, index) => { const px = x(index); const py = y(Number(point[key] || 0)); if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }); ctx.strokeStyle = colors[key] || "#173f35"; ctx.lineWidth = options.product ? 2 : options.compact ? 2.4 : 2; ctx.lineJoin = "round"; ctx.stroke(); if (options.compact && key === "net") { const last = points.at(-1); ctx.fillStyle = colors[key]; ctx.beginPath(); ctx.arc(x(points.length - 1), y(last.net), 3.5, 0, Math.PI * 2); ctx.fill(); } });
  }

  function wireAccountCards(container) {
    container.querySelectorAll("[data-account-id]").forEach(card => card.addEventListener("click", event => { if (event.target.closest("[data-update-id]")) return; openEditor(card.dataset.accountId); }));
    container.querySelectorAll("[data-update-id]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); openUpdate(button.dataset.updateId); }));
    container.querySelectorAll("[data-empty-add]").forEach(button => button.addEventListener("click", () => openEditor()));
  }
  function openEditor(id = null) {
    const account = id ? state.accounts.find(item => item.id === id) : null;
    $("#editor-kicker").textContent = account ? "编辑账户" : "新建记录"; $("#editor-title").textContent = account ? "编辑账户" : "添加账户"; $("#edit-id").value = account?.id || ""; selectedType = account?.type || "bank";
    $("#account-name").value = account?.name || ""; $("#account-amount").value = account?.amount ?? ""; $("#account-note").value = account?.note || ""; $("#product-category").value = account?.category || "基金"; $("#delete-account").hidden = !account; $("#form-error").textContent = ""; renderTypeOptions(); updateEditorFields(); $("#institution").value = account?.institution || BANKS[0]; showSheet("editor-sheet");
  }
  function renderTypeOptions() {
    const icons = {
      bank: '<path d="m3 9 9-5 9 5M5 10h14M6 10v7m4-7v7m4-7v7m4-7v7M4 20h16"></path>',
      wealth: '<path d="M4 19V9m5 10V5m5 14v-7m5 7V3"></path>',
      cash: '<rect x="3" y="6" width="18" height="12" rx="2"></rect><path d="M7 10h4m-4 4h7m4-2h.01"></path>',
      investment: '<path d="M4 18 9 11l4 3 7-9"></path><path d="M16 5h4v4"></path>',
      credit: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18M7 15h4"></path>',
      other: '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v8M8 12h8"></path>'
    };
    $("#type-options").innerHTML = Object.entries(TYPE_META).map(([type, meta]) => `<button type="button" class="type-option ${selectedType === type ? "active" : ""}" data-type="${type}"><svg viewBox="0 0 24 24">${icons[type]}</svg>${meta.label}</button>`).join("");
    $$("[data-type]").forEach(button => button.addEventListener("click", () => { selectedType = button.dataset.type; renderTypeOptions(); updateEditorFields(); }));
  }
  function updateEditorFields() {
    $("#institution-field").hidden = selectedType === "cash" || selectedType === "other";
    $("#category-field").hidden = selectedType !== "investment";
    $("#amount-label").textContent = selectedType === "credit" ? "当前待还" : selectedType === "investment" ? "当前净值" : "当前余额";
    const select = $("#institution"); select.innerHTML = BANKS.map(bank => `<option value="${bank}">${bank}</option>`).join("");
  }
  function openUpdate(id) { const account = state.accounts.find(item => item.id === id); if (!account) return; $("#update-id").value = id; $("#update-title").textContent = account.name; $("#update-date").value = today(); $("#update-amount").value = account.amount; showSheet("update-sheet"); }
  function showSheet(id) { $("#sheet-backdrop").hidden = false; $("#editor-sheet").hidden = id !== "editor-sheet"; $("#update-sheet").hidden = id !== "update-sheet"; document.body.style.overflow = "hidden"; }
  function closeSheets() { $("#sheet-backdrop").hidden = true; $("#editor-sheet").hidden = true; $("#update-sheet").hidden = true; document.body.style.overflow = ""; }
  function openConfirm(title, message, callback) { $("#confirm-title").textContent = title; $("#confirm-message").textContent = message; $("#confirm-dialog").hidden = false; $("#confirm-ok").onclick = () => { $("#confirm-dialog").hidden = true; callback(); }; $("#confirm-cancel").onclick = () => { $("#confirm-dialog").hidden = true; }; }
  function notify(message) { clearTimeout(toastTimer); $("#toast").textContent = message; $("#toast").classList.add("show"); toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2400); }

  function bindEvents() {
    $$(".bottom-nav button").forEach(button => button.addEventListener("click", () => navigate(button.dataset.target)));
    $$('[data-nav="assets"]').forEach(button => button.addEventListener("click", () => navigate("assets")));
    $("#add-button").addEventListener("click", () => openEditor());
    $("#privacy-toggle").addEventListener("click", () => { state.privacy = !state.privacy; saveState(); render(); });
    $("#sheet-backdrop").addEventListener("click", closeSheets); $$('[data-close-sheet]').forEach(button => button.addEventListener("click", closeSheets));
    $("#account-form").addEventListener("submit", saveAccount); $("#update-form").addEventListener("submit", saveUpdate);
    $("#delete-account").addEventListener("click", () => { const id = $("#edit-id").value; openConfirm("删除这笔记录？", "删除后无法恢复，但不会影响其他账户。", () => { state.accounts = state.accounts.filter(account => account.id !== id); saveState(); closeSheets(); render(); notify("记录已删除"); }); });
    $$("[data-filter]").forEach(button => button.addEventListener("click", () => { activeFilter = button.dataset.filter; renderAssets(); }));
    $$("[data-period]").forEach(button => button.addEventListener("click", () => { trendPeriod = Number(button.dataset.period); renderTrends(); }));
    $("#export-data").addEventListener("click", exportData); $("#import-data").addEventListener("change", importData);
    $("#load-demo").addEventListener("click", () => { state.accounts = clone(demoAccounts); saveState(); render(); notify("示例数据已载入"); });
    $("#clear-data").addEventListener("click", () => openConfirm("清空全部数据？", "账户、历史金额和趋势记录都会被删除。此操作无法撤销。", () => { state.accounts = []; saveState(); render(); notify("数据已清空"); }));
    window.addEventListener("resize", () => { if ($("#screen-home").classList.contains("active")) renderHome(); if ($("#screen-trends").classList.contains("active")) renderTrends(); });
  }
  function navigate(target) { $$(".screen").forEach(screen => screen.classList.toggle("active", screen.id === `screen-${target}`)); $$(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.target === target)); updateHeader(); if (target === "home") renderHome(); if (target === "assets") renderAssets(); if (target === "trends") renderTrends(); }
  function saveAccount(event) {
    event.preventDefault(); const name = $("#account-name").value.trim(); const amount = Number($("#account-amount").value); if (!name || Number.isNaN(amount) || amount < 0) { $("#form-error").textContent = "请填写名称和有效金额。"; return; }
    const id = $("#edit-id").value; const existing = state.accounts.find(account => account.id === id); const account = existing || { id: uid(), history: [] }; const previous = existing ? Number(existing.amount) : null;
    Object.assign(account, { type: selectedType, name, institution: $("#institution").value, amount, note: $("#account-note").value.trim(), category: $("#product-category").value, updatedAt: today() });
    if (!existing || previous !== amount) account.history = [...(account.history || []).filter(item => item.date !== today()), { date: today(), amount }];
    if (existing) state.accounts = state.accounts.map(item => item.id === id ? account : item); else state.accounts.push(account); saveState(); closeSheets(); render(); notify(existing ? "账户已更新" : "账户已添加");
  }
  function saveUpdate(event) {
    event.preventDefault(); const id = $("#update-id").value; const account = state.accounts.find(item => item.id === id); if (!account) return; const date = $("#update-date").value; const amount = Number($("#update-amount").value); if (!date || Number.isNaN(amount) || amount < 0) return;
    account.amount = amount; account.updatedAt = date; account.history = [...(account.history || []).filter(item => item.date !== date), { date, amount }].sort((a, b) => a.date.localeCompare(b.date)); saveState(); closeSheets(); render(); notify("每日金额已记录");
  }
  function exportData() { const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), accounts: state.accounts }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `方寸账本备份-${today()}.json`; link.click(); URL.revokeObjectURL(url); notify("备份文件已下载"); }
  function importData(event) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const imported = JSON.parse(reader.result); if (!Array.isArray(imported.accounts)) throw new Error("invalid"); state.accounts = imported.accounts; saveState(); render(); notify("备份已恢复"); } catch (error) { notify("文件格式不正确"); } event.target.value = ""; }; reader.readAsText(file); }

  renderTypeOptions(); updateEditorFields(); bindEvents(); render();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
})();
