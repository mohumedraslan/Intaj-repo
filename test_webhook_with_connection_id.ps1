# Test webhook setup using the connection ID we know exists
$token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IkpDRWV4RkZlbUM0R2Vpb0kiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3B3a3Fla2hrenZleWRhaHJubGd1LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4YzFlMzczMC1lZGZlLTRhZjAtOTcxOS05NGIxZGIzMjcwZjMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4Mjk3NjQyLCJpYXQiOjE3NTgyOTQwNDIsImVtYWlsIjoibW9odW1lZHJhc2xhbkBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImNvbXBhbnkiOiJuYWJpaCIsImVtYWlsIjoibW9odW1lZHJhc2xhbkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyc3ROYW1lIjoibW9odW1lZCIsImxhc3ROYW1lIjoicmFzbGFuIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiI4YzFlMzczMC1lZGZlLTRhZjAtOTcxOS05NGIxZGIzMjcwZjMiLCJzdWJzY3JpcHRpb24iOiJmcmVlIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTgyOTQwNDJ9XSwic2Vzc2lvbl9pZCI6IjViZGIzMzI2LWNmMDAtNDA2MC05MmY0LTExMTE1NDlhYjhmOSIsImlzX2Fub255bW91cyI6ZmFsc2V9.J3KtZkCHyPBnndrYgw3daL-LatR0Seq08Q5Ppsbt1x0"

Write-Host "🔍 Testing webhook setup issue..." -ForegroundColor Cyan

# The issue might be that the Telegram API call is failing, not the database lookup
# Let's test just the Telegram API call first

$botToken = "8266658003:AAGYt8nv-DVS2N8Pk7E89Sm5FcRYG1Vq2Lg"
$webhookUrl = "https://1x1khddk-3000.uks1.devtunnels.ms/api/webhooks/telegram"

Write-Host "🤖 Testing Telegram setWebhook API directly..." -ForegroundColor Blue

$telegramBody = @{
    url = $webhookUrl
    drop_pending_updates = $true
} | ConvertTo-Json

try {
    $telegramResponse = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/setWebhook" -Method POST -Body $telegramBody -ContentType "application/json"
    Write-Host "✅ Telegram API Response:" -ForegroundColor Green
    $telegramResponse | ConvertTo-Json -Depth 3
    
    if ($telegramResponse.ok) {
        Write-Host "✅ Telegram webhook set successfully!" -ForegroundColor Green
        
        # Now test our webhook setup endpoint
        Write-Host "`n🔗 Now testing our webhook setup endpoint..." -ForegroundColor Blue
        
        $body = @{
            botToken = $botToken
            baseUrl = "https://1x1khddk-3000.uks1.devtunnels.ms"
        } | ConvertTo-Json

        $headers = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $token"
        }

        try {
            $response = Invoke-RestMethod -Uri "http://localhost:3000/api/integrations/telegram/setupWebhook" -Method POST -Body $body -Headers $headers
            Write-Host "✅ Our API Response:" -ForegroundColor Green
            $response | ConvertTo-Json -Depth 3
        } catch {
            Write-Host "❌ Our API Error:" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ Telegram API failed:" -ForegroundColor Red
        Write-Host $telegramResponse.description -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Telegram API Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
