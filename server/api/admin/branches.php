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
            'message' => 'Fatal Error: ' . $error['message'] . ' in ' . $error['file'] . ' on line ' . $error['line']
        ]);
        exit;
    }
});

// Robust DB discovery
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

if ($method === 'GET') {
    if ($action === 'fetch_branches') {
        $userId = $_GET['user_id'] ?? 0;
        
        try {
            // Check user role
            $stmtUser = $pdo->prepare("SELECT r.role_name FROM employees e JOIN roles r ON e.role_id = r.role_id WHERE e.employee_id = ?");
            $stmtUser->execute([$userId]);
            $userRole = $stmtUser->fetchColumn();

            if ($userRole === 'superadmin') {
                $sql = "SELECT b.*, 
                        (SELECT daily_budget_amount FROM branch_budgets bb WHERE bb.branch_id = b.branch_id ORDER BY effective_from_date DESC, created_at DESC LIMIT 1) as current_budget,
                        e.first_name as admin_first_name, e.last_name as admin_last_name
                        FROM branches b
                        LEFT JOIN employees e ON b.admin_employee_id = e.employee_id
                        ORDER BY b.branch_name";
                $stmt = $pdo->prepare($sql);
                $stmt->execute();
            } else {
                $sql = "SELECT b.*, 
                        (SELECT daily_budget_amount FROM branch_budgets bb WHERE bb.branch_id = b.branch_id ORDER BY effective_from_date DESC, created_at DESC LIMIT 1) as current_budget,
                        e.first_name as admin_first_name, e.last_name as admin_last_name
                        FROM branches b
                        LEFT JOIN employees e ON b.admin_employee_id = e.employee_id
                        WHERE b.admin_employee_id = ? OR b.created_by = ?
                        ORDER BY b.branch_name";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$userId, $userId]);
            }
            
            $branches = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch admins for dropdown
            $admins = $pdo->query("SELECT employee_id, first_name, last_name FROM employees e JOIN roles r ON e.role_id = r.role_id WHERE r.role_name = 'admin' ORDER BY first_name")->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'status' => 'success',
                'data' => $branches,
                'admins' => $admins
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
} elseif ($method === 'POST') {
    // Handle both JSON and Multipart
    $isMultipart = strpos($_SERVER["CONTENT_TYPE"] ?? '', "multipart/form-data") !== false;
    
    if ($isMultipart) {
        $data = $_POST;
    } else {
        $data = json_decode(file_get_contents("php://input"), true);
    }
    
    $action = $data['action'] ?? $action;

    if ($action === 'save_branch') {
        $branchId = !empty($data['branch_id']) ? (int)$data['branch_id'] : null;
        $userId = $data['user_id'] ?? 0;
        
        $branch_name = trim($data['branch_name'] ?? '');
        $clinic_name = trim($data['clinic_name'] ?? '');
        $phone_primary = trim($data['phone_primary'] ?? '');
        $admin_employee_id = !empty($data['admin_employee_id']) ? (int)$data['admin_employee_id'] : $userId;
        
        if (empty($branch_name) || empty($clinic_name) || empty($phone_primary)) {
            echo json_encode(['status' => 'error', 'message' => 'Required fields missing']);
            exit;
        }

        try {
            // Logo handling if multipart
            $logo_primary = $data['existing_logo_primary'] ?? null;
            $logo_secondary = $data['existing_logo_secondary'] ?? null;

            if ($isMultipart) {
                // Correct absolute path to the root uploads directory
                $uploadDir = realpath(__DIR__ . '/../../../../') . '/uploads/logos/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                if (isset($_FILES['logo_primary']) && $_FILES['logo_primary']['error'] === UPLOAD_ERR_OK) {
                    $ext = pathinfo($_FILES['logo_primary']['name'], PATHINFO_EXTENSION);
                    $name = "branch_pri_" . time() . "_" . rand(100, 999) . "." . $ext;
                    if (move_uploaded_file($_FILES['logo_primary']['tmp_name'], $uploadDir . $name)) {
                        $logo_primary = 'uploads/logos/' . $name;
                    }
                }
                if (isset($_FILES['logo_secondary']) && $_FILES['logo_secondary']['error'] === UPLOAD_ERR_OK) {
                    $ext = pathinfo($_FILES['logo_secondary']['name'], PATHINFO_EXTENSION);
                    $name = "branch_sec_" . time() . "_" . rand(100, 999) . "." . $ext;
                    if (move_uploaded_file($_FILES['logo_secondary']['tmp_name'], $uploadDir . $name)) {
                        $logo_secondary = 'uploads/logos/' . $name;
                    }
                }
            }

            if ($branchId) {
                $sql = "UPDATE branches SET 
                        branch_name=?, clinic_name=?, address_line_1=?, address_line_2=?, 
                        city=?, state=?, pincode=?, phone_primary=?, phone_secondary=?, 
                        email=?, logo_primary_path=?, logo_secondary_path=?, is_active=?, admin_employee_id=? 
                        WHERE branch_id=?";
                $params = [
                    $branch_name, $clinic_name, $data['address_line_1'] ?? '', $data['address_line_2'] ?? '',
                    $data['city'] ?? '', $data['state'] ?? '', $data['pincode'] ?? '', $phone_primary, $data['phone_secondary'] ?? '',
                    $data['email'] ?? '', $logo_primary, $logo_secondary, $data['is_active'] ?? 1, 
                    $admin_employee_id, $branchId
                ];
            } else {
                $sql = "INSERT INTO branches (
                            branch_name, clinic_name, address_line_1, address_line_2, 
                            city, state, pincode, phone_primary, phone_secondary, 
                            email, logo_primary_path, logo_secondary_path, is_active, created_by, admin_employee_id
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $params = [
                    $branch_name, $clinic_name, $data['address_line_1'] ?? '', $data['address_line_2'] ?? '',
                    $data['city'] ?? '', $data['state'] ?? '', $data['pincode'] ?? '', $phone_primary, $data['phone_secondary'] ?? '',
                    $data['email'] ?? '', $logo_primary, $logo_secondary, $data['is_active'] ?? 1, $userId, $admin_employee_id
                ];
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            echo json_encode(['status' => 'success', 'message' => $branchId ? 'Branch updated' : 'Branch created']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    } elseif ($action === 'save_budget') {
        $branchId = (int)$data['branch_id'];
        $amount = (float)$data['daily_budget_amount'];
        $effectiveDate = $data['effective_from_date'] ?? date('Y-m-d');
        $userId = $data['user_id'] ?? 0;

        try {
            $stmt = $pdo->prepare("INSERT INTO branch_budgets (branch_id, daily_budget_amount, effective_from_date, created_by_employee_id) VALUES (?, ?, ?, ?)");
            $stmt->execute([$branchId, $amount, $effectiveDate, $userId]);
            echo json_encode(['status' => 'success', 'message' => 'Budget updated']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    } elseif ($action === 'toggle_status') {
        $branchId = (int)$data['branch_id'];
        $newStatus = (int)$data['is_active'];

        try {
            $stmt = $pdo->prepare("UPDATE branches SET is_active = ? WHERE branch_id = ?");
            $stmt->execute([$newStatus, $branchId]);
            echo json_encode(['status' => 'success', 'message' => 'Status updated']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
}
