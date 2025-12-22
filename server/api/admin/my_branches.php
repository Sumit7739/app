<?php
// server/api/admin/my_branches.php

// 1. Handle CORS and Options first
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. Suppress PHP errors in output
ini_set('display_errors', '0');
error_reporting(E_ALL);

// 3. Register fatal error handler to return JSON
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR || $error['type'] === E_COMPILE_ERROR)) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => 'Fatal Error: ' . $error['message'] . ' in ' . $error['file'] . ' on line ' . $error['line']]);
        exit;
    }
});

try {
    // 4. Robust DB connection
    $dbPaths = [
        __DIR__ . '/../../../../common/db.php',   // Standard path
        __DIR__ . '/../../../common/db.php',      // Fallback 1
        __DIR__ . '/../../common/db.php',         // Fallback 2
        $_SERVER['DOCUMENT_ROOT'] . '/admin/common/db.php', // Absolute path fallback
        $_SERVER['DOCUMENT_ROOT'] . '/common/db.php'
    ];

    $dbFound = false;
    foreach ($dbPaths as $path) {
        if (file_exists($path)) {
            require_once $path;
            $dbFound = true;
            break;
        }
    }

    if (!$dbFound) {
        throw new Exception("Database configuration file not found. Checked paths: " . implode(", ", $dbPaths));
    }

    if (!isset($pdo)) {
        throw new Exception("Database connection failed: \$pdo not set.");
    }

    // 5. Main Logic
    $employeeId = isset($_GET['employee_id']) ? intval($_GET['employee_id']) : 0;

    if (!$employeeId) {
        throw new Exception("Employee ID is required");
    }

    // Fetch branches created by this admin or managed by this admin
    $stmt = $pdo->prepare("
        SELECT 
            branch_id, 
            branch_name, 
            city, 
            address_line_1, 
            is_active 
        FROM branches 
        WHERE created_by = ? OR admin_employee_id = ?
        ORDER BY branch_id DESC
    ");
    
    $stmt->execute([$employeeId, $employeeId]);
    $branches = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt = $pdo->prepare("
        SELECT 
            branch_id, 
            branch_name, 
            city, 
            address_line_1, 
            is_active 
        FROM branches 
        WHERE created_by = ? OR admin_employee_id = ?
        ORDER BY branch_id DESC
    ");
    
    $stmt->execute([$employeeId, $employeeId]);
    $branches = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status' => 'success',
        'data' => $branches
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
