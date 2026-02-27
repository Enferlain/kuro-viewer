# Captures VS environment variables from vcvarsall.bat and sets them permanently for the current user.
# Run once, then restart your terminal.

$vcvarsall = "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat"

if (-not (Test-Path $vcvarsall)) {
    Write-Error "vcvarsall.bat not found at: $vcvarsall"
    exit 1
}

# Capture all env vars that vcvarsall sets
$output = cmd /c "call `"$vcvarsall`" x64 >nul 2>&1 && set"

$keysToSet = @("LIB", "INCLUDE", "VCINSTALLDIR", "VCToolsInstallDir", "WindowsSdkDir", "WindowsSDKLibVersion", "WindowsSDKVersion", "UCRTVersion")

foreach ($line in $output) {
    if ($line -match '^([^=]+)=(.+)$') {
        $name = $Matches[1]
        $value = $Matches[2]
        if ($keysToSet -contains $name) {
            [Environment]::SetEnvironmentVariable($name, $value, 'User')
            Write-Host "Set $name = $value" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "Done! Restart your terminal for changes to take effect." -ForegroundColor Cyan
