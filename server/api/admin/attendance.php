<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', '0');
error_reporting(E_ALL);

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && (
        $error['type'] === E_ERROR || 
        $error['type'] === E_PARSE || 
        $error['type'] === E_CORE_ERROR || 
        $error['type'] === E_COMPILE_ERROR
    )) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error', 
            'message' => 'Fatal Error: ' . $error['message'] . ' in ' . $error['file'] . ' on line ' . $error['line'],
            'file' => $error['file'],
            'line' => $error['line']
        ]);
        exit;
    }
});

// Robust DB & Logger connection
$dbPaths = [
    __DIR__ . '/../../../../common/db.php',
    __DIR__ . '/../../../common/db.php',
    __DIR__ . '/../../common/db.php',
    '/srv/http/admin/common/db.php'
];

$loggerPaths = [
    __DIR__ . '/../../../../common/logger.php',
    __DIR__ . '/../../../common/logger.php',
    __DIR__ . '/../../common/logger.php',
    '/srv/http/admin/common/logger.php'
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
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database configuration file not found. Checked: ' . implode(', ', $dbPaths)]);
    exit;
}

$loggerFound = false;
foreach ($loggerPaths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $loggerFound = true;
        break;
    }
}

if (!$loggerFound) {
    // Critical but we can proceed with a fallback if needed, 
    // but better to fail early if create_notification_for_roles is required.
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    if ($action === 'fetch_attendance') {
        $userId = $_GET['user_id'] ?? 0;
        $status = $_GET['status'] ?? 'pending';
        $branchId = $_GET['branch_id'] ?? '';
        
        try {
            // Check user role first
            $stmtUser = $pdo->prepare("SELECT r.role_name FROM employees e JOIN roles r ON e.role_id = r.role_id WHERE e.employee_id = ?");
            $stmtUser->execute([$userId]);
            $userRole = $stmtUser->fetchColumn();

            // Find accessible branches
            if ($userRole === 'superadmin') {
                $stmtB = $pdo->query("SELECT branch_id FROM branches");
                $accessibleBranches = $stmtB->fetchAll(PDO::FETCH_COLUMN);
            } else {
                $stmtB = $pdo->prepare("SELECT branch_id FROM branches WHERE admin_employee_id = ? OR created_by = ?");
                $stmtB->execute([$userId, $userId]);
                $accessibleBranches = $stmtB->fetchAll(PDO::FETCH_COLUMN);
            }
            
            if (empty($accessibleBranches)) {
                echo json_encode(['status' => 'success', 'data' => [], 'stats' => ['pending' => 0]]);
                exit;
            }

            $placeholders = implode(',', array_fill(0, count($accessibleBranches), '?'));
            $params = $accessibleBranches;

            $sql = "
                SELECT 
                    a.attendance_id,
                    a.attendance_date,
                    a.status,
                    a.remarks,
                    a.approval_request_at,
                    p.patient_id,
                    r.patient_name,
                    b.branch_name,
                    pm.patient_uid
                FROM attendance a
                JOIN patients p ON a.patient_id = p.patient_id
                JOIN registration r ON p.registration_id = r.registration_id
                LEFT JOIN patient_master pm ON r.master_patient_id = pm.master_patient_id
                JOIN branches b ON p.branch_id = b.branch_id
                WHERE p.branch_id IN ($placeholders)
            ";

            if ($status) {
                // Map 'approved' conceptually to 'present' in DB
                $dbStatus = ($status === 'approved') ? 'present' : $status;
                $sql .= " AND a.status = ?";
                $params[] = $dbStatus;
            }

            if ($branchId) {
                $sql .= " AND p.branch_id = ?";
                $params[] = $branchId;
            }

            $sql .= " ORDER BY a.approval_request_at DESC, a.attendance_date DESC LIMIT 100";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch pending count for stats
            $stmtCount = $pdo->prepare("
                SELECT COUNT(*) 
                FROM attendance a 
                JOIN patients p ON a.patient_id = p.patient_id 
                WHERE a.status = 'pending' AND p.branch_id IN ($placeholders)
            ");
            $stmtCount->execute($accessibleBranches);
            $pendingCount = $stmtCount->fetchColumn();

            // Fetch branches for filter
            $stmtListB = $pdo->prepare("SELECT branch_id, branch_name FROM branches WHERE branch_id IN ($placeholders)");
            $stmtListB->execute($accessibleBranches);
            $branchList = $stmtListB->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'status' => 'success',
                'data' => $records,
                'branches' => $branchList,
                'stats' => ['pending' => (int)$pendingCount]
            ]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = $data['action'] ?? '';

    if ($action === 'update_status') {
        $attendanceId = $data['attendance_id'] ?? 0;
        $adminUserId = $data['user_id'] ?? 0;
        $newStatus = $data['status'] ?? ''; // 'approved' or 'rejected'
        
        $dbStatus = ($newStatus === 'approved') ? 'present' : 'rejected';

        try {
            $pdo->beginTransaction();

            // Fetch details for calculation and notification
            $stmtFetch = $pdo->prepare("
                SELECT a.*, p.branch_id, p.patient_id, r.patient_name
                FROM attendance a 
                JOIN patients p ON a.patient_id = p.patient_id 
                JOIN registration r ON p.registration_id = r.registration_id
                WHERE a.attendance_id = ?
            ");
            $stmtFetch->execute([$attendanceId]);
            $attRecord = $stmtFetch->fetch(PDO::FETCH_ASSOC);

            if (!$attRecord) {
                echo json_encode(['status' => 'error', 'message' => 'Record not found']);
                exit;
            }

            // Update status
            $sql = "UPDATE attendance SET status = :status";
            $params = [':status' => $dbStatus, ':id' => $attendanceId];
            if ($newStatus === 'approved') {
                $sql .= ", approved_by = :approved_by, approved_at = NOW()";
                $params[':approved_by'] = $adminUserId;
            }
            $sql .= " WHERE attendance_id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            // Notification Logic using helper
            $branchId = (int)$attRecord['branch_id'];
            $msg = "Attendance Request for " . $attRecord['patient_name'] . " was " . ucfirst($newStatus);
            $link = "patients.php?search=" . $attRecord['patient_id'];
            
            if (function_exists('create_notification_for_roles')) {
                create_notification_for_roles($pdo, $branchId, ['reception'], $msg, $link, $adminUserId);
            }

            // Patient Balance Recalculation (Simplified logic from manage_attendance.php)
            if ($newStatus === 'approved') {
                $patientId = $attRecord['patient_id'];
                
                $stmtP = $pdo->prepare("
                    SELECT patient_id, treatment_type, treatment_cost_per_day, package_cost, treatment_days, total_amount, start_date, plan_changed, status
                    FROM patients 
                    WHERE patient_id = ?
                ");
                $stmtP->execute([$patientId]);
                $patient = $stmtP->fetch(PDO::FETCH_ASSOC);

                if ($patient) {
                    $treatmentType = strtolower((string)$patient['treatment_type']);
                    $costPerDay = 0.0;
                    if ($treatmentType === 'package' && (int)$patient['treatment_days'] > 0) {
                        $costPerDay = (float)$patient['package_cost'] / (int)$patient['treatment_days'];
                    } else {
                        $costPerDay = (float)($patient['treatment_cost_per_day'] ?? 0);
                    }

                    // Historical Consumed
                    $totalConsumed = 0.0;
                    if ((int)$patient['plan_changed'] === 1) {
                         $stmtH = $pdo->prepare("SELECT * FROM patients_treatment WHERE patient_id = ?");
                         $stmtH->execute([$patientId]);
                         $history = $stmtH->fetchAll(PDO::FETCH_ASSOC);
                         foreach ($history as $h) {
                             $stmtCountH = $pdo->prepare("SELECT COUNT(*) FROM attendance WHERE patient_id = ? AND attendance_date >= ? AND attendance_date < ? AND status = 'present'");
                             $stmtCountH->execute([$patientId, $h['start_date'], $h['end_date']]);
                             $hCount = (int)$stmtCountH->fetchColumn();
                             $hCost = ($h['treatment_type'] === 'package' && (int)$h['treatment_days'] > 0) ? (float)$h['package_cost'] / (int)$h['treatment_days'] : (float)$h['treatment_cost_per_day'];
                             $totalConsumed += ($hCount * $hCost);
                         }
                    }

                    // Current Consumed
                    $stmtCurr = $pdo->prepare("SELECT COUNT(*) FROM attendance WHERE patient_id = ? AND attendance_date >= ? AND status = 'present'");
                    $stmtCurr->execute([$patientId, $patient['start_date']]);
                    $currCount = (int)$stmtCurr->fetchColumn();
                    $totalConsumed += ($currCount * $costPerDay);

                    // Payments
                    $stmtPay = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE patient_id = ?");
                    $stmtPay->execute([$patientId]);
                    $paid = (float)$stmtPay->fetchColumn();

                    $balance = $paid - $totalConsumed;
                    $dues = (float)$patient['total_amount'] - $paid;
                    
                    $newStatus = $patient['status'] === 'inactive' ? 'active' : $patient['status'];

                    $upd = $pdo->prepare("UPDATE patients SET advance_payment = ?, due_amount = ?, status = ? WHERE patient_id = ?");
                    $upd->execute([$balance, $dues, $newStatus, $patientId]);
                }
            }

            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => 'Attendance status updated']);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
}
