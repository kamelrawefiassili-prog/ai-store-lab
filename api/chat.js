import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const STORE_URL = 'http://codfroud.atwebpages.com/products.php';

// تعليمات صارمة للموظف الذكي لمنع الهلوسة
const SYSTEM_PROMPT = {
  role: 'system',
  content: `أنت موظف مبيعات دقيق لمتجر Codfroud.
قواعد العمل الصارمة:
1. اعتمد فقط وبدقة على بيانات قائمة المنتجات المجلوبة من المتجر.
2. انتبه جيداً للفرق بين المنتج الرئيسي وملحقاته (مثلاً: "شاحن آيفون" هو شاحن وملحق وليس جهاز هاتف).
3. إذا سأل العميل عن منتج غير موجود بكتالوج المتجر، قل له بلطف أن المنتج غير متوفر لديكم.
4. إذا كان مخزون المنتج (stock) يساوي 0، اذكر للعميل أن المنتج نافد حالياً من المخزون.`
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { message } = req.body;

  try {
    const userMessage = { role: 'user', content: message };

    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [SYSTEM_PROMPT, userMessage],
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_store_products',
            description: 'جلب قائمة منتجات المتجر الحالية والتحقق من الأسعار والمخزون',
            parameters: { type: 'object', properties: {} }
          }
        }
      ]
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      const storeRes = await fetch(STORE_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const productsData = await storeRes.json();

      const finalResponse = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          SYSTEM_PROMPT,
          userMessage,
          responseMessage,
          {
            role: 'tool',
            tool_call_id: responseMessage.tool_calls[0].id,
            content: JSON.stringify(productsData)
          }
        ]
      });

      return res.status(200).json({ answer: finalResponse.choices[0].message.content });
    }

    return res.status(200).json({ answer: responseMessage.content });

  } catch (error) {
    return res.status(500).json({ error: 'خطأ بالسيرفر: ' + error.message });
  }
}
