# PowerShell script to test agent creation API
# This will help you get a proper JWT token and test the endpoint

Write-Host "🧪 Testing Agent Creation API" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Configuration
$LOCAL_URL = "http://localhost:3000"
$TUNNEL_URL = "https://1x1khddk-3000.uks1.devtunnels.ms"
$TELEGRAM_TOKEN = "8266658003:AAGYt8nv-DVS2N8Pk7E89Sm5FcRYG1Vq2Lg"

Write-Host "📋 Available test options:" -ForegroundColor Yellow
Write-Host "1. Test with local development server (localhost:3000)" -ForegroundColor White
Write-Host "2. Test with tunnel URL (devtunnels)" -ForegroundColor White
Write-Host "3. Get Supabase project info for manual testing" -ForegroundColor White
Write-Host "4. Test webhook setup directly" -ForegroundColor White

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        $baseUrl = $LOCAL_URL
        Write-Host "🔗 Testing with local server: $baseUrl" -ForegroundColor Green
    }
    "2" {
        $baseUrl = $TUNNEL_URL
        Write-Host "🔗 Testing with tunnel: $baseUrl" -ForegroundColor Green
    }
    "3" {
        Write-Host "📊 Getting Supabase project information..." -ForegroundColor Blue
        try {
            $status = supabase status --output json | ConvertFrom-Json
            Write-Host "✅ Local Supabase Info:" -ForegroundColor Green
            Write-Host "  API URL: $($status.API_URL)" -ForegroundColor Gray
            Write-Host "  Anon Key: $($status.ANON_KEY)" -ForegroundColor Gray
            Write-Host "  Service Role Key: $($status.SERVICE_ROLE_KEY)" -ForegroundColor Gray
            
            Write-Host "`n💡 To test manually:" -ForegroundColor Yellow
            Write-Host "1. Go to your app in browser" -ForegroundColor White
            Write-Host "2. Open browser dev tools (F12)" -ForegroundColor White
            Write-Host "3. Go to Application/Storage tab" -ForegroundColor White
            Write-Host "4. Find 'supabase.auth.token' in localStorage" -ForegroundColor White
            Write-Host "5. Copy the access_token value" -ForegroundColor White
            Write-Host "6. Use that token in your API calls" -ForegroundColor White
        } catch {
            Write-Host "❌ Error getting Supabase status: $_" -ForegroundColor Red
        }
        return
    }
    "4" {
        Write-Host "🔗 Testing webhook setup directly..." -ForegroundColor Blue
        
        $webhookPayload = @{
            botToken = $TELEGRAM_TOKEN
            baseUrl = $TUNNEL_URL
        } | ConvertTo-Json
        
        try {
            Write-Host "📤 Sending webhook setup request..." -ForegroundColor Yellow
            $response = Invoke-RestMethod -Uri "$TUNNEL_URL/api/integrations/telegram/setupWebhook" `
                -Method POST `
                -ContentType "application/json" `
                -Body $webhookPayload
            
            Write-Host "✅ Webhook setup successful!" -ForegroundColor Green
            Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
        } catch {
            Write-Host "❌ Webhook setup failed: $_" -ForegroundColor Red
            if ($_.Exception.Response) {
                $errorResponse = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorResponse)
                $errorBody = $reader.ReadToEnd()
                Write-Host "Error details: $errorBody" -ForegroundColor Red
            }
        }
        
        $token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IkpDRWV4RkZlbUM0R2Vpb0kiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3B3a3Fla2hrenZleWRhaHJubGd1LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4YzFlMzczMC1lZGZlLTRhZjAtOTcxOS05NGIxZGIzMjcwZjMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4Mjk3NjQyLCJpYXQiOjE3NTgyOTQwNDIsImVtYWlsIjoibW9odW1lZHJhc2xhbkBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImNvbXBhbnkiOiJuYWJpaCIsImVtYWlsIjoibW9odW1lZHJhc2xhbkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyc3ROYW1lIjoibW9odW1lZCIsImxhc3ROYW1lIjoicmFzbGFuIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiI4YzFlMzczMC1lZGZlLTRhZjAtOTcxOS05NGIxZGIzMjcwZjMiLCJzdWJzY3JpcHRpb24iOiJmcmVlIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTgyOTQwNDJ9XSwic2Vzc2lvbl9pZCI6IjViZGIzMzI2LWNmMDAtNDA2MC05MmY0LTExMTE1NDlhYjhmOSIsImlzX2Fub255bW91cyI6ZmFsc2V9.J3KtZkCHyPBnndrYgw3daL-LatR0Seq08Q5Ppsbt1x0"

Write-Host "🧪 Testing Agent Creation API..." -ForegroundColor Cyan
Write-Host "Token: $($token.Substring(0,50))..." -ForegroundColor Yellow

$body = @{
    name = "Test Support Agent"
    base_prompt = "You are a helpful customer support assistant"
    model = "gpt-4o"
    integrations = @{
        telegramToken = "8266658003:AAGYt8nv-DVS2N8Pk7E89Sm5FcRYG1Vq2Lg"
        autoSetupWebhook = $true
        baseUrl = "https://1x1khddk-3000.uks1.devtunnels.ms/"
    }
} | ConvertTo-Json -Depth 3

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

Write-Host "📤 Sending request to http://localhost:3000/api/agents" -ForegroundColor Blue

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/agents" -Method POST -Body $body -Headers $headers
    Write-Host "✅ SUCCESS! Agent created successfully!" -ForegroundColor Green
    Write-Host "📋 Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ ERROR occurred:" -ForegroundColor Red
    Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "📄 Server Response:" -ForegroundColor Yellow
            Write-Host $responseBody -ForegroundColor Yellow
            $reader.Close()
        } catch {
            Write-Host "Could not read response body" -ForegroundColor Red
        }
    }
}
        return
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        return
    }
}

# Test agent creation
Write-Host "`n🤖 Testing agent creation..." -ForegroundColor Yellow
Write-Host "⚠️  Note: You'll need a valid JWT token for this to work." -ForegroundColor Yellow

$agentPayload = @{
    name = "Test Support Agent"
    base_prompt = "You are a helpful customer support assistant"
    model = "gpt-4o"
    integrations = @{
        telegramToken = $TELEGRAM_TOKEN
        autoSetupWebhook = $true
        baseUrl = $baseUrl
    }
} | ConvertTo-Json -Depth 3

Write-Host "`n📋 Payload to send:" -ForegroundColor Blue
Write-Host $agentPayload -ForegroundColor Gray

Write-Host "`n💡 To get a valid JWT token:" -ForegroundColor Yellow
Write-Host "1. Start your Next.js app: npm run dev" -ForegroundColor White
Write-Host "2. Sign in through the UI" -ForegroundColor White
Write-Host "3. Open browser dev tools (F12)" -ForegroundColor White
Write-Host "4. Go to Application → Local Storage" -ForegroundColor White
Write-Host "5. Find 'supabase.auth.token'" -ForegroundColor White
Write-Host "6. Copy the access_token value" -ForegroundColor White

$token = Read-Host "`nEnter your JWT token (or press Enter to skip)"

if ($token) {
    try {
        Write-Host "`n📤 Sending agent creation request..." -ForegroundColor Yellow
        
        $headers = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $token"
        }
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/agents" `
            -Method POST `
            -Headers $headers `
            -Body $agentPayload
        
        Write-Host "✅ Agent created successfully!" -ForegroundColor Green
        Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
        
        if ($response.webhook -and $response.webhook.success) {
            Write-Host "🔗 Webhook configured automatically!" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "❌ Agent creation failed: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode
            Write-Host "Status Code: $statusCode" -ForegroundColor Red
            
            try {
                $errorResponse = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorResponse)
                $errorBody = $reader.ReadToEnd()
                Write-Host "Error details: $errorBody" -ForegroundColor Red
            } catch {
                Write-Host "Could not read error details" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "⏭️  Skipped agent creation test (no token provided)" -ForegroundColor Yellow
}

Write-Host "`n🎉 Test script completed!" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Configure environment variables in Supabase Dashboard" -ForegroundColor White
Write-Host "2. Set up cron scheduler for dispatch-outbound" -ForegroundColor White
Write-Host "3. Test end-to-end flow with Telegram bot" -ForegroundColor White
