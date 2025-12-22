<?php
// server/api/admin/staff.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

ini_set('display_errors', '0');
error_reporting(E_ALL);

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
    // Robust DB connection
    $dbPaths = [
        __DIR__ . '/../../../../common/db.php',
        __DIR__ . '/../../../common/db.php',
        __DIR__ . '/../../common/db.php',
        $_SERVER['DOCUMENT_ROOT'] . '/admin/common/db.php',
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
        throw new Exception("Database config not found.");
    }

    $data = json_decode(file_get_contents("php://input"), true);
    $action = $data['action'] ?? $_GET['action'] ?? '';
    
    // Admin context
    $adminId = $data['user_id'] ?? $_GET['user_id'] ?? 0;
    
    if (!$adminId && $action !== '') {
        // Allow GET without user_id if we want, but usually we need it for scoping.
        // For fetch_staff, strict scoping is needed.
        throw new Exception("Admin User ID is required");
    }

    if ($action === 'fetch_staff') {
        // 1. Determine Access
        $stmtRole = $pdo->prepare("SELECT role_id, role_name FROM roles WHERE role_id = (SELECT role_id FROM employees WHERE employee_id = ?)");
        $stmtRole->execute([$adminId]);
        $adminRole = $stmtRole->fetch(PDO::FETCH_ASSOC);
        $roleName = strtolower($adminRole['role_name'] ?? '');

        // 2. Get Accessible Branches
        $accessibleBranchIds = [];
        $branches = [];

        if ($roleName === 'superadmin') {
            $stmtB = $pdo->query("SELECT branch_id, branch_name FROM branches ORDER BY branch_name");
            $branches = $stmtB->fetchAll(PDO::FETCH_ASSOC);
        } else {
            // Created by me OR managed by me
            $stmtB = $pdo->prepare("SELECT branch_id, branch_name FROM branches WHERE created_by = ? OR admin_employee_id = ? ORDER BY branch_name");
            $stmtB->execute([$adminId, $adminId]);
            $branches = $stmtB->fetchAll(PDO::FETCH_ASSOC);
        }

        if (empty($branches)) {
             // Return empty structure
             echo json_encode([
                 'status' => 'success',
                 'data' => [],
                 'kpi' => ['total' => 0, 'active' => 0, 'inactive' => 0],
                 'branches' => [],
                 'roles' => []
             ]);
             exit;
        }

        $accessibleBranchIds = array_column($branches, 'branch_id');
        $branchInClause = implode(',', array_map('intval', $accessibleBranchIds));

        // 3. Fetch Staff
        $query = "
            SELECT 
                e.employee_id, e.first_name, e.last_name, e.email, e.phone_number, e.address,
                e.date_of_joining, e.is_active, e.role_id, e.branch_id, e.job_title,
                r.role_name, b.branch_name
            FROM employees e
            LEFT JOIN roles r ON e.role_id = r.role_id
            LEFT JOIN branches b ON e.branch_id = b.branch_id
            WHERE (r.role_name != 'superadmin' OR r.role_name IS NULL)
            AND e.branch_id IN ($branchInClause)
            ORDER BY e.employee_id DESC
        ";
        
        $stmt = $pdo->query($query);
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 4. Fetch Roles for Dropdown
        $rolesRef = $pdo->query("SELECT role_id, role_name FROM roles WHERE role_name != 'superadmin' ORDER BY role_name")->fetchAll(PDO::FETCH_ASSOC);

        // 5. Calculate KPI
        $kpi = [
            'total' => count($employees),
            'active' => 0,
            'inactive' => 0
        ];
        foreach ($employees as $emp) {
            if ($emp['is_active']) $kpi['active']++;
            else $kpi['inactive']++;
        }

        echo json_encode([
            'status' => 'success',
            'data' => $employees,
            'kpi' => $kpi,
            'branches' => $branches,
            'roles' => $rolesRef
        ]);

    } elseif ($action === 'create_staff') {
        // Validation...
        $firstName = trim($data['first_name'] ?? '');
        $lastName = trim($data['last_name'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');
        $roleId = intval($data['role_id'] ?? 0);
        $branchId = intval($data['branch_id'] ?? 0);

        if (!$firstName || !$lastName || !$email || !$password || !$roleId) {
            throw new Exception("Missing required fields.");
        }

        // Check duplicate email
        $chk = $pdo->prepare("SELECT employee_id FROM employees WHERE email = ?");
        $chk->execute([$email]);
        if ($chk->fetch()) {
            throw new Exception("Email already exists.");
        }

        $hashed = password_hash($password, PASSWORD_DEFAULT);
        
        $sql = "INSERT INTO employees (first_name, last_name, email, password_hash, role_id, branch_id, phone_number, job_title, address, date_of_joining, is_active, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $firstName,
            $lastName,
            $email,
            $hashed,
            $roleId,
            $branchId ?: null, // null if 0 (Global/None)
            $data['phone_number'] ?? null,
            $data['job_title'] ?? null,
            $data['address'] ?? null,
            $data['date_of_joining'] ?: date('Y-m-d')
        ]);

        echo json_encode(['status' => 'success', 'message' => 'Staff created successfully']);

    } elseif ($action === 'update_staff') {
        $empId = intval($data['employee_id'] ?? 0);
        if (!$empId) throw new Exception("Employee ID required");

        $firstName = trim($data['first_name'] ?? '');
        $lastName = trim($data['last_name'] ?? '');
        $email = trim($data['email'] ?? '');
        $roleId = intval($data['role_id'] ?? 0);
        
        // Optional password update
        $password = trim($data['password'] ?? '');

        // Basic fields
        $sql = "UPDATE employees SET first_name=?, last_name=?, email=?, role_id=?, branch_id=?, phone_number=?, job_title=?, address=?, date_of_joining=?, is_active=? WHERE employee_id=?";
        $params = [
            $firstName, $lastName, $email, $roleId, 
            intval($data['branch_id']) ?: null,
            $data['phone_number'] ?? null,
            $data['job_title'] ?? null,
            $data['address'] ?? null,
            $data['date_of_joining'] ?? null,
            intval($data['is_active']),
            $empId
        ];
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Update password if provided
        if ($password) {
            $hashed = password_hash($password, PASSWORD_DEFAULT);
            $stmtPw = $pdo->prepare("UPDATE employees SET password_hash = ? WHERE employee_id = ?");
            $stmtPw->execute([$hashed, $empId]);
        }

        echo json_encode(['status' => 'success', 'message' => 'Staff updated successfully']);

    } else {
        throw new Exception("Invalid action: $action");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
