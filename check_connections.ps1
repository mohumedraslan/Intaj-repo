# Check connections in database
$token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IkpDRWV4RkZlbUM0R2Vpb0kiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3B3a3Fla2hrenZleWRhaHJubGd1LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4YzFlMzczMC1lZGZlLTRhZjAtOTcxOS05NGIxZGIzMjcwZjMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4Mjk3NjQyLCJpYXQiOjE3NTgyOTQwNDIsImVtYWlsIjoibW9odW1lZHJhc2xhbkBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImNvbXBhbnkiOiJuYWJpaCIsImVtYWlsIjoibW9odW1lZHJhc2xhbkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyc3ROYW1lIjoibW9odW1lZCIsImxhc3ROYW1lIjoicmFzbGFuIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiI4YzFlMzczMC1lZGZlLTRhZjAtOTcxOS05NGIxZGIzMjcwZjMiLCJzdWJzY3JpcHRpb24iOiJmcmVlIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTgyOTQwNDJ9XSwic2Vzc2lvbl9pZCI6IjViZGIzMzI2LWNmMDAtNDA2MC05MmY0LTExMTE1NDlhYjhmOSIsImlzX2Fub255bW91cyI6ZmFsc2V9.J3KtZkCHyPBnndrYgw3daL-LatR0Seq08Q5Ppsbt1x0"

Write-Host "🔍 Checking connections in database..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    # Get all agents first
    Write-Host "📋 Getting all agents..." -ForegroundColor Blue
    $agentsResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/agents" -Method GET -Headers $headers
    Write-Host "Agents found:" -ForegroundColor Green
    $agentsResponse | ConvertTo-Json -Depth 3
    
} catch {
    Write-Host "❌ ERROR getting agents:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Server Response: $responseBody" -ForegroundColor Yellow
            $reader.Close()
        } catch {
            Write-Host "Could not read response" -ForegroundColor Red
        }
    }
}
