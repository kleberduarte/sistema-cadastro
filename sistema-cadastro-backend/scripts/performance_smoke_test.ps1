param(
    [string]$BaseUrl = "http://127.0.0.1:8080",
    [string]$Username = "adm.super",
    [string]$Password = "",
    [int]$Requests = 200,
    [int]$Concurrency = 20
)

if ([string]::IsNullOrWhiteSpace($Password)) {
    throw "Informe a senha do usuário com -Password."
}

$healthUrl = "$BaseUrl/actuator/health"
$loginUrl = "$BaseUrl/api/auth/login"
$headers = @{ "Content-Type" = "application/json" }
$payload = @{ username = $Username; password = $Password } | ConvertTo-Json -Compress

Write-Host "== Health check =="
$health = Invoke-RestMethod -Method Get -Uri $healthUrl -TimeoutSec 15
Write-Host "Health:" ($health.status)

Write-Host "== Warm-up login =="
$warm = Invoke-RestMethod -Method Post -Uri $loginUrl -Headers $headers -Body $payload -TimeoutSec 15
if (-not $warm.token) {
    throw "Login de warm-up falhou. Valide credenciais e backend."
}

Write-Host "== Performance smoke =="
Write-Host "BaseUrl=$BaseUrl | Requests=$Requests | Concurrency=$Concurrency"

$jobs = @()
$results = New-Object System.Collections.Concurrent.ConcurrentBag[double]
$errors = New-Object System.Collections.Concurrent.ConcurrentBag[string]

$requestsPerWorker = [Math]::Ceiling($Requests / [double]$Concurrency)

for ($i = 1; $i -le $Concurrency; $i++) {
    $jobs += Start-Job -ScriptBlock {
        param($loginUrl, $headers, $payload, $requestsPerWorker)
        $localTimes = @()
        $localErrors = @()
        for ($j = 1; $j -le $requestsPerWorker; $j++) {
            try {
                $sw = [System.Diagnostics.Stopwatch]::StartNew()
                $resp = Invoke-RestMethod -Method Post -Uri $loginUrl -Headers $headers -Body $payload -TimeoutSec 20
                $sw.Stop()
                if ($resp.token) {
                    $localTimes += $sw.Elapsed.TotalMilliseconds
                } else {
                    $localErrors += "Resposta sem token."
                }
            } catch {
                $localErrors += $_.Exception.Message
            }
        }
        return @{
            Times = $localTimes
            Errors = $localErrors
        }
    } -ArgumentList $loginUrl, $headers, $payload, $requestsPerWorker
}

Wait-Job $jobs | Out-Null
$output = Receive-Job $jobs
$jobs | Remove-Job -Force | Out-Null

foreach ($worker in $output) {
    foreach ($t in $worker.Times) { $results.Add([double]$t) }
    foreach ($e in $worker.Errors) { $errors.Add($e) }
}

$times = @($results.ToArray())
$totalAttempted = $requestsPerWorker * $Concurrency
$totalOk = $times.Count
$totalErr = $errors.Count

if ($totalOk -eq 0) {
    throw "Nenhuma requisição bem-sucedida. Erros: $totalErr"
}

$sorted = $times | Sort-Object
$avg = ($times | Measure-Object -Average).Average
$min = $sorted[0]
$max = $sorted[-1]
$p95Index = [Math]::Floor(($sorted.Count - 1) * 0.95)
$p95 = $sorted[$p95Index]

Write-Host ""
Write-Host "== Resultado =="
Write-Host ("Attempted: {0}" -f $totalAttempted)
Write-Host ("Success:   {0}" -f $totalOk)
Write-Host ("Errors:    {0}" -f $totalErr)
Write-Host ("Min ms:    {0:N2}" -f $min)
Write-Host ("Avg ms:    {0:N2}" -f $avg)
Write-Host ("P95 ms:    {0:N2}" -f $p95)
Write-Host ("Max ms:    {0:N2}" -f $max)

if ($totalErr -gt 0) {
    Write-Host ""
    Write-Host "Amostra de erros:"
    $errors.ToArray() | Select-Object -First 10 | ForEach-Object { Write-Host "- $_" }
}
