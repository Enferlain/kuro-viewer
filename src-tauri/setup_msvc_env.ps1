# Captures VS environment variables from vcvarsall.bat and sets them permanently
# for the current user. Run once, then restart your terminal.

function Get-VcVarsAllPath {
    $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vswhere) {
        $installationPath = & $vswhere `
            -latest `
            -products * `
            -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
            -property installationPath

        if ($LASTEXITCODE -eq 0 -and $installationPath) {
            $candidate = Join-Path $installationPath.Trim() "VC\Auxiliary\Build\vcvarsall.bat"
            if (Test-Path $candidate) {
                return $candidate
            }
        }
    }

    $fallbacks = @(
        "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat",
        "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat",
        "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvarsall.bat",
        "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat"
    )

    foreach ($candidate in $fallbacks) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $null
}

function Add-PathEntry {
    param(
        [string]$CurrentPath,
        [string]$Entry
    )

    if ([string]::IsNullOrWhiteSpace($Entry) -or -not (Test-Path $Entry)) {
        return $CurrentPath
    }

    $parts = @()
    if (-not [string]::IsNullOrWhiteSpace($CurrentPath)) {
        $parts = $CurrentPath.Split(';', [System.StringSplitOptions]::RemoveEmptyEntries)
    }

    foreach ($part in $parts) {
        if ($part.TrimEnd('\') -ieq $Entry.TrimEnd('\')) {
            return $CurrentPath
        }
    }

    if ([string]::IsNullOrWhiteSpace($CurrentPath)) {
        return $Entry
    }

    return "$Entry;$CurrentPath"
}

$vcvarsall = Get-VcVarsAllPath

if (-not $vcvarsall) {
    Write-Error "vcvarsall.bat not found. Install or repair Visual Studio Build Tools / Community with the C++ workload."
    exit 1
}

Write-Host "Using vcvarsall at: $vcvarsall" -ForegroundColor Cyan

# Capture all env vars that vcvarsall sets.
$output = cmd /c "call `"$vcvarsall`" x64 >nul 2>&1 && set"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to evaluate vcvarsall.bat."
    exit 1
}

$captured = @{}
foreach ($line in $output) {
    if ($line -match '^([^=]+)=(.+)$') {
        $captured[$Matches[1]] = $Matches[2]
    }
}

$keysToSet = @(
    "LIB",
    "INCLUDE",
    "LIBPATH",
    "VCINSTALLDIR",
    "VCToolsInstallDir",
    "WindowsSdkDir",
    "WindowsSDKLibVersion",
    "WindowsSDKVersion",
    "UCRTVersion"
)

foreach ($name in $keysToSet) {
    $value = $captured[$name]
    if (-not [string]::IsNullOrWhiteSpace($value)) {
        [Environment]::SetEnvironmentVariable($name, $value, 'User')
        Write-Host "Set $name = $value" -ForegroundColor Green
    }
}

$pathValue = [Environment]::GetEnvironmentVariable("Path", "User")
$vcToolsInstallDir = $captured["VCToolsInstallDir"]
$windowsSdkDir = $captured["WindowsSdkDir"]
$windowsSdkVersion = $captured["WindowsSDKVersion"]

if (-not [string]::IsNullOrWhiteSpace($vcToolsInstallDir)) {
    $vcBin = Join-Path $vcToolsInstallDir "bin\Hostx64\x64"
    $pathValue = Add-PathEntry -CurrentPath $pathValue -Entry $vcBin
    Write-Host "Ensured PATH contains $vcBin" -ForegroundColor Green
}

if (
    -not [string]::IsNullOrWhiteSpace($windowsSdkDir) -and
    -not [string]::IsNullOrWhiteSpace($windowsSdkVersion)
) {
    $sdkVersion = $windowsSdkVersion.TrimEnd('\')
    $sdkBin = Join-Path $windowsSdkDir "bin\$sdkVersion\x64"
    $pathValue = Add-PathEntry -CurrentPath $pathValue -Entry $sdkBin
    Write-Host "Ensured PATH contains $sdkBin" -ForegroundColor Green
}

[Environment]::SetEnvironmentVariable("Path", $pathValue, "User")

Write-Host ""
Write-Host "Done. Restart your terminal for changes to take effect." -ForegroundColor Cyan
