const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai'); 

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// .env dosyasından okunan API Key ile güvenli başlatma
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.static(__dirname));
app.use(express.json());

// Katalog backend'te okunur: katalog.csv → ön yüze hazır JSON
const fs = require('fs');
const HEADER_MAP = { 'ürün adı': 'ad', 'ad': 'ad', 'tür': 'kategori', 'kategori': 'kategori', 'renk': 'renk', 'tarz': 'tarz', 'stil': 'tarz', 'fiyat': 'fiyat' };
app.get('/api/catalog', (req, res) => {
    try {
        const lines = fs.readFileSync(path.join(__dirname, 'data', 'catalog.csv'), 'utf8').trim().split(/\r?\n/).filter(l => l.trim());
        const sep = lines[0].includes(';') ? ';' : ',';
        const head = lines[0].split(sep).map(h => HEADER_MAP[h.trim().toLowerCase()] || h.trim().toLowerCase());
        const catalog = lines.slice(1).map(l => {
            const c = l.split(sep), o = {};
            head.forEach((h, i) => o[h] = (c[i] || '').trim());
            o.fiyat = parseFloat(String(o.fiyat || 0).replace(',', '.')) || 0;
            return o;
        }).filter(o => o.ad);
        res.json(catalog);
    } catch (e) {
        res.status(500).json({ error: 'katalog.csv okunamadı: ' + e.message });
    }
});

app.post('/api/generate', upload.single('gorsel'), async (req, res) => {
    try {
        const prompt = req.body.prompt;
        
        // En stabil çalışan vizyon modeli yapılandırması
        const model = ai.getGenerativeModel({ 
            model: 'gemini-2.5-flash', 
            generationConfig: { responseMimeType: "application/json" }
        });

        let contents = [];

        // Eğer tarayıcıdan resim geldiyse base64 formatında ekle
        if (req.file) {
            contents.push({
                inlineData: {
                    data: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype
                }
            });
        }

        // Prompt metnini içeriğe ekle
        contents.push(prompt);

        // API'ye istek atma
        const result = await model.generateContent(contents);
        const response = await result.response;
        let rawText = response.text().trim();

        // Model markdown formatında (```json ... ```) üretirse temizle
        if (rawText.startsWith("```")) {
            rawText = rawText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        }

        // Ön yüze temiz JSON çıktısını uçur
        res.json(JSON.parse(rawText));

    } catch (error) {
        console.error("Gemini Entegrasyon Hatası:", error);
        res.status(500).json({ error: "Yapay zeka yanıt oluşturamadı.", detay: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Güvenli ve Stabil Sunucu http://localhost:${PORT} adresinde hazır!`));