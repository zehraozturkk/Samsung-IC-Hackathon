// Bazı ağlarda Google API'ye giden IPv6 yolu kararsız olup "fetch failed" hatasına yol açıyor;
// Node'un DNS çözümünü IPv4 önceliğine alarak bunu önlüyoruz.
require('dns').setDefaultResultOrder('ipv4first');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Tek değiştirilecek yer: hangi sağlayıcı kullanılsın? 'nvidia' | 'gemini'
const PROVIDER = 'gemini';

// NVIDIA NIM (OpenAI uyumlu) ayarları — model adını istediğin zaman değiştir
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = 'meta/llama-3.2-90b-vision-instruct';

// Gemini ayarları
const GEMINI_MODEL = 'gemini-2.5-flash';
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.static(__dirname));
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Gemini bazen string değerlerin içine kaçışsız (ham) satır sonu/tab koyuyor;
// JSON'da bu geçersiz. Sadece string içindeyken bu karakterleri kaçışla.
function escapeControlCharsInJsonStrings(text) {
    let out = '';
    let inString = false;
    let escaped = false;
    for (const ch of text) {
        if (inString) {
            if (escaped) {
                out += ch;
                escaped = false;
            } else if (ch === '\\') {
                out += ch;
                escaped = true;
            } else if (ch === '"') {
                out += ch;
                inString = false;
            } else if (ch === '\n') {
                out += '\\n';
            } else if (ch === '\r') {
                out += '\\r';
            } else if (ch === '\t') {
                out += '\\t';
            } else {
                out += ch;
            }
        } else {
            if (ch === '"') inString = true;
            out += ch;
        }
    }
    return out;
}

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



async function generateWithNvidia(prompt, file) {
    // Eğer tarayıcıdan resim geldiyse OpenAI-uyumlu image_url (base64) formatında ekle
    const content = [{ type: 'text', text: prompt }];
    if (file) {
        content.push({
            type: 'image_url',
            image_url: { url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}` }
        });
    }

    const apiRes = await fetch(NVIDIA_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            model: NVIDIA_MODEL,
            messages: [{ role: 'user', content }],
            max_tokens: 1024,
            temperature: 1.00,
            top_p: 1.00,
            frequency_penalty: 0.00,
            presence_penalty: 0.00,
            stream: false
        })
    });

    const data = await apiRes.json();
    if (!apiRes.ok) throw new Error(data.error?.message || JSON.stringify(data));
    return data.choices[0].message.content;
}

async function generateWithGemini(prompt, file) {
    const model = ai.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: 'application/json' }
    });

    const contents = [];
    if (file) {
        contents.push({ inlineData: { data: file.buffer.toString('base64'), mimeType: file.mimetype } });
    }
    contents.push(prompt);

    const result = await model.generateContent(contents);
    return (await result.response).text();
}

app.post('/api/generate', upload.single('gorsel'), async (req, res) => {

    console.log("====== API ÇAĞRILDI ======");
    console.log(req.body);
    console.log(req.file?.originalname);

    try {
        const prompt = req.body.prompt;

        let rawText = PROVIDER === 'gemini'
            ? await generateWithGemini(prompt, req.file)
            : await generateWithNvidia(prompt, req.file);
        rawText = rawText.trim();

        // Model JSON'un öncesine/sonrasına fazladan metin veya ```fence``` eklerse
        // ilk { ile son } arasını al — konumdan bağımsız çalışır
        const start = rawText.indexOf("{");
        const end = rawText.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
            rawText = rawText.slice(start, end + 1);
        }
        rawText = escapeControlCharsInJsonStrings(rawText);

        // Ön yüze temiz JSON çıktısını uçur
        res.json(JSON.parse(rawText));

    } catch (error) {
        console.error(`${PROVIDER} Entegrasyon Hatası:`, error);
        res.status(500).json({ error: "Yapay zeka yanıt oluşturamadı.", detay: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Güvenli ve Stabil Sunucu http://localhost:${PORT} adresinde hazır!`));