<?php
// api/get-img.php - API لجلب معرض صور المنتج بانتظام للذكاء الاصطناعي والتطبيق
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// تضمين ملف الاتصال بقاعدة البيانات
require_once '../config.php';

// استلام معرف المنتج id من الاستعلام
$product_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($product_id <= 0) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'يرجى تزويد رقم المنتج الصحيح عبر المعامل ?id='
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// الاستعلام عن صور المنتج المحدد
$stmt = $conn->prepare("SELECT id, name, main_image, images_count, gallery FROM products WHERE id = ?");
$stmt->bind_param("i", $product_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    $gallery_raw = json_decode($row['gallery'], true) ?? [];
    
    // إعادة هيكلة الصور بشكل منظم للـ AI Agent
    $structured_images = [];
    foreach ($gallery_raw as $index => $url) {
        $structured_images[] = [
            'image_number' => $index + 1,
            'url'          => $url,
            'is_main'      => ($url === $row['main_image'])
        ];
    }

    echo json_encode([
        'status' => 'success',
        'data'   => [
            'product_id'      => (int)$row['id'],
            'product_name'    => $row['name'],
            'total_images'    => (int)$row['images_count'],
            'main_image'      => $row['main_image'],
            'gallery_images'  => $structured_images
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} else {
    http_response_code(404);
    echo json_encode([
        'status'  => 'error',
        'message' => 'لم يتم العثور على المنتج المطلوب.'
    ], JSON_UNESCAPED_UNICODE);
}

$stmt->close();
$conn->close();
