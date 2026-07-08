# LCW Kampanya Stüdyosu

Müşterinin yüklediği kıyafet/kombin görselini Gemini 2.5 Flash ile analiz eder,
LC Waikiki kataloğundan benzer ürünleri eşleştirir, kombin önerir ve kampanya metni üretir.

## Çalıştırma

```
npm install   (ilk kurulumda bir kez)
npm start     →  http://localhost:3000
```

## Değiştirmeniz gereken tek şeyler

| Ne | Nerede |
|---|---|
| API anahtarı | `.env` → `GEMINI_API_KEY=...` (tarayıcıya asla gitmez) |
| Promptlar | [ai/prompts.js](ai/prompts.js) — marka kimliği, few-shot örnekler, etik kurallar, JSON şeması |
| Ürün verisi | [data/catalog.csv](data/catalog.csv) — sunucu her istekte taze okur, değiştirip sayfayı yenilemek yeter |

## Dosya yapısı

```
server.js       backend: Express + Gemini çağrısı (.env'den key) + /api/catalog (CSV okur)
index.html      arayüz iskeleti
style.css       görünüm
app.js          ön yüz akışı (katalog /api/catalog'dan, görsel+prompt /api/generate'e)
ai/prompts.js       tüm promptlar
data/catalog.csv    ürün kataloğu (Ürün Adı, Tür, Renk, Tarz [, Fiyat])
.env                GEMINI_API_KEY
```

Not: `data/catalog.csv`'ye `Fiyat` kolonu eklerseniz arayüz otomatik olarak ürün fiyatlarını,
kombin toplamını ve bütçe filtresini göstermeye başlar; kolon yoksa bu alanlar gizlenir.
