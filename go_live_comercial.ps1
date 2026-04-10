param(
    [string]$DbHost = "127.0.0.1",
    [int]$DbPort = 3306,
    [string]$DbName = "athos",
    [string]$DbUser = "root",
    [string]$DbPassword = "",
    [string]$BaseUrl = "http://127.0.0.1:8080",
    [string]$AdminUser = "adm.super",
    [string]$AdminPassword = "",
    [int]$PerfRequests = 200,
    [int]$PerfConcurrency = 20,
    [string]$OutDir = ".\relatorios-go-live",
    [string]$MySqlBinDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Comando '$Name' nao encontrado no PATH."
    }
}

function Resolve-ToolPath {
    param(
        [string]$ToolName,
        [string]$BinDir
    )
    if (-not [string]::IsNullOrWhiteSpace($BinDir)) {
        $candidateExe = Join-Path $BinDir "$ToolName.exe"
        $candidateCmd = Join-Path $BinDir $ToolName
        if (Test-Path $candidateExe) { return $candidateExe }
        if (Test-Path $candidateCmd) { return $candidateCmd }
    }

    $cmd = Get-Command $ToolName -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    return $null
}

function Get-DefaultMySqlBinCandidates {
    $candidates = New-Object System.Collections.Generic.List[string]

    if ($env:MYSQL_HOME) {
        $candidates.Add((Join-Path $env:MYSQL_HOME "bin"))
        $candidates.Add($env:MYSQL_HOME)
    }

    $programFiles = @($env:ProgramFiles, ${env:ProgramFiles(x86)}) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    foreach ($pf in $programFiles) {
        $base = Join-Path $pf "MySQL"
        if (Test-Path $base) {
            $dirs = Get-ChildItem -Path $base -Directory -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -like "MySQL Server *" } |
                Sort-Object Name -Descending
            foreach ($d in $dirs) {
                $candidates.Add((Join-Path $d.FullName "bin"))
            }
        }
    }

    # Portable/common custom install paths
    $candidates.Add("C:\mysql\bin")
    $candidates.Add("C:\tools\mysql\bin")

    # Remove duplicados e inexistentes
    return $candidates |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Select-Object -Unique |
        Where-Object { Test-Path $_ }
}

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==== $Message ====" -ForegroundColor Cyan
}

function Invoke-HealthCheck {
    param([string]$Url)
    $healthUrl = "$Url/actuator/health"
    $resp = Invoke-RestMethod -Method Get -Uri $healthUrl -TimeoutSec 15
    if ($null -eq $resp -or $resp.status -ne "UP") {
        throw "Health check nao retornou UP em $healthUrl"
    }
}

function Invoke-LoginCheck {
    param(
        [string]$Url,
        [string]$User,
        [string]$Password
    )
    $loginUrl = "$Url/api/auth/login"
    $headers = @{ "Content-Type" = "application/json" }
    $payload = @{ username = $User; password = $Password } | ConvertTo-Json -Compress
    $resp = Invoke-RestMethod -Method Post -Uri $loginUrl -Headers $headers -Body $payload -TimeoutSec 15
    if (-not $resp.token) {
        throw "Login check falhou para usuario '$User'."
    }
}

if ([string]::IsNullOrWhiteSpace($DbPassword)) {
    throw "Informe -DbPassword para executar backup e reset."
}
if ([string]::IsNullOrWhiteSpace($AdminPassword)) {
    throw "Informe -AdminPassword para validar login e performance."
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$resetScript = Join-Path $root "sistema-cadastro-backend\scripts\reset_ambiente_comercial.sql"
$perfScript = Join-Path $root "sistema-cadastro-backend\scripts\performance_smoke_test.ps1"

if (-not (Test-Path $resetScript)) {
    throw "Script de reset nao encontrado: $resetScript"
}
if (-not (Test-Path $perfScript)) {
    throw "Script de performance nao encontrado: $perfScript"
}

if ([string]::IsNullOrWhiteSpace($MySqlBinDir)) {
    $autoBins = Get-DefaultMySqlBinCandidates
    foreach ($bin in $autoBins) {
        $tryDump = Resolve-ToolPath -ToolName "mysqldump" -BinDir $bin
        $tryMysql = Resolve-ToolPath -ToolName "mysql" -BinDir $bin
        if ($tryDump -and $tryMysql) {
            $MySqlBinDir = $bin
            break
        }
    }
}

$mysqldumpCmd = Resolve-ToolPath -ToolName "mysqldump" -BinDir $MySqlBinDir
$mysqlCmd = Resolve-ToolPath -ToolName "mysql" -BinDir $MySqlBinDir

if (-not $mysqldumpCmd) {
    throw "Comando 'mysqldump' nao encontrado. Configure PATH, MYSQL_HOME ou use -MySqlBinDir com a pasta bin do MySQL."
}
if (-not $mysqlCmd) {
    throw "Comando 'mysql' nao encontrado. Configure PATH, MYSQL_HOME ou use -MySqlBinDir com a pasta bin do MySQL."
}

if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $OutDir "backup_antes_golive_$timestamp.sql"
$perfLogFile = Join-Path $OutDir "performance_$timestamp.log"
$summaryFile = Join-Path $OutDir "resumo_golive_$timestamp.txt"

Write-Step "1) Backup do banco"
$env:MYSQL_PWD = $DbPassword
& $mysqldumpCmd --host=$DbHost --port=$DbPort --user=$DbUser $DbName > $backupFile
if ($LASTEXITCODE -ne 0) {
    throw "Falha no backup com mysqldump."
}

Write-Step "2) Reset comercial do banco"
$sqlContent = Get-Content -Path $resetScript -Raw
$sqlContent | & $mysqlCmd --host=$DbHost --port=$DbPort --user=$DbUser $DbName
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao executar reset comercial."
}

Write-Step "3) Validacao de health e login"
Invoke-HealthCheck -Url $BaseUrl
Invoke-LoginCheck -Url $BaseUrl -User $AdminUser -Password $AdminPassword

Write-Step "4) Performance smoke"
$perfOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $perfScript `
    -BaseUrl $BaseUrl `
    -Username $AdminUser `
    -Password $AdminPassword `
    -Requests $PerfRequests `
    -Concurrency $PerfConcurrency | Out-String
$perfOutput | Out-File -FilePath $perfLogFile -Encoding UTF8

Write-Step "5) Relatorio final"
$summary = @()
$summary += "GO-LIVE COMERCIAL - RESUMO"
$summary += "Data: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")"
$summary += "Ambiente: $BaseUrl"
$summary += "Banco: ${DbHost}:$DbPort/$DbName"
$summary += "Usuario validado: $AdminUser"
$summary += "MySQL bin dir: $(if ([string]::IsNullOrWhiteSpace($MySqlBinDir)) { '<PATH>' } else { $MySqlBinDir })"
$summary += "Backup: $backupFile"
$summary += "Performance log: $perfLogFile"
$summary += ""
$summary += "STATUS: OK"
$summary += ""
$summary += "Saida performance:"
$summary += $perfOutput

$summary -join [Environment]::NewLine | Out-File -FilePath $summaryFile -Encoding UTF8
Write-Host "Concluido com sucesso."
Write-Host "Resumo: $summaryFile"

Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
