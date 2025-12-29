<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE");
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
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR)) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Fatal Error: ' . $error['message']]);
        exit;
    }
});

$dbPaths = [
    __DIR__ . '/../../../../common/db.php',
    __DIR__ . '/../../../common/db.php',
    __DIR__ . '/../../common/db.php',
    '/srv/http/admin/common/db.php'
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
    echo json_encode(['status' => 'error', 'message' => 'Database configuration file not found.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Enable emulated prepares for subqueries re-use of named params if needed
$pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, true); 

if ($method === 'GET') {
    if ($action === 'fetch_partners') {
            try {
            // 1. Get Admin's Branch ID
            $userId = $_GET['user_id'] ?? 0; // The frontend passes this
            $branchId = 0;
            
            if ($userId) {
                // Fetch branch_id from employees table
                $stmtB = $pdo->prepare("SELECT branch_id FROM employees WHERE employee_id = ?");
                $stmtB->execute([$userId]);
                $branchId = $stmtB->fetchColumn();
            }

            if (!$branchId) {
                // Fallback or error? For now, if no branch found (e.g. superadmin might be 0 or dynamic),
                // we might default to 0 which returns nothing, or handle differently.
                // Assuming standard admin flow:
                $branchId = 0; 
            }

            // 2. Query with Branch Filter
            $sql = "
                SELECT 
                    p.partner_id, 
                    p.name, 
                    p.phone,
                    (
                        (SELECT COUNT(*) FROM registration r WHERE r.referral_partner_id = p.partner_id AND r.branch_id = :bid) +
                        (SELECT COUNT(DISTINCT t.test_id) FROM tests t JOIN test_items ti ON t.test_id = ti.test_id WHERE t.referral_partner_id = p.partner_id AND t.branch_id = :bid)
                    ) as total_patients,
                    (
                        (SELECT COALESCE(SUM(consultation_amount),0) FROM registration r WHERE r.referral_partner_id = p.partner_id AND r.branch_id = :bid) +
                        (SELECT COALESCE(SUM(total_amount),0) FROM tests t WHERE t.referral_partner_id = p.partner_id AND t.branch_id = :bid)
                    ) as total_revenue,
                    (
                         (SELECT COALESCE(SUM(commission_amount),0) FROM registration r WHERE r.referral_partner_id = p.partner_id AND r.commission_status = 'pending' AND r.branch_id = :bid) +
                         (SELECT COALESCE(SUM(ti.commission_amount),0) FROM test_items ti JOIN tests t ON ti.test_id = t.test_id WHERE t.referral_partner_id = p.partner_id AND ti.commission_status = 'pending' AND t.branch_id = :bid)
                    ) as pending_commission
                FROM referral_partners p
                HAVING total_patients > 0
                ORDER BY total_revenue DESC
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':bid' => $branchId]);
            $partners = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Cast numbers
            foreach ($partners as &$p) {
                $p['partner_id'] = (int)$p['partner_id'];
                $p['total_patients'] = (int)$p['total_patients'];
                $p['total_revenue'] = (float)$p['total_revenue'];
                $p['pending_commission'] = (float)$p['pending_commission'];
            }

            echo json_encode(['status' => 'success', 'data' => $partners]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
        }
    } elseif ($action === 'fetch_transactions') {
        $partnerId = $_GET['partner_id'] ?? 0;
        $userId = $_GET['user_id'] ?? 0; // Need user_id to get branch_id here too if we want strict drill-down
        
        $branchId = 0;
        if ($userId) {
             $stmtB = $pdo->prepare("SELECT branch_id FROM employees WHERE employee_id = ?");
             $stmtB->execute([$userId]);
             $branchId = $stmtB->fetchColumn();
        }

        if (!$partnerId) {
            echo json_encode(['status' => 'error', 'message' => 'Partner ID required']);
            exit;
        }

        try {
            $sqlTx = "
                SELECT 
                    'registration' as type,
                    'Registration' as service_name,
                    registration_id as id,
                    created_at as date,
                    patient_name,
                    consultation_amount as revenue,
                    commission_amount as commission,
                    commission_status as status
                FROM registration 
                WHERE referral_partner_id = :pid1 AND branch_id = :bid1
                
                UNION ALL
                
                SELECT 
                    'test' as type,
                    ti.test_name as service_name,
                    ti.item_id as id,
                    ti.assigned_test_date as date, 
                    t.patient_name,
                    t.total_amount as revenue, 
                    ti.commission_amount as commission,
                    ti.commission_status as status
                FROM test_items ti
                JOIN tests t ON ti.test_id = t.test_id
                WHERE t.referral_partner_id = :pid2 AND t.branch_id = :bid2
                
                ORDER BY date DESC
                LIMIT 500
            ";
            
            $stmt = $pdo->prepare($sqlTx);
            $stmt->execute([
                ':pid1' => $partnerId, 
                ':bid1' => $branchId,
                ':pid2' => $partnerId,
                ':bid2' => $branchId
            ]);
            $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format for frontend
            foreach ($transactions as &$tx) {
                $tx['id'] = (int)$tx['id'];
                $tx['revenue'] = (float)$tx['revenue'];
                $tx['commission'] = (float)$tx['commission'];
                // Ensure date is ISO-like or handle in frontend. MySQL datetime is standard.
            }
            
            echo json_encode(['status' => 'success', 'data' => $transactions]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
        }

    } elseif ($action === 'fetch_test_types') {
        try {
            // Need unique test names for rate setting
            $stmt = $pdo->prepare("SELECT DISTINCT test_name FROM test_types WHERE is_active = 1 ORDER BY test_name");
            $stmt->execute();
            $types = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            echo json_encode(['status' => 'success', 'data' => $types]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
        }

    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }

} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    // Support action either in URL (if POST param used) or body. Usually body for JSON API.
    // My previous code expected action in $_GET for GET requests. 
    // Let's standardise: check query param if not in body
    $action = $_GET['action'] ?? ($input['action'] ?? '');

    if ($action === 'update_status') {
        $type = $input['type'] ?? '';
        $id = $input['id'] ?? 0;
        $status = $input['status'] ?? '';

        if (!in_array($type, ['registration', 'test']) || !in_array($status, ['paid', 'pending']) || !$id) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid parameters']);
            exit;
        }

        try {
            if ($type === 'registration') {
                $stmt = $pdo->prepare("UPDATE registration SET commission_status = ? WHERE registration_id = ?");
            } else {
                // type === 'test' -> updates test_items table
                $stmt = $pdo->prepare("UPDATE test_items SET commission_status = ? WHERE item_id = ?");
            }
            
            $stmt->execute([$status, $id]);
            echo json_encode(['status' => 'success']);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
        }
    } elseif ($action === 'add_partner') {
        $name = trim($input['name'] ?? '');
        $phone = trim($input['phone'] ?? '');

        if (!$name || !$phone) {
            echo json_encode(['status' => 'error', 'message' => 'Name and phone are required']);
            exit;
        }

        try {
            // Check if exists
            $stmt = $pdo->prepare("SELECT partner_id FROM referral_partners WHERE phone = ?");
            $stmt->execute([$phone]);
            if ($stmt->fetch()) {
                echo json_encode(['status' => 'error', 'message' => 'Partner with this phone already exists']);
                exit;
            }

            $stmt = $pdo->prepare("INSERT INTO referral_partners (name, phone, status, created_at) VALUES (?, ?, 'active', NOW())");
            $stmt->execute([$name, $phone]);
            
            echo json_encode(['status' => 'success', 'message' => 'Partner added successfully']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
        }

    } elseif ($action === 'update_global_rates') {
        // Expected Input: { rate_registration: 50, rates: { "MRI": 500, "X-Ray": 100 } }
        $regRate = $input['rate_registration'] ?? null;
        $testRates = $input['rates'] ?? [];
        
        if ($regRate === null && empty($testRates)) {
             echo json_encode(['status' => 'error', 'message' => 'No rates provided']);
             exit;
        }

        $pdo->beginTransaction();
        try {
             // 1. Get ALL Active Partner IDs
            $stmt = $pdo->query("SELECT partner_id FROM referral_partners WHERE status = 'active'");
            $partners = $stmt->fetchAll(PDO::FETCH_COLUMN);

            if (empty($partners)) {
                throw new Exception("No active partners found to update.");
            }

            foreach ($partners as $partnerId) {
                // Update Registration Rate
                if ($regRate !== null && $regRate !== '') {
                     $amt = (float)$regRate;
                     
                     // Delete old rate setting
                     $pdo->prepare("DELETE FROM referral_rates WHERE partner_id = ? AND service_type = 'registration'")->execute([$partnerId]);
                     // Insert new rate setting (for future)
                     $pdo->prepare("INSERT INTO referral_rates (partner_id, service_type, commission_amount) VALUES (?, 'registration', ?)")->execute([$partnerId, $amt]);
                     
                     // Retroactive Update (ONLY PENDING)
                     $pdo->prepare("UPDATE registration SET commission_amount = ? WHERE referral_partner_id = ? AND commission_status = 'pending'")->execute([$amt, $partnerId]);
                }

                // Update Test Rates
                foreach ($testRates as $testName => $amt) {
                    if ($amt !== '' && $amt !== null) {
                        $fAmt = (float)$amt;
                        
                        // Delete old rate setting
                        $pdo->prepare("DELETE FROM referral_rates WHERE partner_id = ? AND service_type = 'test' AND service_item_name = ?")->execute([$partnerId, $testName]);
                        // Insert new rate setting (for future)
                        $pdo->prepare("INSERT INTO referral_rates (partner_id, service_type, service_item_name, commission_amount) VALUES (?, 'test', ?, ?)")->execute([$partnerId, $testName, $fAmt]);
                        
                        // Retroactive Update (ONLY PENDING)
                        $pdo->prepare("UPDATE test_items SET commission_amount = ? WHERE referral_partner_id = ? AND test_name = ? AND commission_status = 'pending'")->execute([$fAmt, $partnerId, $testName]);
                    }
                }
            }
            
            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => 'Global rates updated successfully (applied to future and pending transactions)']);

        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Global update error: ' . $e->getMessage()]);
        }

    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }

} else {
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
}
