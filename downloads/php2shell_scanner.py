#!/usr/bin/env python3
"""
PHP2Shell Vulnerability Scanner & System Auditor
Detects exposure to CVE-2026-109618 & CVE-2026-109619 in local PHP runtimes and remote websites.

Author: Antigravity Security Toolkit
License: Apache 2.0
"""

import sys
import os
import re
import json
import ssl
import time
import argparse
import subprocess
import urllib.request
import urllib.error
import urllib.parse
from typing import Dict, List, Optional, Tuple, Any

# Windows Virtual Terminal ANSI Color Support
if sys.platform == "win32":
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass

# Terminal Color Codes
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    WHITE = "\033[97m"

def cprint(text: str, color: str = Colors.WHITE, bold: bool = False):
    style = Colors.BOLD if bold else ""
    print(f"{style}{color}{text}{Colors.RESET}")

# Vulnerability Reference & Minimum Patched Versions
VULN_INFO = {
    "name": "PHP2Shell",
    "cves": ["CVE-2026-109618", "CVE-2026-109619"],
    "disclosure_date": "October 21, 2026",
    "summary": (
        "Critical RCE vulnerabilities in PHP core runtime affecting session upload progress "
        "(CVE-2026-109619 Use-After-Free) and uninitialized request cleanup during "
        "out-of-memory aborts (CVE-2026-109618)."
    ),
    "patched_minimums": {
        (8, 5): (8, 5, 12),
        (8, 4): (8, 4, 27),
        (8, 3): (8, 3, 36),
        (8, 2): (8, 2, 35),
    }
}

def parse_php_version(version_str: str) -> Optional[Tuple[int, int, int]]:
    """Extract major, minor, patch version tuple from version string."""
    m = re.search(r"(\d+)\.(\d+)\.(\d+)", version_str)
    if m:
        return (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return None

def evaluate_php_version(version_tuple: Tuple[int, int, int]) -> Dict[str, Any]:
    """
    Evaluates a PHP version tuple against the PHP2Shell vulnerability matrix.
    Returns status, severity, and minimum recommended version.
    """
    major, minor, patch = version_tuple
    branch = (major, minor)
    patched_mins = VULN_INFO["patched_minimums"]

    if branch in patched_mins:
        min_safe = patched_mins[branch]
        min_safe_str = f"{min_safe[0]}.{min_safe[1]}.{min_safe[2]}"
        if (major, minor, patch) >= min_safe:
            return {
                "status": "PATCHED",
                "vulnerable": False,
                "severity": "NONE",
                "recommended_version": None,
                "details": f"PHP {major}.{minor}.{patch} is patched against PHP2Shell (safe >= {min_safe_str})."
            }
        else:
            return {
                "status": "VULNERABLE",
                "vulnerable": True,
                "severity": "CRITICAL",
                "recommended_version": min_safe_str,
                "details": f"PHP {major}.{minor}.{patch} is unpatched. Upgrade to PHP {min_safe_str} or newer immediately."
            }
    elif branch < (8, 2):
        return {
            "status": "VULNERABLE_EOL",
            "vulnerable": True,
            "severity": "CRITICAL",
            "recommended_version": "8.2.35+ or 8.3.36+",
            "details": (
                f"PHP {major}.{minor}.{patch} is End-Of-Life (EOL) and vulnerable. "
                "Upgrade to a supported branch (8.2.35+, 8.3.36+, 8.4.27+, 8.5.12+) or apply distro backports."
            )
        }
    else:
        # Newer than 8.5
        return {
            "status": "PATCHED",
            "vulnerable": False,
            "severity": "NONE",
            "recommended_version": None,
            "details": f"PHP {major}.{minor}.{patch} post-dates PHP2Shell disclosure."
        }


# ==============================================================================
# LOCAL SYSTEM AUDIT
# ==============================================================================

def find_system_php_binaries() -> List[str]:
    """Find installed PHP binary executables on the system."""
    found = set()

    # 1. Check PATH via 'where' (Windows) or 'which' (Unix)
    cmd = ["where", "php"] if sys.platform == "win32" else ["which", "-a", "php"]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        if res.returncode == 0:
            for line in res.stdout.strip().splitlines():
                path = line.strip()
                if path and os.path.exists(path):
                    found.add(os.path.realpath(path))
    except Exception:
        pass

    # 2. Common Windows search paths
    if sys.platform == "win32":
        search_dirs = [
            r"C:\php",
            r"C:\xampp\php",
            r"C:\wamp\bin\php",
            r"C:\wamp64\bin\php",
            r"C:\laragon\bin\php",
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\PHP"),
            os.path.expandvars(r"%ProgramFiles%\PHP"),
            os.path.expandvars(r"%ProgramFiles(x86)%\PHP"),
        ]
        for base in search_dirs:
            if not os.path.exists(base):
                continue
            # Check direct executable
            exe = os.path.join(base, "php.exe")
            if os.path.exists(exe):
                found.add(os.path.realpath(exe))
            # Check subdirectories (e.g. laragon/bin/php/php-8.3.32)
            try:
                for root, dirs, files in os.walk(base):
                    if "php.exe" in files:
                        found.add(os.path.realpath(os.path.join(root, "php.exe")))
            except Exception:
                pass
    else:
        # Common Unix paths
        unix_paths = [
            "/usr/bin/php",
            "/usr/local/bin/php",
            "/opt/homebrew/bin/php",
            "/etc/alternatives/php",
        ]
        for p in unix_paths:
            if os.path.exists(p):
                found.add(os.path.realpath(p))

    return sorted(list(found))


def inspect_php_binary(php_path: str) -> Dict[str, Any]:
    """Inspect a specific PHP binary for version, SAPI, and ini settings."""
    result = {
        "binary_path": php_path,
        "raw_version": None,
        "version_tuple": None,
        "evaluation": None,
        "ini_path": None,
        "sapi": None,
        "configs": {},
        "risk_level": "UNKNOWN",
        "findings": []
    }

    # Version check
    try:
        res = subprocess.run([php_path, "-v"], capture_output=True, text=True, timeout=5)
        first_line = res.stdout.strip().splitlines()[0] if res.stdout else ""
        result["raw_version"] = first_line
        ver_tuple = parse_php_version(first_line)
        if ver_tuple:
            result["version_tuple"] = ver_tuple
            result["evaluation"] = evaluate_php_version(ver_tuple)
    except Exception as e:
        result["findings"].append(f"Failed to execute '{php_path} -v': {e}")
        return result

    # Introspect php -i configuration
    try:
        res_i = subprocess.run([php_path, "-i"], capture_output=True, text=True, timeout=10)
        output = res_i.stdout or ""

        for line in output.splitlines():
            line_str = line.strip()
            if "Loaded Configuration File =>" in line_str:
                result["ini_path"] = line_str.split("=>")[-1].strip()
            elif "Server API =>" in line_str:
                result["sapi"] = line_str.split("=>")[-1].strip()
            elif "session.upload_progress.enabled =>" in line_str:
                parts = [p.strip() for p in line_str.split("=>")]
                result["configs"]["session.upload_progress.enabled"] = parts[1] if len(parts) > 1 else ""
            elif "session.upload_progress.cleanup =>" in line_str:
                parts = [p.strip() for p in line_str.split("=>")]
                result["configs"]["session.upload_progress.cleanup"] = parts[1] if len(parts) > 1 else ""
            elif "expose_php =>" in line_str:
                parts = [p.strip() for p in line_str.split("=>")]
                result["configs"]["expose_php"] = parts[1] if len(parts) > 1 else ""
            elif "memory_limit =>" in line_str:
                parts = [p.strip() for p in line_str.split("=>")]
                result["configs"]["memory_limit"] = parts[1] if len(parts) > 1 else ""
            elif "enable_dl =>" in line_str:
                parts = [p.strip() for p in line_str.split("=>")]
                result["configs"]["enable_dl"] = parts[1] if len(parts) > 1 else ""
    except Exception as e:
        result["findings"].append(f"Failed to execute '{php_path} -i': {e}")

    # Risk Analysis
    eval_info = result.get("evaluation")
    upload_progress = result["configs"].get("session.upload_progress.enabled", "").lower() in ["on", "1", "true"]
    expose_php = result["configs"].get("expose_php", "").lower() in ["on", "1", "true"]

    if eval_info and eval_info["vulnerable"]:
        if upload_progress:
            result["risk_level"] = "CRITICAL"
            result["findings"].append(
                "[!] CRITICAL: PHP version is vulnerable AND 'session.upload_progress.enabled = On'. "
                "The system is directly susceptible to CVE-2026-109619 Use-After-Free RCE!"
            )
        else:
            result["risk_level"] = "HIGH"
            result["findings"].append(
                "[!] HIGH: PHP version is vulnerable to CVE-2026-109618 (Out-Of-Memory abort RCE) "
                "even though session.upload_progress is disabled."
            )
    else:
        result["risk_level"] = "LOW"
        result["findings"].append("[+] PHP runtime is patched against PHP2Shell vulnerabilities.")

    if expose_php:
        result["findings"].append(
            "[*] Hardening recommendation: 'expose_php = On' broadcasts PHP version in HTTP headers. Set 'expose_php = Off'."
        )

    return result


def run_system_audit(custom_php_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Scan all detected or specified PHP binaries on the host system."""
    cprint("\n" + "=" * 70, Colors.CYAN, bold=True)
    cprint(" [SYSTEM AUDIT] Scanning Local PHP Runtime Installations", Colors.CYAN, bold=True)
    cprint("=" * 70, Colors.CYAN, bold=True)

    if custom_php_path:
        if not os.path.exists(custom_php_path):
            cprint(f"[-] Specified PHP path not found: {custom_php_path}", Colors.RED, bold=True)
            return []
        binaries = [os.path.realpath(custom_php_path)]
    else:
        cprint("[*] Discovering PHP binaries on system...", Colors.WHITE)
        binaries = find_system_php_binaries()

    if not binaries:
        cprint("[-] No PHP binary installations found on this system.", Colors.YELLOW)
        return []

    cprint(f"[+] Found {len(binaries)} PHP binary installation(s):\n", Colors.GREEN)

    results = []
    for idx, bpath in enumerate(binaries, 1):
        cprint(f"--- [Instance #{idx}] {bpath} ---", Colors.WHITE, bold=True)
        res = inspect_php_binary(bpath)
        results.append(res)

        print(f"  Version:     {res['raw_version'] or 'Unknown'}")
        print(f"  Server API:  {res['sapi'] or 'Unknown'}")
        print(f"  Config File: {res['ini_path'] or 'None (default)'}")

        # Configs
        print(f"  Configurations:")
        for k, v in res["configs"].items():
            print(f"    - {k}: {v}")

        # Verdict
        r_level = res["risk_level"]
        if r_level == "CRITICAL":
            cprint(f"  STATUS:      VULNERABLE (SEVERITY: CRITICAL)", Colors.RED, bold=True)
        elif r_level == "HIGH":
            cprint(f"  STATUS:      VULNERABLE (SEVERITY: HIGH)", Colors.RED, bold=True)
        elif r_level == "LOW":
            cprint(f"  STATUS:      PATCHED (SEVERITY: NONE)", Colors.GREEN, bold=True)
        else:
            cprint(f"  STATUS:      UNKNOWN", Colors.YELLOW, bold=True)

        if res["evaluation"] and res["evaluation"]["recommended_version"]:
            cprint(f"  ACTION:      Upgrade to PHP {res['evaluation']['recommended_version']}", Colors.YELLOW, bold=True)

        print("  Findings:")
        for finding in res["findings"]:
            if "[!] CRITICAL" in finding or "[!] HIGH" in finding:
                cprint(f"    {finding}", Colors.RED)
            elif "[+]" in finding:
                cprint(f"    {finding}", Colors.GREEN)
            else:
                cprint(f"    {finding}", Colors.CYAN)
        print()

    return results


# ==============================================================================
# WEBSITE / REMOTE ENDPOINT AUDIT
# ==============================================================================

def normalize_url(url: str) -> str:
    """Ensure URL has a valid scheme."""
    if not url.startswith("http://") and not url.startswith("https://"):
        return f"http://{url}"
    return url

def audit_website(url: str, timeout: int = 10, verify_ssl: bool = True) -> Dict[str, Any]:
    """
    Safely and non-invasively audit a website for PHP2Shell exposure.
    Inspects response headers, server tokens, cookies, and endpoint behavior.
    """
    norm_url = normalize_url(url)
    report = {
        "target_url": norm_url,
        "accessible": False,
        "status_code": None,
        "php_detected": False,
        "php_version": None,
        "server_banner": None,
        "powered_by": None,
        "session_cookie": None,
        "evaluation": None,
        "risk_level": "UNKNOWN",
        "findings": [],
        "security_headers": {}
    }

    ctx = ssl.create_default_context()
    if not verify_ssl:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PHP2Shell-Audit/1.0",
        "Accept": "*/*",
        "Accept-Encoding": "identity"
    }

    req = urllib.request.Request(norm_url, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            report["accessible"] = True
            report["status_code"] = response.getcode()
            resp_headers = dict(response.info())
    except urllib.error.HTTPError as e:
        report["accessible"] = True
        report["status_code"] = e.code
        resp_headers = dict(e.headers)
    except Exception as e:
        report["findings"].append(f"Connection failed: {e}")
        report["risk_level"] = "UNREACHABLE"
        return report

    # Header parsing
    powered_by = resp_headers.get("x-powered-by", resp_headers.get("X-Powered-By", ""))
    server = resp_headers.get("server", resp_headers.get("Server", ""))
    set_cookie = resp_headers.get("set-cookie", resp_headers.get("Set-Cookie", ""))

    report["powered_by"] = powered_by
    report["server_banner"] = server

    # Check for security headers
    for h in ["strict-transport-security", "x-content-type-options", "x-frame-options", "content-security-policy"]:
        val = resp_headers.get(h)
        if val:
            report["security_headers"][h] = val

    # Detect PHP in cookies
    if "phpsessid" in set_cookie.lower():
        report["php_detected"] = True
        report["session_cookie"] = "PHPSESSID"
        report["findings"].append("[+] PHP session cookie (PHPSESSID) detected.")

    # Detect PHP in X-Powered-By
    detected_ver = None
    if "php" in powered_by.lower():
        report["php_detected"] = True
        ver_match = re.search(r"PHP/([\d\.]+)", powered_by, re.IGNORECASE)
        if ver_match:
            detected_ver = ver_match.group(1)
            report["php_version"] = detected_ver
            report["findings"].append(f"[!] X-Powered-By discloses PHP version: {detected_ver}")

    # Detect PHP in Server header
    if "php" in server.lower() and not detected_ver:
        report["php_detected"] = True
        ver_match = re.search(r"PHP/([\d\.]+)", server, re.IGNORECASE)
        if ver_match:
            detected_ver = ver_match.group(1)
            report["php_version"] = detected_ver
            report["findings"].append(f"[!] Server banner discloses PHP version: {detected_ver}")

    # Version evaluation if disclosed
    if detected_ver:
        ver_tuple = parse_php_version(detected_ver)
        if ver_tuple:
            eval_info = evaluate_php_version(ver_tuple)
            report["evaluation"] = eval_info
            if eval_info["vulnerable"]:
                report["risk_level"] = "CRITICAL"
                report["findings"].append(
                    f"[!] VULNERABLE: Website discloses PHP {detected_ver}, which is affected by PHP2Shell!"
                )
                if eval_info["recommended_version"]:
                    report["findings"].append(
                        f"[!] IMMEDIATE ACTION: Update web server PHP to {eval_info['recommended_version']} or later."
                    )
            else:
                report["risk_level"] = "SECURE"
                report["findings"].append(f"[+] Website is running patched PHP version: {detected_ver}")
    elif report["php_detected"]:
        report["risk_level"] = "POTENTIAL"
        report["findings"].append(
            "[*] PHP backend detected, but version is obscured ('expose_php = Off' or header stripped). "
            "Internal patch status cannot be confirmed via passive HTTP headers alone."
        )
        report["findings"].append(
            "[*] Recommendation: Perform a local system audit ('--system') on the host to verify exact PHP patch level."
        )
    else:
        report["risk_level"] = "LOW"
        report["findings"].append(
            "[*] No PHP headers or cookies detected. The server may be running another language or reverse-proxy."
        )

    return report


def print_website_report(report: Dict[str, Any]):
    """Format and print website scan report."""
    cprint(f"Target:      {report['target_url']}", Colors.WHITE, bold=True)
    cprint(f"Status Code: {report['status_code'] or 'N/A'}", Colors.WHITE)
    print(f"Server:      {report['server_banner'] or 'Hidden / Not Provided'}")
    print(f"Powered-By:  {report['powered_by'] or 'Hidden / Not Provided'}")
    print(f"PHP Version: {report['php_version'] or 'Not Disclosed'}")

    r_level = report["risk_level"]
    if r_level == "CRITICAL":
        cprint("VERDICT:     VULNERABLE (CRITICAL)", Colors.RED, bold=True)
    elif r_level == "POTENTIAL":
        cprint("VERDICT:     PHP DETECTED (VERSION OBSCURED)", Colors.YELLOW, bold=True)
    elif r_level == "SECURE":
        cprint("VERDICT:     PATCHED (SAFE)", Colors.GREEN, bold=True)
    elif r_level == "LOW":
        cprint("VERDICT:     NO PHP DETECTED", Colors.CYAN)
    else:
        cprint(f"VERDICT:     {r_level}", Colors.WHITE)

    print("Details & Findings:")
    for f in report["findings"]:
        if "[!]" in f:
            cprint(f"  {f}", Colors.RED if "VULNERABLE" in f or "CRITICAL" in f else Colors.YELLOW)
        elif "[+]" in f:
            cprint(f"  {f}", Colors.GREEN)
        else:
            cprint(f"  {f}", Colors.CYAN)
    print()


# ==============================================================================
# REMEDIATION ADVICE
# ==============================================================================

def print_remediation_guide():
    """Print complete remediation and hardening instructions."""
    cprint("\n" + "=" * 70, Colors.GREEN, bold=True)
    cprint(" [REMEDIATION GUIDE] PHP2Shell (CVE-2026-109618 & CVE-2026-109619)", Colors.GREEN, bold=True)
    cprint("=" * 70 + "\n", Colors.GREEN, bold=True)

    cprint("1. OFFICIAL VENDOR PATCHES", Colors.YELLOW, bold=True)
    print("The only definitive solution is updating PHP to an official patched release:")
    print("  * PHP 8.5 branch: Upgrade to PHP 8.5.12 or newer")
    print("  * PHP 8.4 branch: Upgrade to PHP 8.4.27 or newer")
    print("  * PHP 8.3 branch: Upgrade to PHP 8.3.36 or newer")
    print("  * PHP 8.2 branch: Upgrade to PHP 8.2.35 or newer")
    print("  * PHP 8.1, 8.0, 7.x, 5.x: EOL branches. Migrate immediately or obtain distro backports.\n")

    cprint("2. CONFIGURATION HARDENING (php.ini)", Colors.YELLOW, bold=True)
    print("Apply the following settings in your active php.ini:")
    print("  ; Disable upload progress tracking (mitigates CVE-2026-109619 UAF)")
    print("  session.upload_progress.enabled = Off\n")
    print("  ; Prevent disclosing PHP version in HTTP headers")
    print("  expose_php = Off\n")
    print("  ; Clean up upload tracking data immediately if enabled")
    print("  session.upload_progress.cleanup = On\n")

    cprint("3. WEB SERVER & WAF HARDENING", Colors.YELLOW, bold=True)
    print("  * Nginx / Cloudflare / AWS WAF: Implement rules inspecting multipart/form-data")
    print("    POST requests for excessive multipart boundaries or deeply nested structures.")
    print("  * Rate-limit and restrict unauthenticated file-upload endpoints.")
    print("  * Restart PHP-FPM / Apache services after updating or modifying php.ini.\n")


# ==============================================================================
# MAIN CLI ENTRYPOINT
# ==============================================================================

def main():
    banner = f"""{Colors.CYAN}{Colors.BOLD}
  ____  _   _ ____ ____  ____  _          _ _ 
 |  _ \\| | | |  _ \\___ \\/ ___|| |__   ___| | |
 | |_) | |_| | |_) |__) \\___ \\| '_ \\ / _ \\ | |
 |  __/|  _  |  __// __/ ___) | | | |  __/ | |
 |_|   |_| |_|_|  |_____|____/|_| |_|\\___|_|_|
    PHP2Shell Vulnerability Scanner & Auditor
    Targets: CVE-2026-109618 | CVE-2026-109619
{Colors.RESET}"""
    print(banner)

    parser = argparse.ArgumentParser(
        description="Scan local system or remote websites for PHP2Shell vulnerabilities."
    )
    parser.add_argument(
        "-s", "--system", action="store_true", default=False,
        help="Perform local system audit of installed PHP runtimes and php.ini configurations."
    )
    parser.add_argument(
        "-u", "--url", type=str, default=None,
        help="URL of the website or web application to audit (e.g. http://localhost or https://example.com)."
    )
    parser.add_argument(
        "--urls-file", type=str, default=None,
        help="Path to a text file containing target URLs (one per line)."
    )
    parser.add_argument(
        "--all", action="store_true", default=False,
        help="Run both local system scan and website scan (if --url provided)."
    )
    parser.add_argument(
        "--php-path", type=str, default=None,
        help="Custom path to PHP binary for system audit."
    )
    parser.add_argument(
        "-k", "--insecure", action="store_true", default=False,
        help="Disable SSL certificate verification for website audit."
    )
    parser.add_argument(
        "-t", "--timeout", type=int, default=10,
        help="HTTP connection timeout in seconds (default: 10s)."
    )
    parser.add_argument(
        "-o", "--json-output", type=str, default=None,
        help="Save full scan results to a JSON file."
    )
    parser.add_argument(
        "--remediation", action="store_true", default=False,
        help="Display comprehensive remediation and hardening guidance."
    )

    args = parser.parse_args()

    # If no flags passed, default to system scan + show help hint
    if not (args.system or args.url or args.urls_file or args.all or args.remediation):
        cprint("[*] No target specified. Defaulting to local system audit.\n", Colors.YELLOW)
        args.system = True

    full_report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "vulnerability": VULN_INFO["name"],
        "cves": VULN_INFO["cves"],
        "system_audit": None,
        "website_audits": []
    }

    # 1. System Audit
    if args.system or args.all:
        sys_results = run_system_audit(custom_php_path=args.php_path)
        full_report["system_audit"] = sys_results

    # 2. Website Audits
    targets = []
    if args.url:
        targets.append(args.url)
    if args.urls_file and os.path.exists(args.urls_file):
        with open(args.urls_file, "r") as f:
            for line in f:
                l = line.strip()
                if l and not l.startswith("#"):
                    targets.append(l)

    if targets:
        cprint("=" * 70, Colors.CYAN, bold=True)
        cprint(f" [WEBSITE AUDIT] Auditing {len(targets)} Web Target(s)", Colors.CYAN, bold=True)
        cprint("=" * 70 + "\n", Colors.CYAN, bold=True)

        for target in targets:
            web_rep = audit_website(target, timeout=args.timeout, verify_ssl=not args.insecure)
            full_report["website_audits"].append(web_rep)
            print_website_report(web_rep)

    # 3. Remediation Guide
    if args.remediation:
        print_remediation_guide()
    elif (
        (full_report["system_audit"] and any(r.get("risk_level") in ["CRITICAL", "HIGH"] for r in full_report["system_audit"])) or
        (full_report["website_audits"] and any(w.get("risk_level") == "CRITICAL" for w in full_report["website_audits"]))
    ):
        cprint("[!] One or more scanned targets are VULNERABLE. Run with '--remediation' for patch guidance.", Colors.YELLOW, bold=True)

    # 4. JSON Output
    if args.json_output:
        try:
            with open(args.json_output, "w") as jf:
                json.dump(full_report, jf, indent=2)
            cprint(f"[+] Full audit report written to: {args.json_output}", Colors.GREEN, bold=True)
        except Exception as e:
            cprint(f"[-] Failed to write JSON output: {e}", Colors.RED)

if __name__ == "__main__":
    main()
