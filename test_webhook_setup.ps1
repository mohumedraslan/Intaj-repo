# Test webhook setup with Bearer token
$token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IkpDRWV4RkZlbUM0R2Vpb0kiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3B3a3Fla2hrenZleWRhaHJubGd1LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4YzFlMzczMC1lZGZlLTRhZjAtOTcxOS05NGIxZGIzMjcwZjMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4Mjk3NjQyLCJpYXQiOjE3NTgyOTQwNDIsImVtYWlsIjoibW9odW1lZHJhc2xhbkBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImNvbXBhbnkiOiJuYWJpaCIsImVtYWlsIjoibW9odW1lZHJhc2xhbkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyc3ROYW1lIjoibW9odW1lZCIsImxhc3ROYW1lIjoicmFzbGFuIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiI4YzFlMzczMC1lZGZlLTRhZjAtOTcxOS05NGIxZGIzMjcwZjMiLCJzdWJzY3JpcHRpb24iOiJmcmVlIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTgyOTQwNDJ9XSwic2Vzc2lvbl9pZCI6IjViZGIzMzI2LWNmMDAtNDA2MC05MmY0LTExMTE1NDlhYjhmOSIsImlzX2Fub255bW91cyI6ZmFsc2V9.J3KtZkCHyPBnndrYgw3daL-LatR0Seq08Q5Ppsbt1x0"

Write-Host "🔗 Testing Telegram Webhook Setup with Bearer Token..." -ForegroundColor Cyan

$body = @{
    botToken = "8266658003:AAGYt8nv-DVS2N8Pk7E89Sm5FcRYG1Vq2Lg"
    baseUrl = "https://1x1khddk-3000.uks1.devtunnels.ms"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

Write-Host "📤 Sending webhook setup request..." -ForegroundColor Blue

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/integrations/telegram/setupWebhook" -Method POST -Body $body -Headers $headers -UseBasicParsing
    Write-Host "✅ SUCCESS! Webhook setup completed!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response Body:" -ForegroundColor Green
    $response.Content
} catch {
    Write-Host "❌ ERROR:" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "📄 Server Response Body:" -ForegroundColor Yellow
            Write-Host $responseBody -ForegroundColor Yellow
            $reader.Close()
        } catch {
            Write-Host "Could not read response stream" -ForegroundColor Red
        }
    }
}
