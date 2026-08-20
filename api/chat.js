const STORE_URL = 'http://codfroud.atwebpages.com/products.php';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_TOOL_PROMPT = `أنت محرك بحث متقدم لمنتجات متجر Codfroud.
مهمتك: تحليل استفسار الذكاء الاصطناعي الرئيسي وإرجاع JSON دقيق يحتوي على تفاصيل المنتجات وصورها الرئيسية وعدد الصور المتاحة.

قواعد الاستجابة:
1. الإجابة بصيغة JSON فقط دون أي نصوص إضافية.
2. نسق الهيكل المطلوب للرد:
{
  "query_analyzed": "استفسار النية الحقيقية",
  "matched_products": [
    {
      "id": 1,
      "name": "اسم المنتج",
      "price": 100,
      "stock": 5,
      "is_available": true,
      "main_image": "رابط الصورة الرئيسية الأولى فقط",
      "images_count": 3,
      "match_reason": "سبب التطابق"
    }
  ],
  "alternative_products": [],
  "out_of_stock_matches": []
}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, message } = req.body || {};
  const userQuery = query || message || '';

  try {
    const storeRes = await fetch(STORE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const catalogData = await storeRes.json();

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_TOOL_PROMPT }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: `طلب البحث: "${userQuery}"\n\nكتالوج المنتجات الحقيقي:\n${JSON.stringify(catalogData)}` }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`فشل Gemini API (${geminiRes.status}): ${errText}`);
    }

    const geminiData = await geminiRes.json();
    let rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // تنظيف علامات Markdown لمنع أخطاء الـ JSON
    rawContent = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();

    const toolResult = JSON.parse(rawContent);

    return res.status(200).json({
      status: 'success',
      data: toolResult
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}
