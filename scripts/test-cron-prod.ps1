# Test Cron Jobs auf Production
# Usage: .\scripts\test-cron-prod.ps1 <CRON_SECRET>

param(
    [Parameter(Mandatory=$true)]
    [string]$CronSecret,

    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "https://skamp.vercel.app"
)

Write-Host "🚀 Teste Cron Jobs auf Production..." -ForegroundColor Cyan
Write-Host "📍 URL: $BaseUrl" -ForegroundColor Gray
Write-Host ""

# Test 1: Scan Job
Write-Host "🔍 ===== TESTE SCAN JOB =====" -ForegroundColor Yellow
Write-Host "Calling: $BaseUrl/api/matching/scan?secret=***" -ForegroundColor Gray

try {
    $scanResponse = Invoke-RestMethod -Uri "$BaseUrl/api/matching/scan?secret=$CronSecret" -Method Get
    Write-Host "✅ Scan erfolgreich!" -ForegroundColor Green
    Write-Host ($scanResponse | ConvertTo-Json -Depth 5) -ForegroundColor White
} catch {
    Write-Host "❌ Scan fehlgeschlagen:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""

# Test 2: Auto-Import Job
Write-Host "🤖 ===== TESTE AUTO-IMPORT JOB =====" -ForegroundColor Yellow
Write-Host "Calling: $BaseUrl/api/matching/auto-import (POST)" -ForegroundColor Gray

try {
    $body = @{
        secret = $CronSecret
    } | ConvertTo-Json

    $importResponse = Invoke-RestMethod -Uri "$BaseUrl/api/matching/auto-import" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Auto-Import erfolgreich!" -ForegroundColor Green
    Write-Host ($importResponse | ConvertTo-Json -Depth 5) -ForegroundColor White
} catch {
    Write-Host "❌ Auto-Import fehlgeschlagen:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Tests abgeschlossen!" -ForegroundColor Green
