<?php
/**
 * PHP2Shell Web Auditor & Scanner Dashboard
 * Targets: CVE-2026-109618 & CVE-2026-109619
 * Self-contained PHP single-file web application.
 */

// ==============================================================================
// BACKEND API LOGIC
// ==============================================================================

$PATCHED_VERSIONS = [
    '8.5' => [8, 5, 12],
    '8.4' => [8, 4, 27],
    '8.3' => [8, 3, 36],
    '8.2' => [8, 2, 35],
];

function parse_version_tuple($ver_str) {
    if (preg_match('/(\d+)\.(\d+)\.(\d+)/', $ver_str, $m)) {
        return [(int)$m[1], (int)$m[2], (int)$m[3]];
    }
    return null;
}

function evaluate_php_version($tuple) {
    global $PATCHED_VERSIONS;
    list($major, $minor, $patch) = $tuple;
    $branch = "{$major}.{$minor}";

    if (isset($PATCHED_VERSIONS[$branch])) {
        $min = $PATCHED_VERSIONS[$branch];
        $min_str = implode('.', $min);
        if ($tuple >= $min) {
            return [
                'status' => 'PATCHED',
                'vulnerable' => false,
                'severity' => 'NONE',
                'recommended_version' => null,
                'details' => "PHP {$major}.{$minor}.{$patch} is patched against PHP2Shell (safe >= {$min_str})."
            ];
        } else {
            return [
                'status' => 'VULNERABLE',
                'vulnerable' => true,
                'severity' => 'CRITICAL',
                'recommended_version' => $min_str,
                'details' => "PHP {$major}.{$minor}.{$patch} is unpatched. Upgrade to PHP {$min_str} or newer immediately."
            ];
        }
    } elseif ($major < 8 || ($major == 8 && $minor < 2)) {
        return [
            'status' => 'VULNERABLE_EOL',
            'vulnerable' => true,
            'severity' => 'CRITICAL',
            'recommended_version' => '8.2.35+ or 8.3.36+',
            'details' => "PHP {$major}.{$minor}.{$patch} is End-Of-Life and vulnerable. Upgrade to a supported branch or apply distro backports."
        ];
    } else {
        return [
            'status' => 'PATCHED',
            'vulnerable' => false,
            'severity' => 'NONE',
            'recommended_version' => null,
            'details' => "PHP {$major}.{$minor}.{$patch} post-dates PHP2Shell disclosure."
        ];
    }
}

function get_host_system_audit() {
    $raw_version = PHP_VERSION;
    $tuple = parse_version_tuple($raw_version);
    $eval = $tuple ? evaluate_php_version($tuple) : [
        'status' => 'UNKNOWN',
        'vulnerable' => false,
        'severity' => 'UNKNOWN',
        'recommended_version' => null,
        'details' => 'Could not parse PHP version string.'
    ];

    $upload_progress_enabled = (bool)ini_get('session.upload_progress.enabled');
    $upload_progress_cleanup = (bool)ini_get('session.upload_progress.cleanup');
    $expose_php = (bool)ini_get('expose_php');
    $memory_limit = ini_get('memory_limit') ?: 'N/A';
    $sapi = php_sapi_name();
    $ini_file = php_ini_loaded_file() ?: 'None (built-in defaults)';

    $risk_level = 'LOW';
    $findings = [];

    if ($eval['vulnerable']) {
        if ($upload_progress_enabled) {
            $risk_level = 'CRITICAL';
            $findings[] = [
                'type' => 'critical',
                'message' => 'CRITICAL: PHP version is vulnerable AND session.upload_progress.enabled is On. The server is directly exposed to CVE-2026-109619 Use-After-Free RCE.'
            ];
        } else {
            $risk_level = 'HIGH';
            $findings[] = [
                'type' => 'high',
                'message' => 'HIGH: PHP version is vulnerable to CVE-2026-109618 (Out-Of-Memory request abort heap corruption) even with upload progress disabled.'
            ];
        }
    } else {
        $findings[] = [
            'type' => 'secure',
            'message' => 'PHP core engine is patched against PHP2Shell vulnerabilities.'
        ];
    }

    if ($expose_php) {
        $findings[] = [
            'type' => 'warning',
            'message' => "Hardening recommendation: 'expose_php = On' leaks PHP version banners in HTTP headers. Set 'expose_php = Off'."
        ];
    }

    if ($upload_progress_enabled) {
        $findings[] = [
            'type' => 'warning',
            'message' => "Defense-in-depth: Set 'session.upload_progress.enabled = Off' unless actively required by your application."
        ];
    }

    return [
        'raw_version' => $raw_version,
        'version_tuple' => $tuple,
        'sapi' => $sapi,
        'ini_path' => $ini_file,
        'configs' => [
            'session.upload_progress.enabled' => $upload_progress_enabled ? 'On' : 'Off',
            'session.upload_progress.cleanup' => $upload_progress_cleanup ? 'On' : 'Off',
            'expose_php' => $expose_php ? 'On' : 'Off',
            'memory_limit' => $memory_limit,
        ],
        'evaluation' => $eval,
        'risk_level' => $risk_level,
        'findings' => $findings,
        'timestamp' => gmdate('Y-m-d\TH:i:s\Z')
    ];
}

function audit_remote_website($url) {
    if (!preg_match('/^https?:\/\//i', $url)) {
        $url = 'http://' . $url;
    }

    $parsed = parse_url($url);
    if (!$parsed || empty($parsed['host'])) {
        return ['error' => 'Invalid URL supplied.'];
    }

    $host = strtolower($parsed['host']);
    // SSRF basic filtering for sensitive cloud metadata endpoints
    if (in_array($host, ['169.254.169.254', 'metadata.google.internal'])) {
        return ['error' => 'Requests to internal cloud metadata IP addresses are prohibited.'];
    }

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) PHP2Shell-Audit/1.0\r\nAccept: */*\r\n",
            'timeout' => 8,
            'ignore_errors' => true,
            'follow_location' => 1,
            'max_redirects' => 3
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ]);

    $start = microtime(true);
    $fp = @fopen($url, 'r', false, $ctx);
    $elapsed = round((microtime(true) - $start) * 1000);

    if (!$fp) {
        $last_err = error_get_last();
        return [
            'target_url' => $url,
            'accessible' => false,
            'risk_level' => 'UNREACHABLE',
            'error' => $last_err ? $last_err['message'] : 'Connection timed out or host unreachable.',
            'findings' => [['type' => 'error', 'message' => 'Could not connect to target website.']]
        ];
    }

    $meta = stream_get_meta_data($fp);
    fclose($fp);

    $headers_raw = isset($meta['wrapper_data']) ? $meta['wrapper_data'] : [];
    $status_code = null;
    $headers = [];

    foreach ($headers_raw as $h) {
        if (preg_match('/^HTTP\/[\d\.]+\s+(\d+)/i', $h, $m)) {
            $status_code = (int)$m[1];
        } elseif (strpos($h, ':') !== false) {
            list($k, $v) = explode(':', $h, 2);
            $headers[strtolower(trim($k))] = trim($v);
        }
    }

    $powered_by = isset($headers['x-powered-by']) ? $headers['x-powered-by'] : null;
    $server = isset($headers['server']) ? $headers['server'] : null;
    $set_cookie = isset($headers['set-cookie']) ? $headers['set-cookie'] : null;

    $php_detected = false;
    $php_version = null;
    $findings = [];

    if ($set_cookie && stripos($set_cookie, 'phpsessid') !== false) {
        $php_detected = true;
        $findings[] = ['type' => 'info', 'message' => 'PHP session cookie (PHPSESSID) detected in response.'];
    }

    if ($powered_by && stripos($powered_by, 'php') !== false) {
        $php_detected = true;
        if (preg_match('/PHP\/([\d\.]+)/i', $powered_by, $m)) {
            $php_version = $m[1];
            $findings[] = ['type' => 'warning', 'message' => "X-Powered-By header discloses PHP version: {$php_version}"];
        }
    }

    if ($server && stripos($server, 'php') !== false && !$php_version) {
        $php_detected = true;
        if (preg_match('/PHP\/([\d\.]+)/i', $server, $m)) {
            $php_version = $m[1];
            $findings[] = ['type' => 'warning', 'message' => "Server banner discloses PHP version: {$php_version}"];
        }
    }

    $eval = null;
    $risk_level = 'LOW';

    if ($php_version) {
        $tuple = parse_version_tuple($php_version);
        if ($tuple) {
            $eval = evaluate_php_version($tuple);
            if ($eval['vulnerable']) {
                $risk_level = 'CRITICAL';
                $findings[] = [
                    'type' => 'critical',
                    'message' => "VULNERABLE: Website is running PHP {$php_version}, which is vulnerable to PHP2Shell!"
                ];
                if ($eval['recommended_version']) {
                    $findings[] = [
                        'type' => 'action',
                        'message' => "Upgrade web server PHP runtime to {$eval['recommended_version']} or higher."
                    ];
                }
            } else {
                $risk_level = 'SECURE';
                $findings[] = ['type' => 'secure', 'message' => "Website is running patched PHP version: {$php_version}"];
            }
        }
    } elseif ($php_detected) {
        $risk_level = 'POTENTIAL';
        $findings[] = [
            'type' => 'warning',
            'message' => "PHP backend detected, but version is obscured ('expose_php = Off'). Run host system audit to verify patch status."
        ];
    } else {
        $risk_level = 'LOW';
        $findings[] = [
            'type' => 'info',
            'message' => 'No PHP indicators found. The server may be running another language or reverse-proxy.'
        ];
    }

    return [
        'target_url' => $url,
        'accessible' => true,
        'status_code' => $status_code,
        'response_time_ms' => $elapsed,
        'powered_by' => $powered_by,
        'server_banner' => $server,
        'php_detected' => $php_detected,
        'php_version' => $php_version,
        'evaluation' => $eval,
        'risk_level' => $risk_level,
        'findings' => $findings
    ];
}

// Handle API requests
if (isset($_GET['action'])) {
    header('Content-Type: application/json; charset=utf-8');
    $action = $_GET['action'];

    if ($action === 'system_audit') {
        echo json_encode(get_host_system_audit(), JSON_PRETTY_PRINT);
        exit;
    } elseif ($action === 'scan_url') {
        $url = isset($_POST['url']) ? trim($_POST['url']) : (isset($_GET['url']) ? trim($_GET['url']) : '');
        if (empty($url)) {
            echo json_encode(['error' => 'Please provide a valid URL to scan.'], JSON_PRETTY_PRINT);
            exit;
        }
        echo json_encode(audit_remote_website($url), JSON_PRETTY_PRINT);
        exit;
    }
}

// Default: Render HTML Web UI
$system_audit = get_host_system_audit();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP2Shell Security Auditor & Scanner</title>
    <style>
        :root {
            --bg-dark: #0b0f19;
            --card-bg: #111827;
            --border-color: #1f2937;
            --text-main: #f3f4f6;
            --text-dim: #9ca3af;
            --accent-cyan: #06b6d4;
            --accent-blue: #3b82f6;
            --badge-crit: #ef4444;
            --badge-crit-bg: rgba(239, 68, 68, 0.15);
            --badge-warn: #f59e0b;
            --badge-warn-bg: rgba(245, 158, 11, 0.15);
            --badge-pass: #10b981;
            --badge-pass-bg: rgba(16, 185, 129, 0.15);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        header {
            background-color: var(--card-bg);
            border-bottom: 1px solid var(--border-color);
            padding: 1.25rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo-group {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .shield-icon {
            font-size: 1.8rem;
        }

        .logo-text h1 {
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: -0.02em;
        }

        .logo-text p {
            font-size: 0.8rem;
            color: var(--text-dim);
        }

        .badge {
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.65rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .badge-critical { background: var(--badge-crit-bg); color: var(--badge-crit); border: 1px solid var(--badge-crit); }
        .badge-warning { background: var(--badge-warn-bg); color: var(--badge-warn); border: 1px solid var(--badge-warn); }
        .badge-patched { background: var(--badge-pass-bg); color: var(--badge-pass); border: 1px solid var(--badge-pass); }

        main {
            flex: 1;
            max-width: 1200px;
            width: 100%;
            margin: 0 auto;
            padding: 2rem;
        }

        /* Nav Tabs */
        .tabs {
            display: flex;
            gap: 1rem;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 2rem;
        }

        .tab-btn {
            background: none;
            border: none;
            color: var(--text-dim);
            padding: 0.75rem 1rem;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s ease;
        }

        .tab-btn:hover { color: var(--text-main); }
        .tab-btn.active {
            color: var(--accent-cyan);
            border-bottom-color: var(--accent-cyan);
        }

        .tab-content { display: none; }
        .tab-content.active { display: block; }

        /* Card Layout */
        .grid-2 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }

        .grid-4 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 0.75rem;
            padding: 1.5rem;
        }

        .card h2 {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .stat-value {
            font-size: 1.75rem;
            font-weight: 700;
            margin: 0.5rem 0;
        }

        .stat-label {
            font-size: 0.85rem;
            color: var(--text-dim);
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }

        .info-table td {
            padding: 0.6rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .info-table td:first-child {
            color: var(--text-dim);
            width: 45%;
        }

        .finding-item {
            display: flex;
            gap: 0.75rem;
            padding: 0.75rem;
            border-radius: 0.5rem;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
            line-height: 1.4;
        }

        .finding-critical { background: var(--badge-crit-bg); border-left: 3px solid var(--badge-crit); }
        .finding-high { background: var(--badge-crit-bg); border-left: 3px solid var(--badge-crit); }
        .finding-warning { background: var(--badge-warn-bg); border-left: 3px solid var(--badge-warn); }
        .finding-secure { background: var(--badge-pass-bg); border-left: 3px solid var(--badge-pass); }
        .finding-info { background: rgba(59, 130, 246, 0.1); border-left: 3px solid var(--accent-blue); }

        /* Scanner Form */
        .scan-bar {
            display: flex;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
        }

        .scan-input {
            flex: 1;
            background: #1e293b;
            border: 1px solid var(--border-color);
            color: var(--text-main);
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            font-size: 0.95rem;
            outline: none;
        }

        .scan-input:focus {
            border-color: var(--accent-cyan);
        }

        .btn {
            background: var(--accent-cyan);
            color: #0b0f19;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        .btn:hover { opacity: 0.9; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        pre {
            background: #030712;
            border: 1px solid var(--border-color);
            padding: 1rem;
            border-radius: 0.5rem;
            font-size: 0.85rem;
            overflow-x: auto;
            color: #e5e7eb;
            font-family: Consolas, Monaco, "Courier New", monospace;
        }

        code {
            color: var(--accent-cyan);
            font-family: Consolas, Monaco, monospace;
        }

        footer {
            border-top: 1px solid var(--border-color);
            padding: 1.25rem 2rem;
            text-align: center;
            font-size: 0.85rem;
            color: var(--text-dim);
            background: var(--card-bg);
        }
    </style>
</head>
<body>

    <header>
        <div class="logo-group">
            <span class="shield-icon">🛡️</span>
            <div class="logo-text">
                <h1>PHP2Shell Audit Console</h1>
                <p>CVE-2026-109618 & CVE-2026-109619 Diagnostics</p>
            </div>
        </div>
        <div>
            <?php if ($system_audit['risk_level'] === 'CRITICAL'): ?>
                <span class="badge badge-critical">Server Vulnerable</span>
            <?php elseif ($system_audit['risk_level'] === 'HIGH'): ?>
                <span class="badge badge-critical">High Risk</span>
            <?php elseif ($system_audit['risk_level'] === 'LOW'): ?>
                <span class="badge badge-patched">Host Patched</span>
            <?php else: ?>
                <span class="badge badge-warning"><?= htmlspecialchars($system_audit['risk_level']) ?></span>
            <?php endif; ?>
        </div>
    </header>

    <main>
        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('host-tab')">Host Server Health</button>
            <button class="tab-btn" onclick="switchTab('scanner-tab')">Remote Website Scanner</button>
            <button class="tab-btn" onclick="switchTab('remediation-tab')">Remediation Guide</button>
            <button class="tab-btn" onclick="switchTab('api-tab')">JSON API</button>
        </div>

        <!-- HOST SERVER HEALTH TAB -->
        <div id="host-tab" class="tab-content active">
            <div class="grid-4">
                <div class="card">
                    <div class="stat-label">Active PHP Version</div>
                    <div class="stat-value" style="color: <?= $system_audit['evaluation']['vulnerable'] ? '#ef4444' : '#10b981' ?>;">
                        <?= htmlspecialchars($system_audit['raw_version']) ?>
                    </div>
                    <div class="stat-label">SAPI: <?= htmlspecialchars($system_audit['sapi']) ?></div>
                </div>

                <div class="card">
                    <div class="stat-label">CVE-2026-109619 (UAF)</div>
                    <div class="stat-value" style="color: <?= ($system_audit['evaluation']['vulnerable'] && $system_audit['configs']['session.upload_progress.enabled'] === 'On') ? '#ef4444' : '#10b981' ?>;">
                        <?= ($system_audit['evaluation']['vulnerable'] && $system_audit['configs']['session.upload_progress.enabled'] === 'On') ? 'EXPOSED' : 'MITIGATED' ?>
                    </div>
                    <div class="stat-label">Upload Progress: <?= htmlspecialchars($system_audit['configs']['session.upload_progress.enabled']) ?></div>
                </div>

                <div class="card">
                    <div class="stat-label">CVE-2026-109618 (OOM Flaw)</div>
                    <div class="stat-value" style="color: <?= $system_audit['evaluation']['vulnerable'] ? '#ef4444' : '#10b981' ?>;">
                        <?= $system_audit['evaluation']['vulnerable'] ? 'AFFECTED' : 'PATCHED' ?>
                    </div>
                    <div class="stat-label">Core Runtime Engine</div>
                </div>

                <div class="card">
                    <div class="stat-label">Version Disclosure</div>
                    <div class="stat-value" style="color: <?= $system_audit['configs']['expose_php'] === 'On' ? '#f59e0b' : '#10b981' ?>;">
                        <?= $system_audit['configs']['expose_php'] === 'On' ? 'PUBLIC' : 'HIDDEN' ?>
                    </div>
                    <div class="stat-label">expose_php: <?= htmlspecialchars($system_audit['configs']['expose_php']) ?></div>
                </div>
            </div>

            <div class="grid-2">
                <div class="card">
                    <h2>Host Environment Details</h2>
                    <table class="info-table">
                        <tr>
                            <td>Loaded php.ini</td>
                            <td><code><?= htmlspecialchars($system_audit['ini_path']) ?></code></td>
                        </tr>
                        <tr>
                            <td>upload_progress.enabled</td>
                            <td><strong><?= htmlspecialchars($system_audit['configs']['session.upload_progress.enabled']) ?></strong></td>
                        </tr>
                        <tr>
                            <td>upload_progress.cleanup</td>
                            <td><?= htmlspecialchars($system_audit['configs']['session.upload_progress.cleanup']) ?></td>
                        </tr>
                        <tr>
                            <td>expose_php</td>
                            <td><?= htmlspecialchars($system_audit['configs']['expose_php']) ?></td>
                        </tr>
                        <tr>
                            <td>memory_limit</td>
                            <td><?= htmlspecialchars($system_audit['configs']['memory_limit']) ?></td>
                        </tr>
                        <tr>
                            <td>Patch Recommendation</td>
                            <td>
                                <?php if ($system_audit['evaluation']['recommended_version']): ?>
                                    <span style="color: #f59e0b; font-weight: bold;">Upgrade to <?= htmlspecialchars($system_audit['evaluation']['recommended_version']) ?></span>
                                <?php else: ?>
                                    <span style="color: #10b981;">Up to date</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="card">
                    <h2>Security Findings & Diagnostics</h2>
                    <?php foreach ($system_audit['findings'] as $f): ?>
                        <div class="finding-item finding-<?= $f['type'] ?>">
                            <?= htmlspecialchars($f['message']) ?>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>

        <!-- REMOTE WEBSITE SCANNER TAB -->
        <div id="scanner-tab" class="tab-content">
            <div class="card" style="margin-bottom: 1.5rem;">
                <h2>Scan Website or Web Application Endpoint</h2>
                <p style="color: var(--text-dim); font-size: 0.9rem; margin-bottom: 1rem;">
                    Non-destructively inspects target HTTP response headers, session cookies, and server banners for PHP2Shell vulnerability exposure.
                </p>
                <div class="scan-bar">
                    <input type="text" id="targetUrl" class="scan-input" placeholder="e.g. https://example.com or http://localhost:8080" />
                    <button id="scanBtn" class="btn" onclick="startScan()">
                        <span id="scanBtnText">Analyze Target</span>
                    </button>
                </div>
            </div>

            <div id="scanResultsContainer" style="display: none;">
                <div class="card">
                    <h2>Scan Results: <span id="resTarget" style="font-weight: normal; color: var(--accent-cyan);"></span></h2>
                    <div id="resSummary" class="grid-4" style="margin-top: 1rem;"></div>
                    <div id="resFindings" style="margin-top: 1rem;"></div>
                </div>
            </div>
        </div>

        <!-- REMEDIATION GUIDE TAB -->
        <div id="remediation-tab" class="tab-content">
            <div class="card" style="margin-bottom: 1.5rem;">
                <h2>1. Vendor Patch Releases (CVE-2026-109618 & CVE-2026-109619)</h2>
                <p style="color: var(--text-dim); margin-bottom: 1rem; font-size: 0.9rem;">
                    Updating your PHP binary runtime is the only definitive fix for both vulnerabilities.
                </p>
                <table class="info-table">
                    <tr><th>Branch</th><th>Patched Version</th><th>Status</th></tr>
                    <tr><td>PHP 8.5</td><td><strong>8.5.12</strong> or newer</td><td><span class="badge badge-patched">Patched</span></td></tr>
                    <tr><td>PHP 8.4</td><td><strong>8.4.27</strong> or newer</td><td><span class="badge badge-patched">Patched</span></td></tr>
                    <tr><td>PHP 8.3</td><td><strong>8.3.36</strong> or newer</td><td><span class="badge badge-patched">Patched</span></td></tr>
                    <tr><td>PHP 8.2</td><td><strong>8.2.35</strong> or newer</td><td><span class="badge badge-patched">Patched</span></td></tr>
                    <tr><td>PHP 8.1 & older</td><td>End of Life (EOL)</td><td><span class="badge badge-critical">Vulnerable</span></td></tr>
                </table>
            </div>

            <div class="card">
                <h2>2. Configuration Hardening (`php.ini`)</h2>
                <p style="color: var(--text-dim); margin-bottom: 1rem; font-size: 0.9rem;">
                    Apply these defense-in-depth settings to your active <code>php.ini</code>:
                </p>
                <pre><code>; Mitigate CVE-2026-109619 Use-After-Free
session.upload_progress.enabled = Off

; Prevent version disclosure in HTTP headers
expose_php = Off

; Ensure immediate cleanup of upload tracking structures
session.upload_progress.cleanup = On</code></pre>
            </div>
        </div>

        <!-- JSON API TAB -->
        <div id="api-tab" class="tab-content">
            <div class="card">
                <h2>REST API Endpoints</h2>
                <p style="color: var(--text-dim); margin-bottom: 1rem; font-size: 0.9rem;">
                    Integrate PHP2Shell scanning directly into your automated monitoring systems or CI/CD pipelines.
                </p>

                <h3 style="font-size: 0.95rem; margin-top: 1rem; color: var(--accent-cyan);">GET ?action=system_audit</h3>
                <p style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 0.5rem;">Returns JSON diagnostic report of this host server.</p>
                <pre><code>curl -s "http://your-server/index.php?action=system_audit"</code></pre>

                <h3 style="font-size: 0.95rem; margin-top: 1.5rem; color: var(--accent-cyan);">POST ?action=scan_url</h3>
                <p style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 0.5rem;">Audits an external website or web endpoint.</p>
                <pre><code>curl -s -X POST -d "url=https://example.com" "http://your-server/index.php?action=scan_url"</code></pre>
            </div>
        </div>
    </main>

    <footer>
        PHP2Shell Vulnerability Auditor &bull; Released October 2026 &bull; Antigravity Security Toolkit
    </footer>

    <script>
        function switchTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            event.currentTarget.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        }

        async function startScan() {
            const urlInput = document.getElementById('targetUrl');
            const scanBtn = document.getElementById('scanBtn');
            const scanBtnText = document.getElementById('scanBtnText');
            const resultsContainer = document.getElementById('scanResultsContainer');
            const resTarget = document.getElementById('resTarget');
            const resSummary = document.getElementById('resSummary');
            const resFindings = document.getElementById('resFindings');

            const url = urlInput.value.trim();
            if (!url) {
                alert('Please enter a target URL.');
                return;
            }

            scanBtn.disabled = true;
            scanBtnText.innerText = 'Scanning...';

            try {
                const formData = new FormData();
                formData.append('url', url);

                const response = await fetch('?action=scan_url', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                resultsContainer.style.display = 'block';
                resTarget.innerText = data.target_url || url;

                if (data.error) {
                    resSummary.innerHTML = `<div class="card" style="grid-column: 1/-1;"><span style="color: #ef4444;">${data.error}</span></div>`;
                    resFindings.innerHTML = '';
                    return;
                }

                let badgeClass = 'badge-patched';
                let verdict = 'PATCHED (SAFE)';
                if (data.risk_level === 'CRITICAL') {
                    badgeClass = 'badge-critical';
                    verdict = 'VULNERABLE (CRITICAL)';
                } else if (data.risk_level === 'POTENTIAL') {
                    badgeClass = 'badge-warning';
                    verdict = 'PHP DETECTED (VERSION OBSCURED)';
                } else if (data.risk_level === 'LOW') {
                    badgeClass = 'badge-patched';
                    verdict = 'NO PHP DETECTED';
                }

                resSummary.innerHTML = `
                    <div class="card">
                        <div class="stat-label">HTTP Status</div>
                        <div class="stat-value">${data.status_code || 'N/A'}</div>
                        <div class="stat-label">Time: ${data.response_time_ms || 0}ms</div>
                    </div>
                    <div class="card">
                        <div class="stat-label">PHP Version</div>
                        <div class="stat-value" style="font-size: 1.25rem;">${data.php_version || 'Not Disclosed'}</div>
                        <div class="stat-label">Powered-By: ${data.powered_by || 'None'}</div>
                    </div>
                    <div class="card" style="grid-column: span 2;">
                        <div class="stat-label">Overall Verdict</div>
                        <div class="stat-value" style="font-size: 1.25rem;">
                            <span class="badge ${badgeClass}">${verdict}</span>
                        </div>
                        <div class="stat-label">Server: ${data.server_banner || 'Hidden'}</div>
                    </div>
                `;

                let findingsHtml = '';
                if (data.findings && data.findings.length > 0) {
                    data.findings.forEach(f => {
                        findingsHtml += `<div class="finding-item finding-${f.type}">${f.message}</div>`;
                    });
                }
                resFindings.innerHTML = findingsHtml;

            } catch (err) {
                alert('Scan failed: ' + err.message);
            } finally {
                scanBtn.disabled = false;
                scanBtnText.innerText = 'Analyze Target';
            }
        }
    </script>
</body>
</html>
