// ============================================================
//  ÖN YÜZ — API key ve katalog backend'te (server.js + .env).
//  Promptlar ai/prompts.js dosyasından gelir.
// ============================================================
const $ = id => document.getElementById(id);
let catalog = [];
let imgFile = null;

// --- katalog backend'ten gelir ---
fetch("/api/catalog")
  .then(r => r.json())
  .then(c => {
    catalog = c;
    $("catInfo").textContent = `Katalog hazır: ${catalog.length} ürün (katalog.csv)`;
    updateGo();
  })
  .catch(() => $("catInfo").textContent = "Katalog yüklenemedi — sunucu çalışıyor mu?");

// --- görsel yükleme ---
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
  r.onload = () => { drop.innerHTML = `<img src="${r.result}">`; };
  r.readAsDataURL(f);
  setStep(1, "done");
  updateGo();
}

function updateGo() { $("go").disabled = !(imgFile && catalog.length); }

// --- akış adımları ---
function setStep(n, cls) {
  const el = document.querySelector(`.step[data-s="${n}"]`);
  el.classList.remove("active", "done");
  if (cls) el.classList.add(cls);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// --- ana akış: görsel + prompt → backend → Gemini ---
$("go").onclick = async () => {
  $("err").style.display = "none";
  document.querySelectorAll(".out").forEach(o => o.classList.remove("show"));
  [2, 3, 4, 5].forEach(n => setStep(n, null));
  $("go").disabled = true;
  $("spin").style.display = "block";
  setStep(2, "active");

  // katalogda fiyat yoksa bütçe ve fiyat kolonunu prompta koyma
  const hasPrice = catalog.some(p => p.fiyat > 0);
  const catStr = catalog.map((p, i) =>
    `${i}| ${p.ad} | ${p.kategori || ""} | ${p.renk || ""} | ${p.tarz || ""}${hasPrice ? " | " + p.fiyat + " TL" : ""}`
  ).join("\n");
  const prompt = PROMPTS.build(catStr, $("style").value, hasPrice ? $("budget").value : "");

  const fd = new FormData();
  fd.append("gorsel", imgFile);
  fd.append("prompt", prompt);

  try {
    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const out = await res.json();
    $("rawText").textContent = JSON.stringify(out, null, 2);
    $("outRaw").classList.add("show");
    if (!res.ok) throw new Error(out.detay || out.error || `Sunucu hatası: ${res.status}`);
    console.log("CoT / düşünme adımları:", out.dusunme_adimlari); // rapor + demo için
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

// --- çıktıları adım adım göster ---
async function render(o) {
  setStep(2, "done"); setStep(3, "active");
  $("analizText").textContent = o.analiz || "";
  $("analizTags").innerHTML =
    (o.tespit_edilen_stil ? `<span class="tag">🎯 ${o.tespit_edilen_stil}</span>` : "") +
    (o.parcalar || []).map(p => `<span class="tag">${p}</span>`).join("");
  $("outAnaliz").classList.add("show");
  await sleep(600);

  setStep(3, "done"); setStep(4, "active");
  const row = p => `<div class="item"><span>${p.ad}</span><span class="price">${p.fiyat > 0 ? p.fiyat.toFixed(2) + " TL" : ""}</span></div>`;
  const pick = idxs => (idxs || []).map(i => catalog[i]).filter(Boolean); // uydurma index'leri eler
  $("urunList").innerHTML = pick(o.eslesen_urunler).map(row).join("") || "<i>Eşleşme bulunamadı.</i>";
  $("outUrunler").classList.add("show");
  await sleep(600);

  setStep(4, "done"); setStep(5, "active");
  const komb = pick(o.kombin);
  $("kombinText").textContent = o.kombin_aciklama || "";
  $("kombinList").innerHTML = komb.map(row).join("");
  // toplam fiyatı model değil, kod hesaplar → fiyat halüsinasyonu imkânsız
  const toplam = komb.reduce((s, p) => s + p.fiyat, 0);
  $("totalRow").style.display = toplam > 0 ? "" : "none";
  $("toplam").textContent = toplam.toFixed(2) + " TL";
  $("outKombin").classList.add("show");
  await sleep(600);

  setStep(5, "done");
  $("kampanyaText").textContent = o.kampanya_metni || "";
  $("outKampanya").classList.add("show");
}
