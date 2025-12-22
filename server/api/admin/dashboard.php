<?php
// server/api/admin/dashboard.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

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
        break;
    }
}

if (!$dbFound) {
    echo json_encode(['status' => 'error', 'message' => 'Database configuration not found']);
    exit;
}

$branch_id = isset($_GET['branch_id']) ? intval($_GET['branch_id']) : 0;
// If branch_id is 0, we treat it as ALL branches (SuperAdmin view), 
// but for simplicity query construction, we'll assume > 0 usually.
// If 0, we can use 1=1 or similar trick, but let's strictly filter if > 0.

$whereBranch = "";
$params = [];
if ($branch_id > 0) {
    $whereBranch = "AND branch_id = ?";
    $params[] = $branch_id;
} else {
    // If 0, ideally we should check user role, but here we assume caller has rights to see all if they pass 0?
    // Or we just default to "ALL".
    $whereBranch = "AND 1=1"; 
}

// Helper to bind params easily
// We need to reset params array for each query type if we reuse it
function getParams($branch_id, $extras = []) {
    $p = [];
    if($branch_id > 0) $p[] = $branch_id;
    return array_merge($p, $extras);
}

$today = date('Y-m-d');
$startOfMonth = date('Y-m-01');
$endOfMonth = date('Y-m-t');
$thirtyDaysAgo = date('Y-m-d', strtotime('-30 days'));

$response = [
    'status' => 'success',
    'kpi' => [],
    'charts' => []
];

try {
    // --- 1. REGISTRATIONS ---
    // All Time
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM registration WHERE 1=1 $whereBranch");
    $stmt->execute(getParams($branch_id));
    $regTotal = $stmt->fetchColumn() ?: 0;

    // Today Total
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM registration WHERE DATE(created_at) = ? $whereBranch");
    $stmt->execute(getParams($branch_id, [$today])); // Params order: branch first? No, query struct is "WHERE branch_id = ? AND date = ?"
    // Wait, my $whereBranch is "AND branch_id = ?". So "WHERE 1=1 AND branch_id = ?" works.
    // Query: "WHERE DATE(created_at) = ? AND branch_id = ?" (if I append) or "WHERE branch_id = ? AND DATE = ?"
    // Let's be explicit:
    
    $branchClause = ($branch_id > 0) ? "branch_id = ?" : "1=1";
    $pBranch = ($branch_id > 0) ? [$branch_id] : [];

    // Today
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM registration WHERE $branchClause AND DATE(created_at) = ?");
    $stmt->execute(array_merge($pBranch, [$today]));
    $regToday = $stmt->fetchColumn() ?: 0;

    // Today Breakdown
    $regWait = 0; $regCncl = 0; $regDone = 0;
    $stmt = $pdo->prepare("SELECT status, COUNT(*) as c FROM registration WHERE $branchClause AND DATE(created_at) = ? GROUP BY status");
    $stmt->execute(array_merge($pBranch, [$today]));
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $s = strtolower($row['status']);
        if($s == 'pending') $regWait += $row['c'];
        if($s == 'cancelled') $regCncl += $row['c'];
        if(in_array($s, ['consulted','closed'])) $regDone += $row['c'];
    }

    // Revenue Today (Reg)
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(consultation_amount), 0) FROM registration WHERE $branchClause AND DATE(created_at) = ?");
    $stmt->execute(array_merge($pBranch, [$today]));
    $regRevToday = (float)$stmt->fetchColumn();

    // TOTAL REVENUE (Reg) All Time
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(consultation_amount), 0) FROM registration WHERE $branchClause");
    $stmt->execute($pBranch);
    $regRevTotal = (float)$stmt->fetchColumn();


    // --- 2. PATIENTS ---
    // All Time
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM patients WHERE $branchClause");
    $stmt->execute($pBranch);
    $patTotal = $stmt->fetchColumn() ?: 0;

    // Today
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM patients WHERE $branchClause AND DATE(created_at) = ?");
    $stmt->execute(array_merge($pBranch, [$today]));
    $patToday = $stmt->fetchColumn() ?: 0;

    // Today Breakdown
    $patActive = 0; $patInactive = 0;
    $stmt = $pdo->prepare("SELECT status, COUNT(*) as c FROM patients WHERE $branchClause AND DATE(created_at) = ? GROUP BY status");
    $stmt->execute(array_merge($pBranch, [$today]));
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $s = strtolower($row['status']);
        if($s == 'active') $patActive += $row['c'];
        if($s == 'inactive') $patInactive += $row['c'];
    }

    // Revenue Today (Patients)
    // From payments table
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM payments p JOIN patients pt ON p.patient_id = pt.patient_id WHERE pt.$branchClause AND DATE(p.payment_date) = ?");
    $stmt->execute(array_merge($pBranch, [$today]));
    $patRevToday = (float)$stmt->fetchColumn();

    // Total Revenue (Patients)
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM payments p JOIN patients pt ON p.patient_id = pt.patient_id WHERE pt.$branchClause");
    $stmt->execute($pBranch);
    $patRevTotal = (float)$stmt->fetchColumn();


    // --- 3. TESTS ---
    // All Time
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM tests WHERE $branchClause");
    $stmt->execute($pBranch);
    $testTotal = $stmt->fetchColumn() ?: 0;

    // Today
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM tests WHERE $branchClause AND DATE(created_at) = ?");
    $stmt->execute(array_merge($pBranch, [$today]));
    $testToday = $stmt->fetchColumn() ?: 0;

    // Breakdown Today
    $testPending = 0; $testDone = 0;
    $stmt = $pdo->prepare("SELECT test_status, COUNT(*) as c FROM tests WHERE $branchClause AND DATE(created_at) = ? GROUP BY test_status");
    $stmt->execute(array_merge($pBranch, [$today]));
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $s = strtolower($row['test_status']);
        if($s == 'pending') $testPending += $row['c'];
        if($s == 'completed') $testDone += $row['c'];
    }

    // Revenue Today (Tests - Advance)
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(advance_amount), 0) FROM tests WHERE $branchClause AND DATE(visit_date) = ?");
    $stmt->execute(array_merge($pBranch, [$today]));
    $testRevToday = (float)$stmt->fetchColumn();

    // Total Revenue (Tests)
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(advance_amount), 0) FROM tests WHERE $branchClause");
    $stmt->execute($pBranch);
    $testRevTotal = (float)$stmt->fetchColumn();


    // --- 4. EXPENSES ---
    // All Time
    $stmt = $pdo->prepare("SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM expenses WHERE $branchClause");
    $stmt->execute($pBranch);
    $expRes = $stmt->fetch(PDO::FETCH_NUM);
    $expCountTotal = $expRes[0];
    $expAmountTotal = (float)$expRes[1];

    // Today
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE $branchClause AND DATE(expense_date) = ?");
    $stmt->execute(array_merge($pBranch, [$today]));
    $expAmountToday = (float)$stmt->fetchColumn();


    // --- 5. SESSIONS ---
    // All Time
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM attendance a JOIN patients p ON a.patient_id = p.patient_id WHERE p.$branchClause");
    $stmt->execute($pBranch);
    $sessTotal = $stmt->fetchColumn() ?: 0;

    // Today
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM attendance a JOIN patients p ON a.patient_id = p.patient_id WHERE p.$branchClause AND a.attendance_date = ?");
    $stmt->execute(array_merge($pBranch, [$today]));
    $sessToday = $stmt->fetchColumn() ?: 0;

    // This Month
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM attendance a JOIN patients p ON a.patient_id = p.patient_id WHERE p.$branchClause AND a.attendance_date BETWEEN ? AND ?");
    $stmt->execute(array_merge($pBranch, [$startOfMonth, $endOfMonth]));
    $sessMonth = $stmt->fetchColumn() ?: 0;


    // --- TOTALS ---
    $grandTotalRevenue = $regRevTotal + $patRevTotal + $testRevTotal;
    $todayRevenue = $regRevToday + $patRevToday + $testRevToday;


    // --- CHARTS: FINANCIAL GROWTH (Last 30 Days) ---
    // Revenue
    $stmt = $pdo->prepare("
        SELECT DATE(p.payment_date) as d, SUM(p.amount) as t
        FROM payments p JOIN patients pt ON p.patient_id = pt.patient_id
        WHERE pt.$branchClause AND p.payment_date BETWEEN ? AND ?
        GROUP BY DATE(p.payment_date)
    ");
    $stmt->execute(array_merge($pBranch, [$thirtyDaysAgo, $today]));
    $revMap = [];
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) $revMap[$row['d']] = (float)$row['t'];

    // Expenses
    $stmt = $pdo->prepare("
        SELECT DATE(expense_date) as d, SUM(amount) as t
        FROM expenses
        WHERE $branchClause AND expense_date BETWEEN ? AND ?
        GROUP BY DATE(expense_date)
    ");
    $stmt->execute(array_merge($pBranch, [$thirtyDaysAgo, $today]));
    $expMap = [];
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) $expMap[$row['d']] = (float)$row['t'];

    // Merge for Chart
    $financial_growth = [];
    $curr = new DateTime($thirtyDaysAgo);
    $end = new DateTime($today);
    $end->modify('+1 day');
    while($curr < $end) {
        $d = $curr->format('Y-m-d');
        $financial_growth[] = [
            'date' => $curr->format('d M'),
            'income' => $revMap[$d] ?? 0,
            'expense' => $expMap[$d] ?? 0
        ];
        $curr->modify('+1 day');
    }

    // --- CHART: EXPENSE ANALYSIS ---
    $expense_analysis = [];
    $stmt = $pdo->prepare("SELECT expense_for as category, SUM(amount) as total FROM expenses WHERE $branchClause GROUP BY expense_for ORDER BY total DESC LIMIT 5");
    $stmt->execute($pBranch);
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $expense_analysis[] = [
            'category' => ucwords(str_replace('_', ' ', $row['category'])),
            'amount' => (float)$row['total']
        ];
    }
    
    // --- CHART: TREATMENT PLANS ---
    $treatment_plans = [];
    $stmt = $pdo->prepare("SELECT treatment_type, COUNT(*) as count FROM patients WHERE $branchClause GROUP BY treatment_type");
    $stmt->execute($pBranch);
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $treatment_plans[] = [
            'type' => ucfirst($row['treatment_type']),
            'count' => (int)$row['count']
        ];
    }

    // --- RECENT ACTIVITY (Audit Log) ---
    $recent_activity = [];
    // Check if audit_log table exists (optional but good practice, though we know it does from logger.php)
    try {
        $stmt = $pdo->prepare("
            SELECT username, action_type, target_table, target_id, log_timestamp 
            FROM audit_log 
            WHERE $branchClause 
            ORDER BY log_timestamp DESC 
            LIMIT 5
        ");
        $stmt->execute($pBranch);
        while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $recent_activity[] = [
                'user' => $row['username'],
                'action' => strtoupper($row['action_type']),
                'details' => $row['target_table'] . ' #' . $row['target_id'],
                'time' => date('Y-m-d H:i:s', strtotime($row['log_timestamp']) + 19800) // Adding 5:30 hours for IST
            ];
        }
    } catch (PDOException $e) {
        // Table might not exist or column name mismatch, ignore for now to prevent crash
    }


    $response['kpi'] = [
        'registrations' => [
            'total' => $regTotal,
            'today' => $regToday,
            'revenue_today' => $regRevToday,
            'revenue_total' => $regRevTotal,
            'breakdown' => ['wait' => $regWait, 'cncl' => $regCncl, 'done' => $regDone]
        ],
        'patients' => [
            'total' => $patTotal,
            'today' => $patToday,
            'revenue_today' => $patRevToday,
            'revenue_total' => $patRevTotal, // Note: PatTotalRevenue is actually Total Collected from patients
            'breakdown' => ['active' => $patActive, 'inactive' => $patInactive]
        ],
        'tests' => [
            'total' => $testTotal,
            'today' => $testToday,
            'revenue_today' => $testRevToday,
            'revenue_total' => $testRevTotal,
            'breakdown' => ['pending' => $testPending, 'done' => $testDone]
        ],
        'expenses' => [
            'total_count' => $expCountTotal,
            'total_spend' => $expAmountTotal,
            'today_spend' => $expAmountToday
        ],
        'sessions' => [
            'total' => $sessTotal,
            'today' => $sessToday,
            'month' => $sessMonth
        ],
        'overall' => [
            'today_revenue' => $todayRevenue,
            'total_revenue' => $grandTotalRevenue
        ]
    ];
    
    $response['charts'] = [
        'financial_growth' => $financial_growth,
        'expense_analysis' => $expense_analysis,
        'treatment_plans' => $treatment_plans
    ];
    
    $response['recent_activity'] = $recent_activity;

} catch (PDOException $e) {
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
}

echo json_encode($response);
?>
