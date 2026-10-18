<?php
// Hostamar lite fallback API — 0-taka layer [3] of the 5-layer stack.
// PC on  -> Cloudflare Worker (api.hostamar.com) proxies your computer (primary).
// PC off -> this lite API answers, so no request ever sees a 502.
$p = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if ($p === '/health' || $p === '/api/health' || str_ends_with($p, '/health')) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok', 'service' => 'hostamar-lite-fallback',
        'site' => 'hostamar.alwaysdata.net', 'time' => gmdate('c')]);
    exit;
}
http_response_code(202);
header('Content-Type: application/json');
echo json_encode(['status' => 'PC offline, your request is queued',
    'service' => 'hostamar-lite-fallback', 'retry_after' => 60,
    'hint' => 'Primary (PC) unreachable - retry when the PC is back online.']);
