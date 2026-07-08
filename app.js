// ============================================================
//  ÖN YÜZ — Gelişmiş i18n Dil ve Dark Mode Desteği Dahil
// ============================================================
const $ = id => document.getElementById(id);
let catalog = [];
let imgFile = null;
let currentLang = localStorage.getItem("lang") || "tr";

// --- i18n Dil Sözlüğü ---
const translations = {
  tr: {
    title: "Kampanya Stüdyosu — Müşteri görselinden ürün önerisi ve kampanya metni",
    step1: "Görsel Yükle", step2: "AI Görsel Analizi", step3: "Katalog Eşleştirme", step4: "Kombin Oluşturma", step5: "Kampanya Metni",
    customerInput: "Müşteri Girdisi", dropText: "Kıyafet / kombin görselini sürükle<br><small>veya tıklayıp seç</small>",
    btnAnalyze: "Analiz Et ve Kampanya Oluştur", aiThinking: "Yapay zeka görseli yorumluyor ve kombinleri eşleştiriyor...",
    titleAnalysis: "Görsel Analizi", titleProducts: "Eşleşen LC Waikiki Ürünleri", titleOutfit: "Önerilen Kombin", titleCampaign: "Kampanya / Reklam Metni",
    total: "Toplam", noMatch: "<i>Eşleşme bulunamadı.</i>", catalogLoading: "Katalog yükleniyor…", catalogReady: "Katalog hazır: {len} ürün (katalog.csv)", catalogFail: "Katalog yüklenemedi — sunucu çalışıyor mu?"
  },
  en: {
    title: "Campaign Studio — Product recommendation & campaign copy from customer image",
    step1: "Upload Image", step2: "AI Analysis", step3: "Catalog Matching", step4: "Outfit Creation", step5: "Campaign Text",
    customerInput: "Customer Input", dropText: "Drag & drop outfit image here<br><small>or click to browse</small>",
    btnAnalyze: "Analyze & Create Campaign", aiThinking: "AI is understanding the outfit and matching products...",
    titleAnalysis: "Image Analysis", titleProducts: "Matched LC Waikiki Products", titleOutfit: "Suggested Outfit", titleCampaign: "Generated Campaign Copy",
    total: "Total", noMatch: "<i>No matches found.</i>", catalogLoading: "Loading catalog...", catalogReady: "Catalog ready: {len} products (katalog.csv)", catalogFail: "Catalog load failed — is server running?"
  }
};

// --- Dil Değiştirme Fonksiyonu ---
function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang][key]) {
      if (key === "dropText") el.innerHTML = translations[lang][key];
      else el.textContent = translations[lang][key];
    }
  });

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
  });
  
  if (catalog.length) {
    $("catInfo").textContent = translations[lang].catalogReady.replace("{len}", catalog.length);
  }
}

// --- Dark / Light Mode Yönetimi ---
const themeToggle = $("themeToggle");
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);

themeToggle.onclick = () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
};

// --- Dil Tetikleyicileri ---
document.querySelectorAll(".lang-btn").forEach(btn => {
  btn.onclick = () => applyLanguage(btn.getAttribute("data-lang"));
});

// İlk yükleme dillerini ayarla
applyLanguage(currentLang);

// --- Katalog Servisi ---
fetch("/api/catalog")
  .then(r => r.json())
  .then(c => {
    catalog = c;
    $("catInfo").textContent = translations[currentLang].catalogReady.replace("{len}", catalog.length);
    updateGo();
  })
  .catch(() => $("catInfo").textContent = translations[currentLang].catalogFail);

// --- Görsel Sürükle Bırak ---
const drop = $("drop"), fileInp = $("file");
drop.onclick = () => fileInp.click();
drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); loadImg(e.dataTransfer.files[0]); };
fileInp.onchange = () => loadImg(fileInp.files[0]);

function loadImg(f) {
  if (!f || !f.type.startsWith("image/")) return;
  imgFile = f;
  const r = new FileReader();
  r.onload = () => { drop.innerHTML = `<img src="${r.result}" alt="Preview">`; };
  r.readAsDataURL(f);
  setStep(1, "done");
  updateGo();
}

function updateGo() { $("go").disabled = !(imgFile && catalog.length); }

// --- Adım Durumlarını Yönetme ---
function setStep(n, cls) {
  const el = document.querySelector(`.step[data-s="${n}"]`);
  if (!el) return;
  el.classList.remove("active", "done");
  if (cls) el.classList.add(cls);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// --- Ana Yapay Zeka Akış İsteği ---
$("go").onclick = async () => {
  $("err").style.display = "none";
  document.querySelectorAll(".out").forEach(o => o.classList.remove("show"));
  [2, 3, 4, 5].forEach(n => setStep(n, null));
  $("go").disabled = true;
  $("spin").style.display = "block";
  setStep(2, "active");

  const catStr = catalog.map((p, i) =>
    `${i}| ${p.ad} | ${p.kategori || ""} | ${p.renk || ""} | ${p.tarz || ""}`
  ).join("\n");

  const prompt = PROMPTS.build(catStr, "Casual / Günlük", "Standart");

  const fd = new FormData();
  fd.append("gorsel", imgFile);
  fd.append("prompt", prompt);

  try {
    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const out = await res.json();
    $("rawText").textContent = JSON.stringify(out, null, 2);
    $("outRaw").classList.add("show");
    if (!res.ok) throw new Error(out.detay || out.error || `Sunucu hatası: ${res.status}`);
    $("spin").style.display = "none";
    await render(out);
  } catch (e) {
    $("spin").style.display = "none";
    $("err").textContent = e.message;
    $("err").style.display = "block";
    setStep(2, null);
  }
  $("go").disabled = false;
  updateGo();
};

// --- Adım Adım Sonuçları Yazdırma (Render) ---
async function render(o) {
  setStep(2, "done"); setStep(3, "active");
  $("analizText").textContent = o.analiz || "";
  $("analizTags").innerHTML =
    (o.tespit_edilen_stil ? `<span class="tag">🎯 ${o.tespit_edilen_stil}</span>` : "") +
    (o.parcalar || []).map(p => `<span class="tag">${p}</span>`).join("");
  $("outAnaliz").classList.add("show");
  await sleep(600);

  setStep(3, "done"); setStep(4, "active");
  const row = p => `<div class="item"><span>${p.ad}</span><span class="price-tag">${p.fiyat > 0 ? p.fiyat.toFixed(2) + " TL" : ""}</span></div>`;
  const pick = idxs => (idxs || []).map(i => catalog[i]).filter(Boolean);
  $("urunList").innerHTML = pick(o.eslesen_urunler).map(row).join("") || `<i>${translations[currentLang].noMatch}</i>`;
  $("outUrunler").classList.add("show");
  await sleep(600);

  setStep(4, "done"); setStep(5, "active");
  const komb = pick(o.kombin);
  $("kombinText").textContent = o.kombin_aciklama || "";
  $("kombinList").innerHTML = komb.map(row).join("");
  
  const toplam = komb.reduce((s, p) => s + (p.fiyat || 0), 0);
  $("totalRow").style.display = toplam > 0 ? "flex" : "none";
  $("toplam").textContent = toplam > 0 ? toplam.toFixed(2) + " TL" : "";
  $("outKombin").classList.add("show");
  await sleep(600);

  setStep(5, "done");
  $("kampanyaText").textContent = o.campaign_text || o.kampanya_metni || "";
  $("outKampanya").classList.add("show");
}