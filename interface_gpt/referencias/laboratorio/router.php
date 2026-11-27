<?php
// HTTP guard only: no authentication/session changes, no alternate routes.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if ($path === '/' || $path === '/index.php' || str_starts_with($path, '/index.php/')) {
    require '/var/www/html/index.php';
    return true;
}
if (str_starts_with($path, '/assets/') && !str_contains($path, '..') && preg_match('/\.(css|js|mjs|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|map)$/i', $path)) {
    return false;
}
http_response_code(404);
echo 'Not found';
