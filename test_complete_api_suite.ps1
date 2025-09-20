# =====================================================
# COMPREHENSIVE API TEST SUITE - PowerShell
# Intaj Platform - Complete Testing Framework
# =====================================================

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$AdminKey = $env:INTERNAL_ADMIN_KEY,
    [string]$JwtToken = $env:SUPABASE_JWT_TOKEN,
    [string]$BotToken = $env:TELEGRAM_BOT_TOKEN,
    [switch]$SkipAuth = $false,
    [switch]$Verbose = $false
)

# Colors for output
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
    Header = "Magenta"
}

function Write-TestHeader {
    param([string]$Title)
    Write-Host "`n$('=' * 60)" -ForegroundColor $Colors.Header
    Write-Host $Title -ForegroundColor $Colors.Header
    Write-Host "$('=' * 60)" -ForegroundColor $Colors.Header
}

function Write-TestResult {
    param(
        [string]$Test,
        [bool]$Success,
        [string]$Message = "",
        [object]$Data = $null
    )
    
    $status = if ($Success) { "✅ PASS" } else { "❌ FAIL" }
    $color = if ($Success) { $Colors.Success } else { $Colors.Error }
    
    Write-Host "$status - $Test" -ForegroundColor $color
    if ($Message) {
        Write-Host "   $Message" -ForegroundColor $Colors.Info
    }
    if ($Data -and $Verbose) {
        Write-Host "   Data: $($Data | ConvertTo-Json -Compress)" -ForegroundColor $Colors.Info
    }
}

function Invoke-ApiTest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$TestName
    )
    
    try {
        $requestParams = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $requestParams.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @requestParams
        return @{
            Success = $true
            Data = $response
            StatusCode = 200
        }
    }
    catch {
        $errorDetails = $_.Exception.Message
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            $errorDetails += " (Status: $statusCode)"
        }
        
        return @{
            Success = $false
            Error = $errorDetails
            StatusCode = $statusCode
        }
    }
}

# Global test results
$TestResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Skipped = 0
}

function Update-TestResults {
    param([bool]$Success, [bool]$Skipped = $false)
    $TestResults.Total++
    if ($Skipped) {
        $TestResults.Skipped++
    } elseif ($Success) {
        $TestResults.Passed++
    } else {
        $TestResults.Failed++
    }
}

# Start testing
Write-TestHeader "INTAJ PLATFORM API TEST SUITE"
Write-Host "Base URL: $BaseUrl" -ForegroundColor $Colors.Info
Write-Host "Admin Key: $($AdminKey -replace '.', '*')" -ForegroundColor $Colors.Info
Write-Host "JWT Token: $($JwtToken.Substring(0, [Math]::Min(20, $JwtToken.Length)))..." -ForegroundColor $Colors.Info

# Test 1: Health Check / Basic Connectivity
Write-TestHeader "GROUP 1: BASIC CONNECTIVITY TESTS"

Write-Host "`n🔍 Test 1.1: Server Health Check"
$healthResult = Invoke-ApiTest -Url "$BaseUrl/api/example" -TestName "Health Check"
Write-TestResult -Test "Server Connectivity" -Success $healthResult.Success -Message $healthResult.Error
Update-TestResults -Success $healthResult.Success

# Test 2: Authentication Tests
Write-TestHeader "GROUP 2: AUTHENTICATION TESTS"

if (-not $SkipAuth -and $JwtToken -ne "your-jwt-token-here") {
    Write-Host "`n🔐 Test 2.1: JWT Token Validation"
    $authHeaders = @{
        "Authorization" = "Bearer $JwtToken"
        "Content-Type" = "application/json"
    }
    
    $authResult = Invoke-ApiTest -Url "$BaseUrl/api/agents" -Headers $authHeaders -TestName "JWT Auth"
    Write-TestResult -Test "JWT Authentication" -Success $authResult.Success -Message $authResult.Error
    Update-TestResults -Success $authResult.Success
} else {
    Write-Host "⏭️  Skipping authentication tests (no valid JWT token)" -ForegroundColor $Colors.Warning
    Update-TestResults -Success $false -Skipped $true
}

# Test 3: Agent Creation and Management
Write-TestHeader "GROUP 3: AGENT MANAGEMENT TESTS"

$testAgentId = $null
$testConnectionId = $null

if ($JwtToken -ne "your-jwt-token-here") {
    Write-Host "`n🤖 Test 3.1: Create Agent"
    $agentData = @{
        name = "Test API Agent $(Get-Date -Format 'HHmmss')"
        base_prompt = "You are a helpful test assistant created via API testing"
        model = "gpt-4o"
        description = "Test agent created by PowerShell test suite"
        agent_type = "chatbot"
    }
    
    $agentHeaders = @{
        "Authorization" = "Bearer $JwtToken"
        "Content-Type" = "application/json"
    }
    
    $agentResult = Invoke-ApiTest -Url "$BaseUrl/api/agents" -Method "POST" -Headers $agentHeaders -Body $agentData -TestName "Create Agent"
    
    if ($agentResult.Success) {
        $testAgentId = $agentResult.Data.agentId
        Write-TestResult -Test "Agent Creation" -Success $true -Message "Agent ID: $testAgentId"
    } else {
        Write-TestResult -Test "Agent Creation" -Success $false -Message $agentResult.Error
    }
    Update-TestResults -Success $agentResult.Success
    
    # Test 3.2: List Agents
    Write-Host "`n📋 Test 3.2: List Agents"
    $listResult = Invoke-ApiTest -Url "$BaseUrl/api/agents" -Headers $agentHeaders -TestName "List Agents"
    Write-TestResult -Test "List Agents" -Success $listResult.Success -Message $listResult.Error
    Update-TestResults -Success $listResult.Success
} else {
    Write-Host "⏭️  Skipping agent tests (no valid JWT token)" -ForegroundColor $Colors.Warning
    Update-TestResults -Success $false -Skipped $true
    Update-TestResults -Success $false -Skipped $true
}

# Test 4: Telegram Integration Tests
Write-TestHeader "GROUP 4: TELEGRAM INTEGRATION TESTS"

if ($BotToken -ne "your-bot-token-here" -and $testAgentId) {
    Write-Host "`n📱 Test 4.1: Create Agent with Telegram Integration"
    $telegramAgentData = @{
        name = "Test Telegram Agent $(Get-Date -Format 'HHmmss')"
        base_prompt = "You are a helpful Telegram bot assistant"
        model = "gpt-4o"
        integrations = @{
            telegramToken = $BotToken
            autoSetupWebhook = $true
            baseUrl = $BaseUrl
        }
    }
    
    $telegramResult = Invoke-ApiTest -Url "$BaseUrl/api/agents" -Method "POST" -Headers $agentHeaders -Body $telegramAgentData -TestName "Telegram Agent"
    
    if ($telegramResult.Success) {
        $testConnectionId = $telegramResult.Data.connectionId
        Write-TestResult -Test "Telegram Agent Creation" -Success $true -Message "Connection ID: $testConnectionId"
    } else {
        Write-TestResult -Test "Telegram Agent Creation" -Success $false -Message $telegramResult.Error
    }
    Update-TestResults -Success $telegramResult.Success
    
    # Test 4.2: Manual Webhook Setup
    Write-Host "`n🔗 Test 4.2: Manual Webhook Setup"
    $webhookData = @{
        botToken = $BotToken
        baseUrl = $BaseUrl
    }
    
    $webhookResult = Invoke-ApiTest -Url "$BaseUrl/api/integrations/telegram/setupWebhook" -Method "POST" -Body $webhookData -TestName "Webhook Setup"
    Write-TestResult -Test "Webhook Setup" -Success $webhookResult.Success -Message $webhookResult.Error
    Update-TestResults -Success $webhookResult.Success
} else {
    Write-Host "⏭️  Skipping Telegram tests (no bot token or agent ID)" -ForegroundColor $Colors.Warning
    Update-TestResults -Success $false -Skipped $true
    Update-TestResults -Success $false -Skipped $true
}

# Test 5: Internal API Tests
Write-TestHeader "GROUP 5: INTERNAL API TESTS"

if ($AdminKey -ne "your-admin-key-here") {
    $internalHeaders = @{
        "X-ADMIN-KEY" = $AdminKey
        "Content-Type" = "application/json"
    }
    
    # Test 5.1: LLM Generate
    if ($testAgentId) {
        Write-Host "`n🧠 Test 5.1: LLM Generation"
        $llmData = @{
            agentId = $testAgentId
            messages = @(
                @{
                    role = "user"
                    content = "Hello, this is a test message for API validation"
                }
            )
        }
        
        $llmResult = Invoke-ApiTest -Url "$BaseUrl/api/internal/llm-generate" -Method "POST" -Headers $internalHeaders -Body $llmData -TestName "LLM Generate"
        Write-TestResult -Test "LLM Generation" -Success $llmResult.Success -Message $llmResult.Error
        Update-TestResults -Success $llmResult.Success
    } else {
        Write-Host "⏭️  Skipping LLM test (no agent ID)" -ForegroundColor $Colors.Warning
        Update-TestResults -Success $false -Skipped $true
    }
    
    # Test 5.2: Dispatch Messages
    Write-Host "`n📤 Test 5.2: Message Dispatch"
    $dispatchResult = Invoke-ApiTest -Url "$BaseUrl/api/internal/dispatch" -Method "POST" -Headers $internalHeaders -TestName "Message Dispatch"
    Write-TestResult -Test "Message Dispatch" -Success $dispatchResult.Success -Message $dispatchResult.Error
    Update-TestResults -Success $dispatchResult.Success
} else {
    Write-Host "⏭️  Skipping internal API tests (no admin key)" -ForegroundColor $Colors.Warning
    Update-TestResults -Success $false -Skipped $true
    Update-TestResults -Success $false -Skipped $true
}

# Test 6: Database Operations via API
Write-TestHeader "GROUP 6: DATABASE OPERATIONS TESTS"

if ($JwtToken -ne "your-jwt-token-here") {
    # Test 6.1: FAQ Management
    Write-Host "`n❓ Test 6.1: FAQ Operations"
    if ($testAgentId) {
        $faqData = @{
            agent_id = $testAgentId
            question = "What is this test about?"
            answer = "This is an automated API test for the FAQ system"
        }
        
        $faqResult = Invoke-ApiTest -Url "$BaseUrl/api/faqs" -Method "POST" -Headers $agentHeaders -Body $faqData -TestName "FAQ Creation"
        Write-TestResult -Test "FAQ Creation" -Success $faqResult.Success -Message $faqResult.Error
        Update-TestResults -Success $faqResult.Success
    } else {
        Write-Host "⏭️  Skipping FAQ test (no agent ID)" -ForegroundColor $Colors.Warning
        Update-TestResults -Success $false -Skipped $true
    }
    
    # Test 6.2: Data Sources
    Write-Host "`n📄 Test 6.2: Data Source Operations"
    if ($testAgentId) {
        $dataSourceData = @{
            agent_id = $testAgentId
            type = "text"
            name = "Test Knowledge Base"
            content = "This is test content for the knowledge base validation"
        }
        
        $dsResult = Invoke-ApiTest -Url "$BaseUrl/api/data_sources" -Method "POST" -Headers $agentHeaders -Body $dataSourceData -TestName "Data Source Creation"
        Write-TestResult -Test "Data Source Creation" -Success $dsResult.Success -Message $dsResult.Error
        Update-TestResults -Success $dsResult.Success
    } else {
        Write-Host "⏭️  Skipping data source test (no agent ID)" -ForegroundColor $Colors.Warning
        Update-TestResults -Success $false -Skipped $true
    }
} else {
    Write-Host "⏭️  Skipping database operation tests (no JWT token)" -ForegroundColor $Colors.Warning
    Update-TestResults -Success $false -Skipped $true
    Update-TestResults -Success $false -Skipped $true
}

# Test 7: Error Handling and Edge Cases
Write-TestHeader "GROUP 7: ERROR HANDLING TESTS"

Write-Host "`n🚫 Test 7.1: Invalid Endpoint"
$invalidResult = Invoke-ApiTest -Url "$BaseUrl/api/nonexistent" -TestName "Invalid Endpoint"
Write-TestResult -Test "404 Error Handling" -Success (-not $invalidResult.Success) -Message "Expected failure"
Update-TestResults -Success (-not $invalidResult.Success)

Write-Host "`n🔒 Test 7.2: Unauthorized Access"
$unauthorizedResult = Invoke-ApiTest -Url "$BaseUrl/api/internal/llm-generate" -Method "POST" -TestName "Unauthorized Access"
Write-TestResult -Test "Unauthorized Access Handling" -Success (-not $unauthorizedResult.Success) -Message "Expected failure"
Update-TestResults -Success (-not $unauthorizedResult.Success)

# Final Results Summary
Write-TestHeader "TEST RESULTS SUMMARY"

$passRate = if ($TestResults.Total -gt 0) { 
    [math]::Round(($TestResults.Passed / $TestResults.Total) * 100, 2) 
} else { 0 }

Write-Host "`n📊 FINAL RESULTS:" -ForegroundColor $Colors.Header
Write-Host "   Total Tests: $($TestResults.Total)" -ForegroundColor $Colors.Info
Write-Host "   Passed: $($TestResults.Passed)" -ForegroundColor $Colors.Success
Write-Host "   Failed: $($TestResults.Failed)" -ForegroundColor $Colors.Error
Write-Host "   Skipped: $($TestResults.Skipped)" -ForegroundColor $Colors.Warning
Write-Host "   Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { $Colors.Success } else { $Colors.Warning })

if ($TestResults.Failed -gt 0) {
    Write-Host "`n⚠️  Some tests failed. Check the output above for details." -ForegroundColor $Colors.Warning
    Write-Host "💡 Common issues:" -ForegroundColor $Colors.Info
    Write-Host "   - Missing environment variables (JWT_TOKEN, BOT_TOKEN, ADMIN_KEY)" -ForegroundColor $Colors.Info
    Write-Host "   - Server not running on $BaseUrl" -ForegroundColor $Colors.Info
    Write-Host "   - Database connection issues" -ForegroundColor $Colors.Info
    Write-Host "   - Invalid authentication tokens" -ForegroundColor $Colors.Info
}

Write-Host "`n🎉 API testing complete!" -ForegroundColor $Colors.Success
Write-Host "`n📝 Next Steps:" -ForegroundColor $Colors.Info
Write-Host "1. Set environment variables for full testing" -ForegroundColor $Colors.Info
Write-Host "2. Deploy Edge Functions: supabase functions deploy" -ForegroundColor $Colors.Info
Write-Host "3. Configure cron scheduler for automated dispatch" -ForegroundColor $Colors.Info
Write-Host "4. Test end-to-end flow with real Telegram messages" -ForegroundColor $Colors.Info

# Export results to JSON for CI/CD integration
$resultsJson = @{
    timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    baseUrl = $BaseUrl
    results = $TestResults
    testAgentId = $testAgentId
    testConnectionId = $testConnectionId
} | ConvertTo-Json -Depth 3

$resultsFile = "test_results_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$resultsJson | Out-File -FilePath $resultsFile -Encoding UTF8
Write-Host "`n💾 Results saved to: $resultsFile" -ForegroundColor $Colors.Info

# Exit with appropriate code
exit $(if ($TestResults.Failed -eq 0) { 0 } else { 1 })
