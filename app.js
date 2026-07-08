// ============================================================
//  ÖN YÜZ — Katalog eşleştirme, çok kanallı kampanya, i18n, dark mode
// ============================================================
const $ = id => document.getElementById(id);
const T = () => translations[currentLang];
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));

let catalog = [];
let imgFile = null;
let previewDataUrl = null;
let currentLang = localStorage.getItem("lang") || "tr";
let lastResult = null;
let campaignData = {};
let activeChannel = "instagram";

// ---------------- i18n ----------------
const translations = {
  tr: {
    tagline: "Görselden ürün önerisi & çok kanallı kampanya metni",
    customerInput: "Müşteri Girdisi",
    dropText: "Kıyafet / kombin görselini sürükle<br><small>veya tıklayıp seç</small>",
    samplesLabel: "veya bir örnekle dene",
    styleLabel: "Stil Tercihi", budgetLabel: "Bütçe", toneLabel: "İçerik Tonu", audienceLabel: "Hedef Kitle", occasionLabel: "Durum / Ortam",
    optAny: "Fark etmez", optDefault: "Varsayılan", optGeneral: "Genel",
    tonePlayful: "Enerjik & Eğlenceli", toneLuxury: "Lüks & Şık", toneMinimal: "Minimal & Sade",
    audYouth: "Gençler", audPro: "Profesyoneller", audFamily: "Aileler", audStudent: "Öğrenciler",
    occDaily: "Günlük", occWork: "İş / Ofis", occParty: "Parti / Gece", occEvent: "Özel Davet", occSport: "Spor", occHoliday: "Tatil",
    btnAnalyze: "Analiz Et & Kampanya Oluştur",
    catalogLoading: "Katalog yükleniyor…", catalogReady: "Katalog hazır: {len} ürün", catalogFail: "Katalog yüklenemedi — sunucu çalışıyor mu?",
    ethicsTitle: "🛡️ Etik & Güvenlik",
    ethics1: "Yalnızca kıyafetler analiz edilir; kişinin bedeni/fiziği hakkında yorum yapılmaz.",
    ethics2: "Sadece katalogdaki ürünler ve fiyatlar kullanılır — bilgi uydurulmaz.",
    ethics3: "Cinsiyet, yaş veya vücut tipi üzerinden ayrımcı dil kullanılmaz.",
    priceNote: "* Fiyatlar prototip amaçlı temsilîdir.",
    step1: "Görsel", step2: "Analiz", step3: "Eşleştirme", step4: "Kombin", step5: "Kampanya",
    regen: "Yeniden Oluştur",
    aiThinking: "Yapay zeka görseli yorumluyor ve kombinleri eşleştiriyor…",
    emptyHint: "Bir görsel yükle ya da örnek seç — analiz, kombin ve kampanya metni burada belirecek.",
    titleAnalysis: "Görsel Analizi", reasoningLabel: "AI adım adım düşünme (chain-of-thought)",
    titleProducts: "Eşleşen LC Waikiki Ürünleri",
    titleOutfit: "Önerilen Kombin", total: "Toplam",
    titleCampaign: "Çok Kanallı Kampanya İçeriği", chEmail: "✉️ E-posta", chEmailFull: "E-posta",
    noMatch: "Eşleşme bulunamadı.", copy: "Kopyala", copied: "Kopyalandı ✓", subject: "Konu",
    within: "Bütçe içinde ✓", over: "Bütçe aşıldı",
    invalidImage: "Görselde giyim ürünü algılanamadı. Lütfen bir kıyafet/kombin görseli yükle."
  },
  en: {
    tagline: "Product recommendation & multi-channel campaign copy from an image",
    customerInput: "Customer Input",
    dropText: "Drag & drop an outfit image<br><small>or click to browse</small>",
    samplesLabel: "or try a sample",
    styleLabel: "Style Preference", budgetLabel: "Budget", toneLabel: "Content Tone", audienceLabel: "Target Audience", occasionLabel: "Occasion",
    optAny: "Any", optDefault: "Default", optGeneral: "General",
    tonePlayful: "Playful & Fun", toneLuxury: "Luxury & Chic", toneMinimal: "Minimal & Clean",
    audYouth: "Youth", audPro: "Professionals", audFamily: "Families", audStudent: "Students",
    occDaily: "Everyday", occWork: "Work / Office", occParty: "Party / Night", occEvent: "Special Event", occSport: "Sport", occHoliday: "Holiday",
    btnAnalyze: "Analyze & Create Campaign",
    catalogLoading: "Loading catalog…", catalogReady: "Catalog ready: {len} products", catalogFail: "Catalog load failed — is the server running?",
    ethicsTitle: "🛡️ Ethics & Safety",
    ethics1: "Only clothing is analyzed; no comments on the person's body or physique.",
    ethics2: "Only catalog products and prices are used — nothing is fabricated.",
    ethics3: "No language that discriminates by gender, age, or body type.",
    priceNote: "* Prices are indicative, for prototype purposes.",
    step1: "Image", step2: "Analysis", step3: "Matching", step4: "Outfit", step5: "Campaign",
    regen: "Regenerate",
    aiThinking: "AI is interpreting the image and matching products…",
    emptyHint: "Upload an image or pick a sample — the analysis, outfit, and campaign copy will appear here.",
    titleAnalysis: "Image Analysis", reasoningLabel: "AI step-by-step reasoning (chain-of-thought)",
    titleProducts: "Matched LC Waikiki Products",
    titleOutfit: "Suggested Outfit", total: "Total",
    titleCampaign: "Multi-Channel Campaign Copy", chEmail: "✉️ Email", chEmailFull: "Email",
    noMatch: "No matches found.", copy: "Copy", copied: "Copied ✓", subject: "Subject",
    within: "Within budget ✓", over: "Over budget",
    invalidImage: "No clothing detected in the image. Please upload an outfit/garment photo."
  }
};

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const v = translations[lang][el.getAttribute("data-i18n")];
    if (v == null) return;
    if (el.getAttribute("data-i18n") === "dropText") el.innerHTML = v;
    else el.textContent = v;
  });
  document.querySelectorAll(".lang-btn").forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
  if (catalog.length) $("catInfo").textContent = translations[lang].catalogReady.replace("{len}", catalog.length);
  if (lastResult && lastResult.gecerli_gorsel !== false) drawChannel();
}

// ---------------- Theme ----------------
document.documentElement.setAttribute("data-theme", localStorage.getItem("theme") || "light");
$("themeToggle").onclick = () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
};
document.querySelectorAll(".lang-btn").forEach(b => b.onclick = () => applyLanguage(b.dataset.lang));
applyLanguage(currentLang);

// ---------------- Catalog ----------------
fetch("/api/catalog")
  .then(r => r.json())
  .then(c => { catalog = c; $("catInfo").textContent = T().catalogReady.replace("{len}", catalog.length); populateStyles(); updateGo(); })
  .catch(() => $("catInfo").textContent = T().catalogFail);

function populateStyles() {
  const styles = [...new Set(catalog.map(p => (p.tarz || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
  const sel = $("styleSel");
  styles.forEach(s => { const o = document.createElement("option"); o.value = s; o.textContent = s; sel.appendChild(o); });
}

// ---------------- Thumbnails (color swatch + garment emoji) ----------------
const COLORS = {
  "siyah": "#1e1e1e", "beyaz": "#eceef2", "antrasit": "#3a3f45", "gri": "#9aa3af",
  "lacivert": "#1e3a5f", "mavi": "#2f6fed", "turkuaz": "#14b8a6", "yeşil": "#16a34a",
  "haki": "#6b7a3a", "sarı": "#f4c430", "hardal": "#d1a015", "turuncu": "#f97316",
  "kırmızı": "#dc2626", "bordo": "#7f1d2d", "pembe": "#ec4899", "mor": "#7c3aed",
  "kahverengi": "#7a4a2b", "bej": "#d8c4a0", "ekru": "#e6dcc6"
};
const EMOJI = {
  "t-shirt": "👕", "tişört": "👕", "sweatshirt": "👕", "kazak": "🧶", "hırka": "🧶",
  "gömlek": "👔", "ceket": "🧥", "mont": "🧥", "elbise": "👗", "etek": "👗",
  "jean": "👖", "pantolon": "👖", "eşofman alti": "👖", "şort": "🩳",
  "ayakkabı": "👟", "terlik": "🩴", "çorap": "🧦", "çanta": "👜", "kemer": "🎗️",
  "pijama takımı": "🩳", "iç çamaşırı": "🩲"
};
function colorFor(renk) {
  const k = (renk || "").trim().toLowerCase();
  if (k.includes("çok renkli") || k.includes("cok renkli")) return "linear-gradient(135deg,#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7)";
  if (k.includes("mavi-beyaz") || k.includes("mavi beyaz")) return "repeating-linear-gradient(45deg,#2f6fed 0 9px,#eceef2 9px 18px)";
  return COLORS[k] || "#94a3b8";
}
const emojiFor = tur => EMOJI[(tur || "").trim().toLowerCase()] || "🛍️";
function thumbHTML(p) {
  const price = p.fiyat > 0 ? p.fiyat.toFixed(2) + " TL" : "";
  return `<div class="thumb">
    <div class="thumb-swatch" style="background:${colorFor(p.renk)}">${emojiFor(p.kategori)}</div>
    <div class="thumb-body">
      <div class="thumb-name">${esc(p.ad)}</div>
      <div class="thumb-meta"><span class="thumb-tag">${esc(p.renk || "")}</span><span class="thumb-price">${price}</span></div>
    </div></div>`;
}

// ---------------- Image input ----------------
const drop = $("drop"), fileInp = $("file");
drop.onclick = () => fileInp.click();
drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); loadImg(e.dataTransfer.files[0]); };
fileInp.onchange = () => loadImg(fileInp.files[0]);
document.querySelectorAll(".sample").forEach(b => b.onclick = () => loadSample(b.dataset.src));

function setPreview(dataUrl) { previewDataUrl = dataUrl; drop.innerHTML = `<img src="${dataUrl}" alt="Preview">`; setStep(1, "done"); updateGo(); }
function loadImg(f) {
  if (!f || !f.type.startsWith("image/")) return;
  imgFile = f;
  const r = new FileReader(); r.onload = () => setPreview(r.result); r.readAsDataURL(f);
}
async function loadSample(src) {
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error("Ağ hatası");
    const blob = await res.blob();
    const f = new File([blob], src.split('/').pop(), { type: blob.type });
    loadImg(f);
  } catch (err) {
    const e = $("err"); e.textContent = "Örnek yüklenemedi: " + err.message; e.classList.add("show");
  }
}

function updateGo() { $("go").disabled = !(imgFile && catalog.length); }
function setStep(n, cls) {
  const el = document.querySelector(`.step[data-s="${n}"]`);
  if (!el) return;
  el.classList.remove("active", "done");
  if (cls) el.classList.add(cls);
}

// ---------------- Main flow ----------------
$("go").onclick = runFlow;
$("regen").onclick = runFlow;

async function runFlow() {
  if (!imgFile || !catalog.length) return;
  $("err").classList.remove("show");
  $("empty").style.display = "none";
  document.querySelectorAll(".out").forEach(o => o.classList.remove("show"));
  [2, 3, 4, 5].forEach(n => setStep(n, null));
  $("go").disabled = true; $("regen").hidden = true;
  $("spin").classList.add("show");
  setStep(2, "active");

  const catStr = catalog.map((p, i) =>
    `${i}| ${p.ad} | ${p.kategori || ""} | ${p.renk || ""} | ${p.tarz || ""}${p.fiyat > 0 ? " | " + p.fiyat + " TL" : ""}`
  ).join("\n");
  const opts = {
    stil: $("styleSel").value, butce: $("budgetSel").value, ton: $("toneSel").value,
    kitle: $("audienceSel").value, durum: $("occasionSel").value, lang: currentLang
  };
  const prompt = PROMPTS.build(catStr, opts);

  const fd = new FormData();
  fd.append("gorsel", imgFile);
  fd.append("prompt", prompt);

  try {
    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const out = await res.json();
    if (!res.ok) throw new Error(out.detay || out.error || `Sunucu hatası: ${res.status}`);
    $("spin").classList.remove("show");
    await render(out);
    $("regen").hidden = false;
  } catch (e) {
    $("spin").classList.remove("show");
    const err = $("err"); err.textContent = e.message; err.classList.add("show");
    setStep(2, null); $("empty").style.display = "";
  }
  $("go").disabled = false; updateGo();
}

async function render(o) {
  lastResult = o;

  if (o.gecerli_gorsel === false) {
    setStep(2, null);
    const err = $("err"); err.textContent = T().invalidImage; err.classList.add("show");
    $("empty").style.display = ""; $("regen").hidden = false;
    return;
  }

  // 2 → Analiz
  setStep(2, "done"); setStep(3, "active");
  $("analizText").textContent = o.analiz || "";
  $("analizTags").innerHTML =
    (o.tespit_edilen_stil ? `<span class="chip hero">🎯 ${esc(o.tespit_edilen_stil)}</span>` : "") +
    (o.parcalar || []).map(p => `<span class="chip">${esc(p)}</span>`).join("");
  const cot = o.dusunme_adimlari || "";
  $("reasoningBox").style.display = cot ? "" : "none";
  $("reasoningText").textContent = cot;
  $("outAnaliz").classList.add("show");
  await sleep(500);

  // 3 → Eşleşen ürünler
  setStep(3, "done"); setStep(4, "active");
  const pick = idxs => (idxs || []).map(i => catalog[i]).filter(Boolean);
  const matched = pick(o.eslesen_urunler);
  $("urunList").innerHTML = matched.length ? matched.map(thumbHTML).join("") : `<div class="nomatch">${T().noMatch}</div>`;
  $("outUrunler").classList.add("show");
  await sleep(500);

  // 4 → Kombin + bütçe
  setStep(4, "done"); setStep(5, "active");
  const komb = pick(o.kombin);
  $("kombinText").textContent = o.kombin_aciklama || "";
  $("kombinList").innerHTML = komb.map(thumbHTML).join("");
  const toplam = komb.reduce((s, p) => s + (p.fiyat || 0), 0);
  const tr = $("totalRow");
  if (toplam > 0) {
    tr.style.display = "flex";
    $("toplam").textContent = toplam.toFixed(2) + " TL";
    const budget = Number($("budgetSel").value) || 0, badge = $("budgetBadge");
    if (budget > 0) { const ok = toplam <= budget; badge.className = "badge " + (ok ? "ok" : "over"); badge.textContent = ok ? T().within : T().over; }
    else { badge.textContent = ""; badge.className = "badge"; }
  } else tr.style.display = "none";
  $("outKombin").classList.add("show");
  await sleep(500);

  // 5 → Çok kanallı kampanya
  setStep(5, "done");
  renderCampaigns(o.kampanyalar || {});
  $("outKampanya").classList.add("show");
}

// ---------------- Campaigns ----------------
function renderCampaigns(k) {
  campaignData = {
    instagram: k.instagram || k.kampanya_metni || "",
    email_konu: k.email_konu || "",
    email_govde: k.email_govde || "",
    web: k.web || ""
  };
  drawChannel();
}
function copyBtnHTML(ch) {
  return `<button class="copy-btn" data-copy="${ch}"><svg class="icon" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>${T().copy}</span></button>`;
}
function drawChannel() {
  const k = campaignData, t = T();
  let html = "";
  if (activeChannel === "instagram") {
    const media = previewDataUrl ? `<img src="${previewDataUrl}" alt="">` : `<span class="ph">🖼️</span>`;
    html = `<div class="channel"><div class="channel-head"><h4>📸 Instagram</h4>${copyBtnHTML("instagram")}</div>
      <div class="ig-post">
        <div class="ig-top"><span class="ig-ava">LCW</span><span class="ig-user">lcwaikiki</span><span class="ig-dots">•••</span></div>
        <div class="ig-media">${media}</div>
        <div class="ig-acts"><span>❤️</span><span>💬</span><span>📤</span></div>
        <div class="ig-caption"><b>lcwaikiki</b>${esc(k.instagram)}</div>
      </div></div>`;
  } else if (activeChannel === "email") {
    html = `<div class="channel"><div class="channel-head"><h4>✉️ ${t.chEmailFull}</h4>${copyBtnHTML("email")}</div>
      <div class="mail">
        <div class="mail-subj"><span class="lbl">${t.subject}</span><span class="val">${esc(k.email_konu)}</span></div>
        <div class="mail-body">${esc(k.email_govde)}</div>
      </div></div>`;
  } else {
    html = `<div class="channel"><div class="channel-head"><h4>🌐 Web</h4>${copyBtnHTML("web")}</div>
      <div class="web-blurb">${esc(k.web)}</div></div>`;
  }
  $("chBody").innerHTML = html;
}
$("chTabs").addEventListener("click", e => {
  const tab = e.target.closest(".tab"); if (!tab) return;
  activeChannel = tab.dataset.ch;
  document.querySelectorAll("#chTabs .tab").forEach(x => x.classList.toggle("active", x === tab));
  drawChannel();
});
$("chBody").addEventListener("click", async e => {
  const btn = e.target.closest(".copy-btn"); if (!btn) return;
  const ch = btn.dataset.copy;
  const text = ch === "instagram" ? campaignData.instagram
    : ch === "email" ? `${T().subject}: ${campaignData.email_konu}\n\n${campaignData.email_govde}`
      : campaignData.web;
  try { await navigator.clipboard.writeText(text); } catch (_) {}
  btn.classList.add("done");
  const span = btn.querySelector("span"), old = span.textContent;
  span.textContent = T().copied;
  setTimeout(() => { btn.classList.remove("done"); span.textContent = old; }, 1500);
});
