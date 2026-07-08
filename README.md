# LCW Kampanya Stüdyosu

Müşterinin yüklediği kıyafet/kombin görselini Gemini 2.5 Flash ile analiz eder,
LC Waikiki kataloğundan benzer ürünleri eşleştirir, kombin önerir ve kampanya metni üretir.

## Çalıştırma

`index.html` dosyasına çift tıklayın. Sunucu, kurulum, bağımlılık yok.

## Değiştirmeniz gereken tek şeyler

| Ne | Nerede |
|---|---|
| API anahtarı | [ai/config.js](ai/config.js) → `API_KEY` |
| Promptlar | [ai/prompts.js](ai/prompts.js) — marka kimliği, few-shot örnekler, etik kurallar, JSON şeması |
| Ürün verisi | [data/catalog.js](data/catalog.js) veya arayüzden CSV yükleyin (`ad,kategori,renk,fiyat` başlıklı) |

## Dosya yapısı

```
index.html        arayüz + akış (dokunmanıza gerek yok)
ai/config.js      API key + model adı
ai/prompts.js     tüm promptlar
data/catalog.js   ürün kataloğu
RAPOR.md          hackathon teslim raporu
```
