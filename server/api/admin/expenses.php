<?php
// server/api/admin/expenses.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Error Handling for Debugging
ini_set('display_errors', '0');
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR || $error['type'] === E_COMPILE_ERROR)) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Fatal Error: ' . $error['message'] . ' in ' . $error['file'] . ' on line ' . $error['line']]);
        exit;
    }
});

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database Access
$dbPaths = [
    __DIR__ . '/../../../common/db.php',
    __DIR__ . '/../../common/db.php',
    __DIR__ . '/../../../../common/db.php'
];

$dbFound = false;
foreach ($dbPaths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $dbFound = true;
        
        // Try to locate logger in the same directory as db.php
        $loggerPath = dirname($path) . '/logger.php';
        if (file_exists($loggerPath)) {
            require_once $loggerPath;
        }
        break;
    }
}

if (!$dbFound) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database configuration not found']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Helper to get Authorization header or similar for user ID
// For now, we assume user ID is passed in params for proof of concept or mobile API convention used so far.
// In a real secure app, we'd extract from JWT or Session.
// We will accept 'user_id' in POST body for actions.

if ($method === 'GET') {
    $type = isset($_GET['type']) ? $_GET['type'] : 'clinic'; // 'clinic' or 'admin'
    $branch_id = isset($_GET['branch_id']) ? intval($_GET['branch_id']) : 0;
    $status = isset($_GET['status']) ? $_GET['status'] : '';
    $start_date = isset($_GET['start_date']) ? $_GET['start_date'] : '';
    $end_date = isset($_GET['end_date']) ? $_GET['end_date'] : '';
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    
    // Pagination
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $offset = ($page - 1) * $limit;

    try {
        $params = [];
        $whereClauses = [];

        // Base Query
        $sql = "
            SELECT 
                e.*, 
                b.branch_name, 
                CONCAT(creator_emp.first_name, ' ', creator_emp.last_name) AS creator_username,
                CONCAT(approver_emp.first_name, ' ', approver_emp.last_name) AS approver_username,
                r.role_name
            FROM expenses e
            JOIN branches b ON e.branch_id = b.branch_id
            LEFT JOIN employees creator_emp ON e.user_id = creator_emp.employee_id
            LEFT JOIN roles r ON creator_emp.role_id = r.role_id
            LEFT JOIN employees approver_emp ON e.approved_by_user_id = approver_emp.employee_id
            WHERE 1=1
        ";

        // Filter by Type (Clinic vs Admin)
        if ($type === 'admin') {
            $whereClauses[] = "r.role_name IN ('admin', 'superadmin')";
        } else {
            // Clinic = Reception
            $whereClauses[] = "r.role_name = 'reception'";
        }

        // Filter by Branch
        if ($branch_id > 0) {
            $whereClauses[] = "e.branch_id = :branch_id";
            $params[':branch_id'] = $branch_id;
        }

        // Filter by Status
        if (!empty($status)) {
            $whereClauses[] = "e.status = :status";
            $params[':status'] = $status;
        }

        // Filter by Date Range
        if (!empty($start_date) && !empty($end_date)) {
            $whereClauses[] = "e.expense_date BETWEEN :start_date AND :end_date";
            $params[':start_date'] = $start_date;
            $params[':end_date'] = $end_date;
        }

        // Search
        if (!empty($search)) {
            $whereClauses[] = "(e.voucher_no LIKE :search OR e.paid_to LIKE :search OR e.description LIKE :search)";
            $params[':search'] = "%$search%";
        }

        // Append Where Clauses
        if (count($whereClauses) > 0) {
            $sql .= " AND " . implode(" AND ", $whereClauses);
        }

        // Order
        $sql .= " ORDER BY e.expense_date DESC, e.created_at DESC";

        // Pagination
        $sql .= " LIMIT :limit OFFSET :offset";
        // Bind for pagination (integers)
        // PDO bindValue is safer for limit/offset
        
        // Prepare statement
        $stmt = $pdo->prepare($sql);
        
        // Bind generated params
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        // Bind limit/offset explicitly as ints
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT); // Fixed variable name here

        $stmt->execute();
        $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch Total Count for pagination info
        // Simplified count query
        $countSql = "
            SELECT COUNT(*)
            FROM expenses e
            JOIN branches b ON e.branch_id = b.branch_id
            LEFT JOIN employees creator_emp ON e.user_id = creator_emp.employee_id
            LEFT JOIN roles r ON creator_emp.role_id = r.role_id
            WHERE 1=1
        ";
        if (count($whereClauses) > 0) {
            $countSql .= " AND " . implode(" AND ", $whereClauses);
        }
        $countStmt = $pdo->prepare($countSql);
        foreach ($params as $key => $value) {
            $countStmt->bindValue($key, $value);
        }
        $countStmt->execute();
        $total = $countStmt->fetchColumn();

        // Calculate Stats (Optional, maybe for header cards)
        // Total Amount for current view
        $statsSql = "
            SELECT SUM(e.amount)
            FROM expenses e
            JOIN branches b ON e.branch_id = b.branch_id
            LEFT JOIN employees creator_emp ON e.user_id = creator_emp.employee_id
            LEFT JOIN roles r ON creator_emp.role_id = r.role_id
            WHERE 1=1
        ";
        if (count($whereClauses) > 0) {
            $statsSql .= " AND " . implode(" AND ", $whereClauses);
        }
        $statsStmt = $pdo->prepare($statsSql);
        foreach ($params as $key => $value) {
            $statsStmt->bindValue($key, $value);
        }
        $statsStmt->execute();
        $totalAmount = $statsStmt->fetchColumn() ?: 0;


        echo json_encode([
            'status' => 'success',
            'data' => $expenses,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_items' => intval($total),
                'total_pages' => ceil($total / $limit)
            ],
            'stats' => [
                'total_amount' => $totalAmount
            ]
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }

} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = $data['action'] ?? '';
    // We expect user_id in the body from the mobile app auth store
    $adminUserId = $data['user_id'] ?? 0; 

    if (!$adminUserId) {
         http_response_code(401);
         echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
         exit;
    }

    // Get User Info with Role and Branch
    $stmtUser = $pdo->prepare("
        SELECT 
            CONCAT(e.first_name, ' ', e.last_name) as username,
            r.role_name,
            e.branch_id
        FROM employees e
        LEFT JOIN roles r ON e.role_id = r.role_id
        WHERE e.employee_id = ?
    ");
    $stmtUser->execute([$adminUserId]);
    $userInfo = $stmtUser->fetch(PDO::FETCH_ASSOC);
    
    $adminUsername = $userInfo['username'] ?? 'Unknown';
    $userRole = strtolower($userInfo['role_name'] ?? '');
    $userBranchId = $userInfo['branch_id'] ?? 0;

    if ($action === 'get_branches') {
        try {
            if ($userRole === 'superadmin') {
                $stmt = $pdo->query("SELECT branch_id, branch_name FROM branches WHERE is_active = 1");
            } else {
                $stmt = $pdo->prepare("SELECT branch_id, branch_name FROM branches WHERE branch_id = ? AND is_active = 1");
                $stmt->execute([$userBranchId]);
            }
            $branches = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['status' => 'success', 'data' => $branches]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'create_admin_expense') {
        try {
            // Validation
            $branchId = intval($data['branch_id'] ?? 0);
            $amount = floatval($data['amount'] ?? 0);
            $expenseDate = $data['expense_date'] ?? date('Y-m-d');
            $category = trim($data['category'] ?? '');
            $paidTo = trim($data['paid_to'] ?? '');
            $paymentMethod = trim($data['payment_method'] ?? '');
            $description = trim($data['description'] ?? '');
            $chequeDetails = trim($data['cheque_details'] ?? '');

            if (!$branchId || $amount <= 0 || empty($category) || empty($paidTo) || empty($paymentMethod)) {
                throw new Exception("Missing required fields");
            }

            // Generate Voucher
            $voucherNo = 'ADM-EXP-' . strtoupper(uniqid());

            // Amount in Words Helper
            $amountInWords = "Rupees " . number_format($amount, 2) . " Only";

            $pdo->beginTransaction();

            $stmt = $pdo->prepare("
                INSERT INTO expenses (
                    branch_id, user_id, employee_id, voucher_no, expense_date, 
                    paid_to, expense_done_by, expense_for, description, 
                    amount, amount_in_words, payment_method, cheque_details, status, 
                    approved_by_user_id, approved_at, created_at, updated_at
                ) VALUES (
                    :branch_id, :user_id, :employee_id, :voucher_no, :expense_date, 
                    :paid_to, :expense_done_by, :expense_for, :description, 
                    :amount, :amount_in_words, :payment_method, :cheque_details, 'approved', 
                    :approved_by_user_id, NOW(), NOW(), NOW()
                )
            ");

            $stmt->execute([
                ':branch_id' => $branchId,
                ':user_id' => $adminUserId,
                ':employee_id' => $adminUserId, // Using adminUserId as employee_id
                ':voucher_no' => $voucherNo,
                ':expense_date' => $expenseDate,
                ':paid_to' => $paidTo,
                ':expense_done_by' => $adminUsername,
                ':expense_for' => $category,
                ':description' => $description,
                ':amount' => $amount,
                ':amount_in_words' => $amountInWords,
                ':payment_method' => $paymentMethod,
                ':cheque_details' => ($paymentMethod === 'cheque') ? $chequeDetails : null,
                ':approved_by_user_id' => $adminUserId
            ]);
            
            $newId = $pdo->lastInsertId();

            // Log Activity
            if (function_exists('log_activity')) {
                log_activity($pdo, $adminUserId, $adminUsername, $branchId, 'CREATE', 'expenses', (int)$newId, null, ['amount' => $amount, 'voucher' => $voucherNo]);
            }

            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => 'Expense created successfully']);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'update_status') {
        $expenseId = intval($data['expense_id'] ?? 0);
        $newStatus = trim($data['status'] ?? '');

        if ($expenseId && in_array($newStatus, ['pending', 'approved', 'rejected', 'paid'])) {
            try {
                $pdo->beginTransaction();

                // Fetch current state
                $stmtBefore = $pdo->prepare("SELECT * FROM expenses WHERE expense_id = ?");
                $stmtBefore->execute([$expenseId]);
                $detailsBefore = $stmtBefore->fetch(PDO::FETCH_ASSOC);

                if (!$detailsBefore) {
                    throw new Exception("Expense not found");
                }

                $sql = "UPDATE expenses SET status = :status";
                $params = [':status' => $newStatus, ':expense_id' => $expenseId];

                if ($newStatus === 'approved') {
                    $sql .= ", approved_by_user_id = :approved_by, approved_at = NOW()";
                    $params[':approved_by'] = $adminUserId;
                } else {
                    // Reset approval if not approved (or maintain if already approved? Logic says reset if strictly changing status)
                    // The legacy code resets it: approved_by_user_id = NULL
                    $sql .= ", approved_by_user_id = NULL, approved_at = NULL";
                }

                $sql .= " WHERE expense_id = :expense_id";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);

                // Fetch updated state
                $stmtAfter = $pdo->prepare("SELECT * FROM expenses WHERE expense_id = ?");
                $stmtAfter->execute([$expenseId]);
                $detailsAfter = $stmtAfter->fetch(PDO::FETCH_ASSOC);

                // Log Activity
                if (function_exists('log_activity')) {
                    log_activity($pdo, $adminUserId, $adminUsername, $detailsBefore['branch_id'], 'UPDATE', 'expenses', $expenseId, $detailsBefore, $detailsAfter);
                }

                $pdo->commit();
                echo json_encode(['status' => 'success', 'message' => 'Status updated successfully']);

            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid parameters']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
}
