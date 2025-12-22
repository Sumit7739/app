<?php
// server/api/admin/ledger.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
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
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database configuration not found']);
    exit;
}

$branch_id = isset($_GET['branch_id']) ? intval($_GET['branch_id']) : 0;
// Default to current month if not provided
$start_date = isset($_GET['start_date']) ? $_GET['start_date'] : date('Y-m-01');
$end_date = isset($_GET['end_date']) ? $_GET['end_date'] : date('Y-m-t');

// Filter parameters
$whereBranch = "";
$initialParams = [];

// Branch Logic: If 0 (All branches/Superadmin), use 1=1. If specific, filter.
if ($branch_id > 0) {
    $whereBranch = "AND branch_id = :branch_id";
    // We will bind :branch_id later, need to ensure logic handles it
} else {
    $whereBranch = "AND 1=1";
}

try {
    // 1. Calculate Opening Balance (before start_date)
    
    // We bind parameters uniquely to avoid PDO "Invalid parameter number" errors on some drivers
    $openingParams = [
        ':start1' => $start_date,
        ':start2' => $start_date,
        ':start3' => $start_date,
        ':start4' => $start_date
    ];
    if ($branch_id > 0) {
        $openingParams[':branch_id'] = $branch_id;
    }

    // Opening Balance SQL - Summing Cash and Online separately
    $sql_opening = "
        SELECT 
            SUM(CASE WHEN method_category = 'cash' THEN amount ELSE 0 END) as total_cash,
            SUM(CASE WHEN method_category = 'online' THEN amount ELSE 0 END) as total_online
        FROM (
            SELECT r.consultation_amount AS amount, r.branch_id, CASE WHEN r.payment_method IN ('cash', 'Cash') THEN 'cash' ELSE 'online' END as method_category 
            FROM registration r WHERE r.created_at < :start1 AND r.status NOT IN ('closed', 'cancelled') AND r.consultation_amount > 0
            
            UNION ALL
            
            SELECT t.advance_amount AS amount, t.branch_id, CASE WHEN t.payment_method IN ('cash', 'Cash') THEN 'cash' ELSE 'online' END as method_category 
            FROM tests t WHERE t.visit_date < :start2 AND t.test_status != 'cancelled' AND t.advance_amount > 0
            
            UNION ALL
            
            SELECT p.amount AS amount, pt.branch_id, CASE WHEN p.mode IN ('cash', 'Cash') THEN 'cash' ELSE 'online' END as method_category 
            FROM payments p 
            JOIN patients pt ON p.patient_id = pt.patient_id 
            JOIN registration r ON pt.registration_id = r.registration_id 
            WHERE p.payment_date < :start3 AND p.amount > 0
            
            UNION ALL
            
            SELECT -e.amount AS amount, e.branch_id, CASE WHEN e.payment_method IN ('cash', 'Cash') THEN 'cash' ELSE 'online' END as method_category 
            FROM expenses e WHERE e.expense_date < :start4 AND e.status = 'approved'
        ) AS opening_balance_transactions
        WHERE 1=1 $whereBranch
    ";

    $stmt_opening = $pdo->prepare($sql_opening);
    $stmt_opening->execute($openingParams);
    $opening_totals = $stmt_opening->fetch(PDO::FETCH_ASSOC);

    $opening_balance_cash = $opening_totals ? (float)$opening_totals['total_cash'] : 0.0;
    $opening_balance_online = $opening_totals ? (float)$opening_totals['total_online'] : 0.0;
    $opening_balance_total = $opening_balance_cash + $opening_balance_online;


    // 2. Fetch Transactions (within date range)
    $txnParams = [
        ':start_date' => $start_date,
        ':end_date' => $end_date
    ];
    if ($branch_id > 0) {
        $txnParams[':branch_id'] = $branch_id;
    }

    $sql_txns = "
        SELECT 
            date,
            description,
            branch_id,
            branch_name,
            credit,
            debit,
            CASE 
                WHEN payment_method IN ('cash', 'Cash') THEN 'cash'
                ELSE 'online'
            END as method_category
        FROM (
            -- 1. Registration Payments
            SELECT 
                r.created_at AS date,
                CONCAT('Registration Fee for ', r.patient_name) AS description,
                r.branch_id,
                b.branch_name,
                r.consultation_amount AS credit,
                0 AS debit,
                r.payment_method
            FROM registration r
            LEFT JOIN branches b ON r.branch_id = b.branch_id
            WHERE r.status NOT IN ('closed', 'cancelled') AND r.consultation_amount > 0

            UNION ALL

            -- 2. Test Payments
            SELECT 
                t.visit_date AS date,
                CONCAT('Test Fee for ', t.patient_name) AS description,
                t.branch_id,
                b.branch_name,
                t.advance_amount AS credit,
                0 AS debit,
                t.payment_method
            FROM tests t
            LEFT JOIN branches b ON t.branch_id = b.branch_id
            WHERE t.test_status != 'cancelled' AND t.advance_amount > 0

            UNION ALL

            -- 3. Patient Treatment Payments
            SELECT 
                p.payment_date AS date,
                CONCAT('Treatment payment from ', r.patient_name) AS description,
                pt.branch_id,
                b.branch_name,
                p.amount AS credit,
                0 AS debit,
                p.mode AS payment_method
            FROM payments p
            JOIN patients pt ON p.patient_id = pt.patient_id
            JOIN registration r ON pt.registration_id = r.registration_id
            LEFT JOIN branches b ON pt.branch_id = b.branch_id
            WHERE p.amount > 0

            UNION ALL

            -- 4. Expenses
            SELECT 
                e.expense_date AS date,
                CONCAT(e.paid_to, ' - ', e.description) AS description,
                e.branch_id,
                b.branch_name,
                0 AS credit,
                e.amount AS debit,
                e.payment_method
            FROM expenses e
            LEFT JOIN branches b ON e.branch_id = b.branch_id
            WHERE e.status = 'approved'
        ) AS all_transactions
        WHERE date BETWEEN :start_date AND :end_date
        $whereBranch
        ORDER BY date ASC, credit DESC
    ";

    $stmt = $pdo->prepare($sql_txns);
    $stmt->execute($txnParams);
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Process Daily Summaries
    $daily_summary = [];
    $total_credit = 0.0;
    $total_debit = 0.0;
    
    // Group transactions by date
    $grouped_txns = [];
    foreach ($transactions as $txn) {
        $date = date('Y-m-d', strtotime($txn['date']));
        if (!isset($grouped_txns[$date])) {
            $grouped_txns[$date] = [
                'credits' => ['total' => 0.0, 'cash' => 0.0, 'online' => 0.0],
                'debits' => ['total' => 0.0, 'cash' => 0.0, 'online' => 0.0],
                'transactions' => []
            ];
        }
        
        $credit = (float)$txn['credit'];
        $debit = (float)$txn['debit'];
        $method = $txn['method_category'];

        $grouped_txns[$date]['transactions'][] = [
            'description' => $txn['description'],
            'branch_name' => $txn['branch_name'],
            'method' => $method, // 'cash' or 'online'
            'credit' => $credit,
            'debit' => $debit,
            'time' => date('H:i', strtotime($txn['date']))
        ];

        if ($credit > 0) {
            $grouped_txns[$date]['credits']['total'] += $credit;
            $grouped_txns[$date]['credits'][$method] += $credit;
            $total_credit += $credit;
        }
        if ($debit > 0) {
            $grouped_txns[$date]['debits']['total'] += $debit;
            $grouped_txns[$date]['debits'][$method] += $debit;
            $total_debit += $debit;
        }
    }

    // Calculate Running Balances
    $running_cash = $opening_balance_cash;
    $running_online = $opening_balance_online;

    // We process chronologically (ASC) to build balances correctly, but will need to return result sorted DESC perhaps?
    // The legacy code sorted days DESC for display but calculated logic ASC.
    // Let's sort keys ASC first.
    ksort($grouped_txns);

    $formatted_daily_summary = [];
    foreach ($grouped_txns as $date => $data) {
        $opening_cash = $running_cash;
        $opening_online = $running_online;

        $running_cash += $data['credits']['cash'] - $data['debits']['cash'];
        $running_online += $data['credits']['online'] - $data['debits']['online'];

        // Add to result. We can format here for frontend convenience
        // Format this structure similar to legacy but clean JSON
        $formatted_daily_summary[] = [
            'date' => $date,
            'opening_balance' => [
                'total' => $opening_cash + $opening_online,
                'cash' => $opening_cash,
                'online' => $opening_online
            ],
            'credits' => $data['credits'],
            'debits' => $data['debits'],
            'closing_balance' => [
                'total' => $running_cash + $running_online,
                'cash' => $running_cash,
                'online' => $running_online
            ],
            'transactions' => $data['transactions']
        ];
    }

    // Sort Descending for UI (Newest First)
    usort($formatted_daily_summary, function($a, $b) {
        return strtotime($b['date']) - strtotime($a['date']);
    });

    $net_profit_loss = $total_credit - $total_debit;
    $current_balance = $opening_balance_total + $net_profit_loss;

    echo json_encode([
        'status' => 'success',
        'summary' => [
            'total_income' => $total_credit,
            'total_expenses' => $total_debit,
            'net_profit_loss' => $net_profit_loss,
            'opening_balance' => $opening_balance_total,
            'current_balance' => $current_balance
        ],
        'ledger' => $formatted_daily_summary
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
