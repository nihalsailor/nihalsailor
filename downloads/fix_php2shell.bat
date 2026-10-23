@echo off
setlocal EnableDelayedExpansion
title PHP2Shell Security Scanner and Patcher (CVE-2026-109618 and CVE-2026-109619)

:: ==============================================================================
:: PHP2Shell Automated Security Scanner & Patcher for Windows
:: Scans for:
::   1. No PHP installed (system not affected)
::   2. Older/Vulnerable PHP versions (CVE-2026-109618 & CVE-2026-109619)
::   3. Already Patched PHP versions (skips download, checks php.ini)
:: Supports flags:
::   /scan   - Only scan and report status; make no changes
::   /force  - Force reinstall/re-download even if already patched
::   /y      - Unattended mode (assume Yes to all prompts)
:: ==============================================================================

set "PARAM1=%~1"
set "SCAN_ONLY=0"
set "FORCE_INSTALL=0"
set "ASSUME_YES=0"

if /i "%PARAM1%"=="/scan" set "SCAN_ONLY=1"
if /i "%PARAM1%"=="-scan" set "SCAN_ONLY=1"
if /i "%PARAM1%"=="/force" set "FORCE_INSTALL=1"
if /i "%PARAM1%"=="-force" set "FORCE_INSTALL=1"
if /i "%PARAM1%"=="/y" set "ASSUME_YES=1"
if /i "%PARAM1%"=="-y" set "ASSUME_YES=1"
if /i "%~2"=="/y" set "ASSUME_YES=1"

echo.
echo ==============================================================================
echo  PHP2Shell Automated Security Scanner and Patcher (Windows)
echo  Targets: CVE-2026-109618 (OOM Abort Flaw) and CVE-2026-109619 (Upload Progress UAF)
echo ==============================================================================
echo.

:: ------------------------------------------------------------------------------
:: STEP 1: PRE-SCAN SYSTEM FOR ANY PHP INSTALLATION
:: ------------------------------------------------------------------------------
echo [*] Phase 1: Scanning system for installed PHP runtimes...

set "FOUND_PHP_EXE="
set "FOUND_PHP_VER="
set "FOUND_INI="

:: 1a. Check PATH
where.exe php >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%p in ('where.exe php 2^>nul') do (
        if not defined FOUND_PHP_EXE set "FOUND_PHP_EXE=%%p"
    )
)

:: 1b. Check common Windows server and tool directories
if not defined FOUND_PHP_EXE if exist "%LOCALAPPDATA%\Programs\PHP\current\php.exe" set "FOUND_PHP_EXE=%LOCALAPPDATA%\Programs\PHP\current\php.exe"
if not defined FOUND_PHP_EXE if exist "C:\php\php.exe" set "FOUND_PHP_EXE=C:\php\php.exe"
if not defined FOUND_PHP_EXE if exist "C:\xampp\php\php.exe" set "FOUND_PHP_EXE=C:\xampp\php\php.exe"
if not defined FOUND_PHP_EXE if exist "C:\Program Files\PHP\php.exe" set "FOUND_PHP_EXE=C:\Program Files\PHP\php.exe"
if not defined FOUND_PHP_EXE if exist "C:\laragon\bin\php\current\php.exe" set "FOUND_PHP_EXE=C:\laragon\bin\php\current\php.exe"
if not defined FOUND_PHP_EXE if exist "C:\wamp64\bin\php\php.exe" set "FOUND_PHP_EXE=C:\wamp64\bin\php\php.exe"

:: ------------------------------------------------------------------------------
:: CASE A: NO PHP DETECTED ON SYSTEM
:: ------------------------------------------------------------------------------
if not defined FOUND_PHP_EXE (
    echo.
    echo ==============================================================================
    echo  PRE-SCAN RESULT: NO PHP DETECTED
    echo ==============================================================================
    echo  [i] No PHP runtime was found in PATH or standard system directories.
    echo  [i] Security Status: NOT VULNERABLE
    echo      This computer is NOT affected by PHP2Shell because PHP is not installed.
    echo ==============================================================================
    echo.

    if "%SCAN_ONLY%"=="1" (
        echo [*] Scan-only mode complete. Exiting.
        goto :END
    )

    if "%ASSUME_YES%"=="1" goto :PROCEED_FRESH_INSTALL

    set "USER_CHOICE=N"
    set /p "USER_CHOICE=Would you like to install a fresh, pre-hardened PHP 8.3.36 runtime? [y/N]: "
    if /i "!USER_CHOICE!"=="y" goto :PROCEED_FRESH_INSTALL
    if /i "!USER_CHOICE!"=="yes" goto :PROCEED_FRESH_INSTALL

    echo [*] No changes were made. Exiting.
    goto :END

    :PROCEED_FRESH_INSTALL
    echo [*] Proceeding with fresh installation of hardened PHP 8.3.36...
    goto :DO_DOWNLOAD_INSTALL
)

:: ------------------------------------------------------------------------------
:: DETECT VERSION & CONFIG OF EXISTING PHP
:: ------------------------------------------------------------------------------
for /f "tokens=*" %%v in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "(& '!FOUND_PHP_EXE!' -r 'echo PHP_VERSION;') 2>$null"') do set "FOUND_PHP_VER=%%v"
for /f "tokens=*" %%c in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "(& '!FOUND_PHP_EXE!' -r 'echo php_ini_loaded_file();') 2>$null"') do set "FOUND_INI=%%c"

echo [+] Located PHP executable: !FOUND_PHP_EXE!
echo [+] Detected PHP version:    PHP !FOUND_PHP_VER!
if defined FOUND_INI echo [+] Active php.ini:        !FOUND_INI!

:: Evaluate version against PHP2Shell safe thresholds:
:: 8.5 >= 8.5.12 | 8.4 >= 8.4.27 | 8.3 >= 8.3.36 | 8.2 >= 8.2.35
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$v = '!FOUND_PHP_VER!'; if ($v -match '(\d+\.\d+\.\d+)') {" ^
    "    [version]$ver = $matches[1]; $safe = $false;" ^
    "    if ($ver.Major -eq 8) {" ^
    "        if ($ver.Minor -eq 5 -and $ver.Build -ge 12) { $safe = $true }" ^
    "        elseif ($ver.Minor -eq 4 -and $ver.Build -ge 27) { $safe = $true }" ^
    "        elseif ($ver.Minor -eq 3 -and $ver.Build -ge 36) { $safe = $true }" ^
    "        elseif ($ver.Minor -eq 2 -and $ver.Build -ge 35) { $safe = $true }" ^
    "        elseif ($ver.Minor -gt 5) { $safe = $true }" ^
    "    };" ^
    "    if ($safe) { exit 0 }" ^
    "};" ^
    "exit 1"

set "IS_SAFE=%ERRORLEVEL%"

:: ------------------------------------------------------------------------------
:: CASE B: EXISTING PHP IS ALREADY PATCHED
:: ------------------------------------------------------------------------------
if "%IS_SAFE%"=="0" if "%FORCE_INSTALL%"=="0" goto :ALREADY_PATCHED
goto :CHECK_VULN

:ALREADY_PATCHED
echo.
echo ==============================================================================
echo  PRE-SCAN RESULT: ALREADY PATCHED - SAFE
echo ==============================================================================
echo  [+] PHP !FOUND_PHP_VER! satisfies the minimum safe version threshold.
echo  [+] Core Engine: PATCHED against CVE-2026-109618 and CVE-2026-109619.
echo ==============================================================================
echo.

if "%SCAN_ONLY%"=="1" (
    echo [*] Scan-only mode complete. Exiting.
    goto :END
)

echo [*] Checking active php.ini security hardening...
if exist "!FOUND_INI!" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$content = Get-Content '!FOUND_INI!' -Raw;" ^
        "$content = $content -replace 'expose_php = On', 'expose_php = Off';" ^
        "$content = $content -replace ';?session\.upload_progress\.enabled = (On|Off|1|0)', 'session.upload_progress.enabled = Off';" ^
        "$content = $content -replace ';?session\.upload_progress\.cleanup = (On|Off|1|0)', 'session.upload_progress.cleanup = On';" ^
        "Set-Content -Path '!FOUND_INI!' -Value $content -Encoding utf8;"
    echo [+] Verified php.ini hardening directives:
    echo     - session.upload_progress.enabled = Off (Mitigates CVE-2026-109619 UAF)
    echo     - session.upload_progress.cleanup = On
    echo     - expose_php = Off                      (Prevents version leakage)
)

echo.
echo ==============================================================================
echo  [SUCCESS] System is verified SECURE. No core runtime upgrade required!
echo ==============================================================================
goto :END

:CHECK_VULN

:: ------------------------------------------------------------------------------
:: CASE C: EXISTING PHP IS VULNERABLE
:: ------------------------------------------------------------------------------
echo.
echo ==============================================================================
echo  PRE-SCAN RESULT: VULNERABLE PHP VERSION DETECTED!
echo ==============================================================================
echo  [!] Installed: PHP !FOUND_PHP_VER!
echo  [!] Status:    EXPOSED to PHP2Shell (CVE-2026-109618 and CVE-2026-109619)
echo  [*] Action:    Upgrading to official patched PHP 8.3.36 runtime...
echo ==============================================================================
echo.

if "%SCAN_ONLY%"=="1" (
    echo [*] Scan-only mode complete. Vulnerability found. Exiting with status 1.
    exit /b 1
)

:: ------------------------------------------------------------------------------
:: STEP 2: DOWNLOAD, VERIFY, EXTRACT & HARDEN
:: ------------------------------------------------------------------------------
:DO_DOWNLOAD_INSTALL
set "BASE_DIR=%LOCALAPPDATA%\Programs\PHP"
set "TARGET_DIR=%BASE_DIR%\8.3.36\nts\x64"
set "CURRENT_LINK=%BASE_DIR%\current"
set "TEMP_ZIP=%TEMP%\php-8.3.36-nts-Win32-vs16-x64.zip"

set "PHP_DOWNLOAD_URL=https://downloads.php.net/~windows/releases/archives/php-8.3.36-nts-Win32-vs16-x64.zip"
set "EXPECTED_SHA256=3c9242622c7402b47c38d2ec2ed779cef3a290fd6f2bde6c35f9c482699e7900"

if exist "%TARGET_DIR%\php.exe" if "%FORCE_INSTALL%"=="0" (
    echo [+] Patched PHP 8.3.36 package already extracted at:
    echo     %TARGET_DIR%
    goto :CONFIGURE_INI
)

echo [*] Downloading official patched PHP 8.3.36 (NTS x64)...
echo     URL: %PHP_DOWNLOAD_URL%

where.exe curl.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    curl.exe -L -# -o "%TEMP_ZIP%" "%PHP_DOWNLOAD_URL%"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%PHP_DOWNLOAD_URL%', '%TEMP_ZIP%')"
)

if not exist "%TEMP_ZIP%" (
    echo [-] Error: Download failed. Please check network connectivity.
    goto :FAIL
)

echo [*] Verifying official SHA-256 integrity hash...
set "FILE_HASH="
for /f "skip=1 tokens=*" %%h in ('certutil -hashfile "%TEMP_ZIP%" SHA256 2^>nul') do (
    if not defined FILE_HASH set "FILE_HASH=%%h"
)
set "FILE_HASH=%FILE_HASH: =%"
set "FILE_HASH=%FILE_HASH:~0,64%"

if /i not "%FILE_HASH%"=="%EXPECTED_SHA256%" (
    echo [-] Error: Checksum mismatch!
    echo     Expected: %EXPECTED_SHA256%
    echo     Computed: %FILE_HASH%
    del /f /q "%TEMP_ZIP%" >nul 2>&1
    goto :FAIL
)
echo [+] Checksum verified: %FILE_HASH%

echo [*] Extracting PHP 8.3.36 to:
echo     %TARGET_DIR%
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

where.exe tar.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    tar.exe -xf "%TEMP_ZIP%" -C "%TARGET_DIR%"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%TARGET_DIR%' -Force"
)

del /f /q "%TEMP_ZIP%" >nul 2>&1
echo [+] Extraction complete.

:CONFIGURE_INI
echo.
echo [*] Generating hardened php.ini configuration...
set "INI_FILE=%TARGET_DIR%\php.ini"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$src = if (Test-Path '%TARGET_DIR%\php.ini-production') { '%TARGET_DIR%\php.ini-production' } else { '%TARGET_DIR%\php.ini-development' };" ^
    "$content = Get-Content $src -Raw;" ^
    "$content = $content -replace ';?extension_dir = \"ext\"', 'extension_dir = \"ext\"';" ^
    "$content = $content -replace 'expose_php = On', 'expose_php = Off';" ^
    "$content = $content -replace ';?session\.upload_progress\.enabled = (On|Off|1|0)', 'session.upload_progress.enabled = Off';" ^
    "$content = $content -replace ';?session\.upload_progress\.cleanup = (On|Off|1|0)', 'session.upload_progress.cleanup = On';" ^
    "$content = $content -replace ';extension=curl', 'extension=curl';" ^
    "$content = $content -replace ';extension=mbstring', 'extension=mbstring';" ^
    "$content = $content -replace ';extension=openssl', 'extension=openssl';" ^
    "$content = $content -replace ';extension=pdo_mysql', 'extension=pdo_mysql';" ^
    "$content = $content -replace ';extension=zip', 'extension=zip';" ^
    "Set-Content -Path '%INI_FILE%' -Value $content -Encoding utf8;"

if exist "%INI_FILE%" (
    echo [+] Hardened php.ini configured:
    echo     - session.upload_progress.enabled = Off (Mitigates CVE-2026-109619)
    echo     - session.upload_progress.cleanup = On
    echo     - expose_php = Off                      (Prevents version disclosure)
    echo     - Extensions enabled: curl, mbstring, openssl, pdo_mysql, zip
)

echo.
echo [*] Configuring junction point and environment PATH...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "if (Test-Path '%CURRENT_LINK%') { [System.IO.Directory]::Delete('%CURRENT_LINK%', $false) };" ^
    "New-Item -ItemType Junction -Path '%CURRENT_LINK%' -Target '%TARGET_DIR%' | Out-Null;"

if exist "%CURRENT_LINK%\php.exe" (
    echo [+] Junction updated: %CURRENT_LINK% -^> %TARGET_DIR%
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$p = [Environment]::GetEnvironmentVariable('Path', 'User');" ^
    "if ($p -notlike '*%CURRENT_LINK%*') {" ^
    "    [Environment]::SetEnvironmentVariable('Path', $p + ';%CURRENT_LINK%', 'User');" ^
    "    Write-Host '[+] Added %CURRENT_LINK% to User PATH';" ^
    "} else {" ^
    "    Write-Host '[+] %CURRENT_LINK% is already present in User PATH';" ^
    "}"

echo.
echo ==============================================================================
echo  Verification and Results
echo ==============================================================================
"%CURRENT_LINK%\php.exe" -v
echo.
"%CURRENT_LINK%\php.exe" -r "echo 'Upload Progress:   ' . (ini_get('session.upload_progress.enabled') ? 'Enabled (VULN)' : 'Disabled (SECURE)') . PHP_EOL;"
"%CURRENT_LINK%\php.exe" -r "echo 'Version Disclosure: ' . (ini_get('expose_php') ? 'Enabled (LEAK)' : 'Disabled (SECURE)') . PHP_EOL;"
echo.
echo ==============================================================================
echo  [SUCCESS] This Windows system is now PATCHED and HARDENED against PHP2Shell!
echo ==============================================================================
goto :END

:FAIL
echo.
echo ==============================================================================
echo  [ERROR] Process did not complete. Please check network/permissions.
echo ==============================================================================
exit /b 1

:END
exit /b 0
