// api/get-img.js - Vercel Serverless Function
export default async function handler(req, res) {
  // إعداد ترويسات CORS لإتاحة الوصول من البوت والتطبيقات
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // استلام الـ ID من معلمة الاستعلام ?id=
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      status: 'error',
      message: 'يرجى تزويد رقم المنتج عبر المعامل ?id='
    });
  }

  try {
    // جلب قائمة المنتجات من API المتجر الرئيسي
    const response = await fetch('http://codfroud.atwebpages.com/products.php');
    
    if (!response.ok) {
      throw new Error(`فشل الاتصال بـ API المتجر الرئيسي (${response.status})`);
    }

    const products = await response.json();
    
    // البحث عن المنتج المطلوب بالـ ID
    const product = products.find(p => p.id === parseInt(id, 10));

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'لم يتم العثور على المنتج المطلوب.'
      });
    }

    // تنظيم وتنسيق مصفوفة الصور للذكاء الاصطناعي
    const gallery = Array.isArray(product.gallery) && product.gallery.length > 0
      ? product.gallery
      : [product.main_image];

    const structuredImages = gallery.map((url, index) => ({
      image_number: index + 1,
      url: url,
      is_main: url === product.main_image
    }));

    // إرجاع النتيجة بالهيكلية المطلوبة للـ Tool API
    return res.status(200).json({
      status: 'success',
      data: {
        product_id: product.id,
        product_name: product.name,
        total_images: structuredImages.length,
        main_image: product.main_image,
        gallery_images: structuredImages
      }
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء معالجة الطلب: ' + error.message
    });
  }
}
