<#
.SYNOPSIS
    PHP2Shell (CVE-2026-109618 & CVE-2026-109619) Vulnerability Scanner & Auditor

.DESCRIPTION
    Scans local Windows system PHP runtimes, php.ini configurations, and remote website endpoints
    for exposure to the critical PHP2Shell Remote Code Execution vulnerabilities.

.PARAMETER System
    Scans local PHP runtimes, php.ini directives, and server APIs.

.PARAMETER Url
    URL of the target website to audit (e.g. https://example.com or http://localhost:8080).

.PARAMETER UrlsFile
    Path to text file containing target URLs (one per line).

.PARAMETER PhpPath
    Specify a custom path to a php.exe binary.

.PARAMETER JsonOutput
    Path to output results as a JSON file.

.PARAMETER Remediation
    Display step-by-step patching and hardening guidance.

.PARAMETER SkipSslCheck
    Ignore SSL certificate validation errors.

.EXAMPLE
    .\php2shell_scanner.ps1 -System
    .\php2shell_scanner.ps1 -Url https://mywebsite.com
    .\php2shell_scanner.ps1 -System -Url https://mywebsite.com -JsonOutput report.json
#>

[CmdletBinding()]
param(
    [switch]$System,
    [string]$Url,
    [string]$UrlsFile,
    [string]$PhpPath,
    [string]$JsonOutput,
    [switch]$Remediation,
    [switch]$SkipSslCheck
)

# Minimum safe version thresholds for PHP2Shell
$script:PatchedVersions = @{
    "8.5" = [version]"8.5.12"
    "8.4" = [version]"8.4.27"
    "8.3" = [version]"8.3.36"
    "8.2" = [version]"8.2.35"
}

function Write-Color([string]$Text, [ConsoleColor]$Color = [ConsoleColor]::White) {
    Write-Host $Text -ForegroundColor $Color
}

function Parse-PhpVersion([string]$RawText) {
    if ($RawText -match '(\d+)\.(\d+)\.(\d+)') {
        try {
            return [version]"$($matches[1]).$($matches[2]).$($matches[3])"
        } catch {
            return $null
        }
    }
    return $null
}

function Evaluate-PhpVersion([version]$Ver) {
    $branchKey = "$($Ver.Major).$($Ver.Minor)"
    
    if ($script:PatchedVersions.ContainsKey($branchKey)) {
        $minSafe = $script:PatchedVersions[$branchKey]
        if ($Ver -ge $minSafe) {
            return @{
                Status = "PATCHED"
                Vulnerable = $false
                Severity = "NONE"
                RecommendedVersion = $null
                Details = "PHP $Ver is patched against PHP2Shell (safe >= $minSafe)."
            }
        } else {
            return @{
                Status = "VULNERABLE"
                Vulnerable = $true
                Severity = "CRITICAL"
                RecommendedVersion = "$minSafe"
                Details = "PHP $Ver is vulnerable. Upgrade to PHP $minSafe or newer."
            }
        }
    } elseif ($Ver -lt [version]"8.2.0") {
        return @{
            Status = "VULNERABLE_EOL"
            Vulnerable = $true
            Severity = "CRITICAL"
            RecommendedVersion = "8.2.35+ or 8.3.36+"
            Details = "PHP $Ver is End-Of-Life and vulnerable. Upgrade to a supported release."
        }
    } else {
        return @{
            Status = "PATCHED"
            Vulnerable = $false
            Severity = "NONE"
            RecommendedVersion = $null
            Details = "PHP $Ver is newer than the PHP2Shell disclosure threshold."
        }
    }
}

function Find-PhpBinaries() {
    $found = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

    # 1. Check PATH
    $pathExes = Get-Command php.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    foreach ($exe in $pathExes) {
        if (Test-Path $exe) {
            [void]$found.Add((Resolve-Path $exe).Path)
        }
    }

    # 2. Check standard Windows directories
    $searchDirs = @(
        "C:\php",
        "C:\xampp\php",
        "C:\wamp\bin\php",
        "C:\wamp64\bin\php",
        "C:\laragon\bin\php",
        "$env:LOCALAPPDATA\Programs\PHP",
        "$env:ProgramFiles\PHP",
        "${env:ProgramFiles(x86)}\PHP"
    )

    foreach ($dir in $searchDirs) {
        if (Test-Path $dir) {
            $exes = Get-ChildItem -Path $dir -Filter "php.exe" -Recurse -Depth 3 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
            foreach ($exe in $exes) {
                if (Test-Path $exe) {
                    [void]$found.Add((Resolve-Path $exe).Path)
                }
            }
        }
    }

    return @($found)
}

function Invoke-SystemAudit([string]$CustomPhp) {
    Write-Color "`n======================================================================" Cyan
    Write-Color " [SYSTEM AUDIT] Scanning Local PHP Runtime Installations" Cyan
    Write-Color "======================================================================" Cyan

    $binaries = @()
    if ($CustomPhp) {
        if (Test-Path $CustomPhp) {
            $binaries = @((Resolve-Path $CustomPhp).Path)
        } else {
            Write-Color "[-] Specified PHP path not found: $CustomPhp" Red
            return @()
        }
    } else {
        Write-Color "[*] Discovering PHP binaries on system..." White
        $binaries = Find-PhpBinaries
    }

    if ($binaries.Count -eq 0) {
        Write-Color "[-] No PHP binary installations found on this system." Yellow
        return @()
    }

    Write-Color "[+] Found $($binaries.Count) PHP binary installation(s):`n" Green

    $results = @()
    $idx = 1

    foreach ($bpath in $binaries) {
        Write-Color "--- [Instance #$idx] $bpath ---" White
        $idx++

        $item = @{
            BinaryPath = $bpath
            RawVersion = $null
            Version = $null
            IniPath = $null
            Sapi = $null
            Configs = @{}
            RiskLevel = "UNKNOWN"
            Findings = @()
            Evaluation = $null
        }

        # php -v
        try {
            $verOutput = & $bpath -v
            $firstLine = ($verOutput | Select-Object -First 1)
            $item.RawVersion = $firstLine
            $ver = Parse-PhpVersion $firstLine
            if ($ver) {
                $item.Version = "$ver"
                $item.Evaluation = Evaluate-PhpVersion $ver
            }
        } catch {
            $item.Findings += "Failed to run php -v: $_"
            $results += $item
            continue
        }

        # php -i
        try {
            $iniOutput = & $bpath -i
            foreach ($line in $iniOutput) {
                if ($line -like "*Loaded Configuration File =>*") {
                    $item.IniPath = ($line -split "=>")[-1].Trim()
                } elseif ($line -like "*Server API =>*") {
                    $item.Sapi = ($line -split "=>")[-1].Trim()
                } elseif ($line -like "*session.upload_progress.enabled =>*") {
                    $parts = ($line -split "=>")
                    if ($parts.Length -ge 2) { $item.Configs["session.upload_progress.enabled"] = $parts[1].Trim() }
                } elseif ($line -like "*session.upload_progress.cleanup =>*") {
                    $parts = ($line -split "=>")
                    if ($parts.Length -ge 2) { $item.Configs["session.upload_progress.cleanup"] = $parts[1].Trim() }
                } elseif ($line -like "*expose_php =>*") {
                    $parts = ($line -split "=>")
                    if ($parts.Length -ge 2) { $item.Configs["expose_php"] = $parts[1].Trim() }
                } elseif ($line -like "*memory_limit =>*") {
                    $parts = ($line -split "=>")
                    if ($parts.Length -ge 2) { $item.Configs["memory_limit"] = $parts[1].Trim() }
                }
            }
        } catch {
            $item.Findings += "Failed to introspect php.ini: $_"
        }

        # Risk Analysis
        $isVuln = $item.Evaluation.Vulnerable
        $uploadProg = ($item.Configs["session.upload_progress.enabled"] -in @("On", "1", "true"))
        $exposePhp = ($item.Configs["expose_php"] -in @("On", "1", "true"))

        if ($isVuln) {
            if ($uploadProg) {
                $item.RiskLevel = "CRITICAL"
                $item.Findings += "[!] CRITICAL: PHP version is vulnerable AND session.upload_progress.enabled = On. Direct CVE-2026-109619 exposure!"
            } else {
                $item.RiskLevel = "HIGH"
                $item.Findings += "[!] HIGH: PHP version is vulnerable to CVE-2026-109618 (Out-Of-Memory abort RCE)."
            }
        } else {
            $item.RiskLevel = "LOW"
            $item.Findings += "[+] PHP runtime is patched against PHP2Shell."
        }

        if ($exposePhp) {
            $item.Findings += "[*] Hardening recommendation: 'expose_php = On' broadcasts PHP version in headers. Set 'expose_php = Off'."
        }

        # Display
        Write-Host "  Version:     $($item.RawVersion)"
        Write-Host "  Server API:  $($item.Sapi)"
        Write-Host "  Config File: $($item.IniPath)"
        Write-Host "  Configurations:"
        foreach ($k in $item.Configs.Keys) {
            Write-Host "    - $k : $($item.Configs[$k])"
        }

        if ($item.RiskLevel -in @("CRITICAL", "HIGH")) {
            Write-Color "  STATUS:      VULNERABLE (SEVERITY: $($item.RiskLevel))" Red
            if ($item.Evaluation.RecommendedVersion) {
                Write-Color "  ACTION:      Upgrade to PHP $($item.Evaluation.RecommendedVersion)" Yellow
            }
        } else {
            Write-Color "  STATUS:      PATCHED (SEVERITY: NONE)" Green
        }

        Write-Host "  Findings:"
        foreach ($f in $item.Findings) {
            if ($f -like "*[!] CRITICAL*" -or $f -like "*[!] HIGH*") {
                Write-Color "    $f" Red
            } elseif ($f -like "*[+]*") {
                Write-Color "    $f" Green
            } else {
                Write-Color "    $f" Cyan
            }
        }
        Write-Host ""
        $results += $item
    }

    return $results
}

function Invoke-WebsiteAudit([string]$TargetUrl, [int]$TimeoutSec = 10, [bool]$Insecure = $false) {
    if (-not ($TargetUrl -like "http://*" -or $TargetUrl -like "https://*")) {
        $TargetUrl = "http://$TargetUrl"
    }

    $report = @{
        TargetUrl = $TargetUrl
        Accessible = $false
        StatusCode = $null
        PhpDetected = $false
        PhpVersion = $null
        ServerBanner = $null
        PoweredBy = $null
        RiskLevel = "UNKNOWN"
        Findings = @()
    }

    $prevCallback = $null
    if ($Insecure) {
        $prevCallback = [System.Net.ServicePointManager]::ServerCertificateValidationCallback
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
    }

    try {
        $request = [System.Net.HttpWebRequest]::Create($TargetUrl)
        $request.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PHP2Shell-Audit/1.0"
        $request.Timeout = ($TimeoutSec * 1000)
        $request.AllowAutoRedirect = $true

        $response = $request.GetResponse()
        $report.Accessible = $true
        $report.StatusCode = [int]$response.StatusCode
        $headers = $response.Headers
    } catch [System.Net.WebException] {
        if ($_.Response) {
            $report.Accessible = $true
            $report.StatusCode = [int]$_.Response.StatusCode
            $headers = $_.Response.Headers
        } else {
            $report.Findings += "Connection failed: $($_.Message)"
            $report.RiskLevel = "UNREACHABLE"
            return $report
        }
    } finally {
        if ($Insecure) {
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $prevCallback
        }
    }

    $poweredBy = $headers["X-Powered-By"]
    $server = $headers["Server"]
    $setCookie = $headers["Set-Cookie"]

    $report.PoweredBy = $poweredBy
    $report.ServerBanner = $server

    if ($setCookie -and $setCookie.ToLower().Contains("phpsessid")) {
        $report.PhpDetected = $true
        $report.Findings += "[+] PHP session cookie (PHPSESSID) detected."
    }

    $detectedVer = $null
    if ($poweredBy -and $poweredBy.ToLower().Contains("php")) {
        $report.PhpDetected = $true
        if ($poweredBy -match 'PHP/([\d\.]+)') {
            $detectedVer = $matches[1]
            $report.PhpVersion = $detectedVer
            $report.Findings += "[!] X-Powered-By discloses PHP version: $detectedVer"
        }
    }

    if ($server -and $server.ToLower().Contains("php") -and (-not $detectedVer)) {
        $report.PhpDetected = $true
        if ($server -match 'PHP/([\d\.]+)') {
            $detectedVer = $matches[1]
            $report.PhpVersion = $detectedVer
            $report.Findings += "[!] Server banner discloses PHP version: $detectedVer"
        }
    }

    if ($detectedVer) {
        $verObj = Parse-PhpVersion $detectedVer
        if ($verObj) {
            $eval = Evaluate-PhpVersion $verObj
            $report.Evaluation = $eval
            if ($eval.Vulnerable) {
                $report.RiskLevel = "CRITICAL"
                $report.Findings += "[!] VULNERABLE: Website discloses PHP $detectedVer, which is affected by PHP2Shell!"
                if ($eval.RecommendedVersion) {
                    $report.Findings += "[!] IMMEDIATE ACTION: Update web server PHP to $($eval.RecommendedVersion) or later."
                }
            } else {
                $report.RiskLevel = "SECURE"
                $report.Findings += "[+] Website is running patched PHP version: $detectedVer"
            }
        }
    } elseif ($report.PhpDetected) {
        $report.RiskLevel = "POTENTIAL"
        $report.Findings += "[*] PHP backend detected, but version is obscured ('expose_php = Off')."
        $report.Findings += "[*] Run a local system audit (-System) to verify internal patch level."
    } else {
        $report.RiskLevel = "LOW"
        $report.Findings += "[*] No PHP headers or cookies detected."
    }

    # Print Report
    Write-Host "Target:      $($report.TargetUrl)"
    Write-Host "Status Code: $($report.StatusCode)"
    Write-Host "Server:      $(if ($report.ServerBanner) { $report.ServerBanner } else { 'Hidden' })"
    Write-Host "Powered-By:  $(if ($report.PoweredBy) { $report.PoweredBy } else { 'Hidden' })"
    Write-Host "PHP Version: $(if ($report.PhpVersion) { $report.PhpVersion } else { 'Not Disclosed' })"

    if ($report.RiskLevel -eq "CRITICAL") {
        Write-Color "VERDICT:     VULNERABLE (CRITICAL)" Red
    } elseif ($report.RiskLevel -eq "POTENTIAL") {
        Write-Color "VERDICT:     PHP DETECTED (VERSION OBSCURED)" Yellow
    } elseif ($report.RiskLevel -eq "SECURE") {
        Write-Color "VERDICT:     PATCHED (SAFE)" Green
    } else {
        Write-Color "VERDICT:     NO PHP DETECTED" Cyan
    }

    Write-Host "Details & Findings:"
    foreach ($f in $report.Findings) {
        if ($f -like "*[!]*") {
            Write-Color "  $f" Red
        } elseif ($f -like "*[+]*") {
            Write-Color "  $f" Green
        } else {
            Write-Color "  $f" Cyan
        }
    }
    Write-Host ""

    return $report
}

function Show-RemediationGuide() {
    Write-Color "`n======================================================================" Green
    Write-Color " [REMEDIATION GUIDE] PHP2Shell (CVE-2026-109618 & CVE-2026-109619)" Green
    Write-Color "======================================================================`n" Green

    Write-Color "1. OFFICIAL VENDOR PATCHES" Yellow
    Write-Host "The only definitive fix is updating PHP to an official patched release:"
    Write-Host "  * PHP 8.5 branch: Upgrade to PHP 8.5.12 or newer"
    Write-Host "  * PHP 8.4 branch: Upgrade to PHP 8.4.27 or newer"
    Write-Host "  * PHP 8.3 branch: Upgrade to PHP 8.3.36 or newer"
    Write-Host "  * PHP 8.2 branch: Upgrade to PHP 8.2.35 or newer"
    Write-Host "  * PHP 8.1, 8.0, 7.x, 5.x: EOL branches. Migrate immediately or obtain distro backports.`n"

    Write-Color "2. CONFIGURATION HARDENING (php.ini)" Yellow
    Write-Host "Apply the following directives in your active php.ini:"
    Write-Host "  session.upload_progress.enabled = Off   ; Mitigates CVE-2026-109619 UAF"
    Write-Host "  expose_php = Off                        ; Prevents version disclosure"
    Write-Host "  session.upload_progress.cleanup = On    ; Forces immediate session cleanup`n"

    Write-Color "3. WEB SERVER & WAF HARDENING" Yellow
    Write-Host "  * Block anomalous multipart/form-data POST requests with deep array structures."
    Write-Host "  * Restart PHP-FPM / Apache services after updating or modifying php.ini.`n"
}

# Banner
Write-Color @"
  ____  _   _ ____ ____  ____  _          _ _ 
 |  _ \| | | |  _ \___ \/ ___|| |__   ___| | |
 | |_) | |_| | |_) |__) \___ \| '_ \ / _ \ | |
 |  __/|  _  |  __// __/ ___) | | | |  __/ | |
 |_|   |_| |_|_|  |_____|____/|_| |_|\___|_|_|
    PHP2Shell Vulnerability Scanner & Auditor
    Targets: CVE-2026-109618 | CVE-2026-109619
"@ Cyan

if (-not ($System -or $Url -or $UrlsFile -or $Remediation)) {
    Write-Color "[*] No target specified. Defaulting to local system audit.`n" Yellow
    $System = $true
}

$fullReport = @{
    Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Vulnerability = "PHP2Shell"
    Cves = @("CVE-2026-109618", "CVE-2026-109619")
    SystemAudit = @()
    WebsiteAudits = @()
}

if ($System) {
    $fullReport.SystemAudit = Invoke-SystemAudit -CustomPhp $PhpPath
}

$targets = @()
if ($Url) { $targets += $Url }
if ($UrlsFile -and (Test-Path $UrlsFile)) {
    $targets += (Get-Content $UrlsFile | Where-Object { $_.Trim() -and -not $_.StartsWith("#") })
}

if ($targets.Count -gt 0) {
    Write-Color "======================================================================" Cyan
    Write-Color " [WEBSITE AUDIT] Auditing $($targets.Count) Web Target(s)" Cyan
    Write-Color "======================================================================`n" Cyan

    foreach ($t in $targets) {
        $rep = Invoke-WebsiteAudit -TargetUrl $t -Insecure $SkipSslCheck
        $fullReport.WebsiteAudits += $rep
    }
}

if ($Remediation) {
    Show-RemediationGuide
}

if ($JsonOutput) {
    try {
        $fullReport | ConvertTo-Json -Depth 5 | Out-File -FilePath $JsonOutput -Encoding utf8
        Write-Color "[+] Audit report exported to: $JsonOutput" Green
    } catch {
        Write-Color "[-] Failed to export JSON report: $_" Red
    }
}
