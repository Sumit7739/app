<?php

declare(strict_types=1);

// ----------------------------------------------------------------------
// API: Fetch Attendance History (Replica of get_attendance_history.php)
// ----------------------------------------------------------------------

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db_paths = [
    __DIR__ . '/../../common/db.php',
    __DIR__ . '/../../../common/db.php',
    $_SERVER['DOCUMENT_ROOT'] . '/prospine/server/common/db.php',
    $_SERVER['DOCUMENT_ROOT'] . '/common/db.php'
];

$db_loaded = false;
foreach ($db_paths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $db_loaded = true;
        break;
    }
}

if (!$db_loaded) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database configuration not found']);
    exit();
}

try {
    $patientId = $_GET['patient_id'] ?? $_GET['id'] ?? null;

    if (!$patientId || !filter_var($patientId, FILTER_VALIDATE_INT)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Valid Patient ID is required']);
        exit();
    }
    $patientId = (int)$patientId;

    // 1. Fetch Patient Details
    // We also select 'created_at' to know when they joined, useful for calendar boundaries
    $stmtPatient = $pdo->prepare("
        SELECT 
            p.patient_id AS id,
            r.patient_name AS name,
            p.treatment_type,
            p.treatment_days,
            p.start_date
        FROM patients p
        JOIN registration r ON p.registration_id = r.registration_id
        WHERE p.patient_id = :patient_id
        LIMIT 1
    ");
    $stmtPatient->execute([':patient_id' => $patientId]);
    $patient = $stmtPatient->fetch(PDO::FETCH_ASSOC);

    if (!$patient) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Patient not found']);
        exit();
    }

    // 2. Fetch Attendance History
    // We'll return dates so frontend can map them to calendar
    $stmtHistory = $pdo->prepare("
        SELECT 
            attendance_date,
            remarks,
            status
        FROM attendance
        WHERE patient_id = :patient_id
        ORDER BY attendance_date DESC
    ");
    $stmtHistory->execute([':patient_id' => $patientId]);
    $history = $stmtHistory->fetchAll(PDO::FETCH_ASSOC);

    // 3. Stats
    $totalDays = (int)($patient['treatment_days'] ?? 0);
    // Count ONLY valid attendance (sometimes logic filters by date >= start_date)
    // For specific plan progress, we should filter. 
    // But for general history view, show all.
    // Let's return ALL history, but stats based on Plan Start Date.
    
    $startDate = $patient['start_date'] ?? '1970-01-01';
    $presentCount = 0;
    foreach ($history as $rec) {
        if ($rec['attendance_date'] >= $startDate) {
            $presentCount++;
        }
    }

    $remaining = $totalDays > 0 ? max(0, $totalDays - $presentCount) : '-';

    $stats = [
        'total_days' => $totalDays > 0 ? $totalDays : '-',
        'present_count' => $presentCount,
        'remaining' => $remaining
    ];

    echo json_encode([
        'status' => 'success',
        'data' => [
            'patient' => $patient,
            'stats' => $stats,
            'history' => $history
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
