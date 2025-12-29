<?php session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../common/db.php';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['registration_id']) || !isset($input['status'])) {
            throw new Exception("Missing registration_id or status");
        }

        $regId = $input['registration_id'];
        $status = $input['status'];
        
        // Validate status if needed, or allow flexible string
        $stmt = $pdo->prepare("UPDATE registration SET status = :status WHERE registration_id = :id");
        $stmt->execute(['status' => $status, 'id' => $regId]);

        echo json_encode(["status" => "success", "message" => "Status updated to $status"]);
        exit;
    }

    // GET Request Logic (Existing)
    // Determine Start (Sunday) and End (Saturday) of current week
    // If today is Sunday, 'last sunday' might jump back a week depending on logic, so be careful.
    // 'sunday this week' works in PHP 5.3+ ?
    // Simpler: 
    // Check for custom date range params
    if (isset($_GET['start_date']) && isset($_GET['end_date'])) {
        $startDate = $_GET['start_date'];
        $endDate = $_GET['end_date'];
    } else {
        // Fallback: Default to current week (Sun-Sat)
        $today = new DateTime();
        $dayOfWeek = $today->format('w'); // 0 (Sun) - 6 (Sat)
        
        $startOfWeek = clone $today;
        $startOfWeek->modify("-$dayOfWeek days"); // Go back to Sunday
        
        $endOfWeek = clone $startOfWeek;
        $endOfWeek->modify("+6 days"); // Go forward to Saturday
        
        $startDate = $startOfWeek->format('Y-m-d');
        $endDate = $endOfWeek->format('Y-m-d');
    }

    // STRICT BRANCH ISOLATION
    $employeeId = $_GET['employee_id'] ?? $_REQUEST['employee_id'] ?? $_SESSION['employee_id'] ?? null;
    $branchId = 0;
    if ($employeeId) {
        $stmtB = $pdo->prepare("SELECT branch_id FROM employees WHERE employee_id = ?");
        $stmtB->execute([$employeeId]);
        $val = $stmtB->fetchColumn();
        if ($val) $branchId = $val;
    }
    if (!$branchId && isset($_GET["branch_id"])) { $branchId = (int)$_GET["branch_id"]; }
if (!$branchId) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized: Branch ID required.']);
        exit;
    } 

    $stmt = $pdo->prepare("
        SELECT 
            registration_id, 
            patient_name, 
            appointment_time, 
            appointment_date,
            status, 
            phone_number,
            gender,
            age
        FROM registration 
        WHERE branch_id = :bid 
          AND appointment_date BETWEEN :start AND :end
        ORDER BY appointment_date DESC, appointment_time DESC
    ");
    
    $stmt->execute([
        'bid' => $branchId, 
        'start' => $startDate, 
        'end' => $endDate
    ]);
    $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $appointments,
        "period" => "$startDate to $endDate"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
