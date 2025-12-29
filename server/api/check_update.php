<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$versionFile = __DIR__ . '/../version.json';

if (file_exists($versionFile)) {
    $data = json_decode(file_get_contents($versionFile), true);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'latest_version' => $data['version'],
            'download_url' => $data['url'],
            'force_update' => $data['force_update'] ?? false,
            'release_notes' => $data['notes'] ?? ''
        ]
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'Version file not found'
    ]);
}
?>
