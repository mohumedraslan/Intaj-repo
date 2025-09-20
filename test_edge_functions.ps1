# =====================================================
# EDGE FUNCTIONS TEST SUITE - PowerShell
# Intaj Platform - Supabase Edge Functions Testing
# =====================================================

param(
    [string]$ProjectRef = $env:SUPABASE_PROJECT_REF,
    [string]$AnonKey = $env:SUPABASE_ANON_KEY,
    [switch]$Deploy = $false,
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
        [string]$Message = ""
    )
    
    $status = if ($Success) { "✅ PASS" } else { "❌ FAIL" }
    $color = if ($Success) { $Colors.Success } else { $Colors.Error }
    
    Write-Host "$status - $Test" -ForegroundColor $color
    if ($Message) {
        Write-Host "   $Message" -ForegroundColor $Colors.Info
    }
}

function Test-SupabaseCommand {
    try {
        $result = supabase --version 2>$null
        return $result -ne $null
    }
    catch {
        return $false
    }
}

function Invoke-SupabaseFunction {
    param(
        [string]$FunctionName,
        [object]$Payload = $null,
        [hashtable]$Headers = @{}
    )
    
    try {
        $invokeArgs = @("functions", "invoke", $FunctionName, "--no-verify-jwt")
        
        if ($Payload) {
            $payloadJson = $Payload | ConvertTo-Json -Depth 10 -Compress
            $invokeArgs += @("--data", $payloadJson)
        }
        
        $result = & supabase @invokeArgs 2>&1
        
        return @{
            Success = $LASTEXITCODE -eq 0
            Output = $result
            ExitCode = $LASTEXITCODE
        }
    }
    catch {
        return @{
            Success = $false
            Output = $_.Exception.Message
            ExitCode = -1
        }
    }
}

# Start testing
Write-TestHeader "SUPABASE EDGE FUNCTIONS TEST SUITE"

# Test 1: Prerequisites Check
Write-TestHeader "GROUP 1: PREREQUISITES CHECK"

Write-Host "`n🔍 Test 1.1: Supabase CLI Installation"
$cliInstalled = Test-SupabaseCommand
Write-TestResult -Test "Supabase CLI Available" -Success $cliInstalled -Message $(if (-not $cliInstalled) { "Install Supabase CLI first" })

if (-not $cliInstalled) {
    Write-Host "`n❌ Supabase CLI is required. Install it first:" -ForegroundColor $Colors.Error
    Write-Host "   npm install -g supabase" -ForegroundColor $Colors.Info
    exit 1
}

Write-Host "`n🔑 Test 1.2: Environment Variables"
$hasProjectRef = $ProjectRef -and $ProjectRef -ne ""
$hasAnonKey = $AnonKey -and $AnonKey -ne ""

Write-TestResult -Test "Project Reference" -Success $hasProjectRef -Message $(if (-not $hasProjectRef) { "Set SUPABASE_PROJECT_REF" })
Write-TestResult -Test "Anonymous Key" -Success $hasAnonKey -Message $(if (-not $hasAnonKey) { "Set SUPABASE_ANON_KEY" })

# Test 2: Function Deployment
Write-TestHeader "GROUP 2: FUNCTION DEPLOYMENT"

if ($Deploy) {
    Write-Host "`n🚀 Test 2.1: Deploy process-inbound Function"
    try {
        $deployResult1 = & supabase functions deploy process-inbound --no-verify-jwt --debug 2>&1
        $deploySuccess1 = $LASTEXITCODE -eq 0
        Write-TestResult -Test "Deploy process-inbound" -Success $deploySuccess1 -Message $(if (-not $deploySuccess1) { $deployResult1 })
    }
    catch {
        Write-TestResult -Test "Deploy process-inbound" -Success $false -Message $_.Exception.Message
    }
    
    Write-Host "`n🚀 Test 2.2: Deploy dispatch-outbound Function"
    try {
        $deployResult2 = & supabase functions deploy dispatch-outbound --no-verify-jwt --debug 2>&1
        $deploySuccess2 = $LASTEXITCODE -eq 0
        Write-TestResult -Test "Deploy dispatch-outbound" -Success $deploySuccess2 -Message $(if (-not $deploySuccess2) { $deployResult2 })
    }
    catch {
        Write-TestResult -Test "Deploy dispatch-outbound" -Success $false -Message $_.Exception.Message
    }
} else {
    Write-Host "⏭️  Skipping deployment (use -Deploy flag to deploy)" -ForegroundColor $Colors.Warning
}

# Test 3: Function Listing
Write-TestHeader "GROUP 3: FUNCTION MANAGEMENT"

Write-Host "`n📋 Test 3.1: List Functions"
try {
    $listResult = & supabase functions list 2>&1
    $listSuccess = $LASTEXITCODE -eq 0
    Write-TestResult -Test "List Functions" -Success $listSuccess
    
    if ($listSuccess -and $Verbose) {
        Write-Host "   Functions:" -ForegroundColor $Colors.Info
        $listResult | ForEach-Object { Write-Host "   - $_" -ForegroundColor $Colors.Info }
    }
}
catch {
    Write-TestResult -Test "List Functions" -Success $false -Message $_.Exception.Message
}

# Test 4: Function Invocation Tests
Write-TestHeader "GROUP 4: FUNCTION INVOCATION TESTS"

Write-Host "`n🔄 Test 4.1: Invoke process-inbound Function"
$processInboundResult = Invoke-SupabaseFunction -FunctionName "process-inbound"
Write-TestResult -Test "Invoke process-inbound" -Success $processInboundResult.Success -Message $processInboundResult.Output

Write-Host "`n📤 Test 4.2: Invoke dispatch-outbound Function"
$dispatchOutboundResult = Invoke-SupabaseFunction -FunctionName "dispatch-outbound"
Write-TestResult -Test "Invoke dispatch-outbound" -Success $dispatchOutboundResult.Success -Message $dispatchOutboundResult.Output

# Test 5: Function Logs
Write-TestHeader "GROUP 5: FUNCTION MONITORING"

Write-Host "`n📊 Test 5.1: Check process-inbound Logs"
try {
    $logsResult1 = & supabase functions logs process-inbound --limit 10 2>&1
    $logsSuccess1 = $LASTEXITCODE -eq 0
    Write-TestResult -Test "process-inbound Logs" -Success $logsSuccess1
    
    if ($logsSuccess1 -and $Verbose) {
        Write-Host "   Recent logs:" -ForegroundColor $Colors.Info
        $logsResult1 | Select-Object -Last 5 | ForEach-Object { Write-Host "   $_" -ForegroundColor $Colors.Info }
    }
}
catch {
    Write-TestResult -Test "process-inbound Logs" -Success $false -Message $_.Exception.Message
}

Write-Host "`n📊 Test 5.2: Check dispatch-outbound Logs"
try {
    $logsResult2 = & supabase functions logs dispatch-outbound --limit 10 2>&1
    $logsSuccess2 = $LASTEXITCODE -eq 0
    Write-TestResult -Test "dispatch-outbound Logs" -Success $logsSuccess2
    
    if ($logsSuccess2 -and $Verbose) {
        Write-Host "   Recent logs:" -ForegroundColor $Colors.Info
        $logsResult2 | Select-Object -Last 5 | ForEach-Object { Write-Host "   $_" -ForegroundColor $Colors.Info }
    }
}
catch {
    Write-TestResult -Test "dispatch-outbound Logs" -Success $false -Message $_.Exception.Message
}

# Test 6: Cron Job Configuration
Write-TestHeader "GROUP 6: CRON SCHEDULER TESTS"

Write-Host "`n⏰ Test 6.1: Check Cron Configuration"
$cronConfigPath = "supabase/functions/dispatch-outbound/cron.yaml"
$cronExists = Test-Path $cronConfigPath

Write-TestResult -Test "Cron Config File" -Success $cronExists -Message $(if (-not $cronExists) { "Create cron.yaml for scheduling" })

if ($cronExists) {
    Write-Host "`n📄 Cron Configuration:" -ForegroundColor $Colors.Info
    Get-Content $cronConfigPath | ForEach-Object { Write-Host "   $_" -ForegroundColor $Colors.Info }
}

# Test 7: Environment Secrets Check
Write-TestHeader "GROUP 7: ENVIRONMENT SECRETS"

Write-Host "`n🔐 Test 7.1: Required Secrets Check"
$requiredSecrets = @(
    "OPENROUTER_API_KEY",
    "TELEGRAM_BOT_TOKEN", 
    "INTERNAL_ADMIN_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
)

foreach ($secret in $requiredSecrets) {
    $hasSecret = [Environment]::GetEnvironmentVariable($secret) -ne $null
    Write-TestResult -Test "Secret: $secret" -Success $hasSecret -Message $(if (-not $hasSecret) { "Set in Supabase secrets" })
}

# Test 8: Database Connection Test
Write-TestHeader "GROUP 8: DATABASE CONNECTIVITY"

Write-Host "`n🗄️ Test 8.1: Database Connection"
try {
    $dbResult = & supabase db ping 2>&1
    $dbSuccess = $LASTEXITCODE -eq 0
    Write-TestResult -Test "Database Connection" -Success $dbSuccess -Message $(if (-not $dbSuccess) { $dbResult })
}
catch {
    Write-TestResult -Test "Database Connection" -Success $false -Message $_.Exception.Message
}

# Test 9: Function Dependencies Check
Write-TestHeader "GROUP 9: DEPENDENCIES CHECK"

$functionDirs = @("process-inbound", "dispatch-outbound")

foreach ($funcDir in $functionDirs) {
    $funcPath = "supabase/functions/$funcDir"
    
    Write-Host "`n📦 Test 9.1: $funcDir Dependencies"
    
    # Check if function directory exists
    $dirExists = Test-Path $funcPath
    Write-TestResult -Test "$funcDir Directory" -Success $dirExists
    
    if ($dirExists) {
        # Check for index.ts
        $indexExists = Test-Path "$funcPath/index.ts"
        Write-TestResult -Test "$funcDir index.ts" -Success $indexExists
        
        # Check for deno.json
        $denoExists = Test-Path "$funcPath/deno.json"
        Write-TestResult -Test "$funcDir deno.json" -Success $denoExists
        
        if ($Verbose -and $denoExists) {
            Write-Host "   Dependencies:" -ForegroundColor $Colors.Info
            $denoConfig = Get-Content "$funcPath/deno.json" | ConvertFrom-Json
            if ($denoConfig.imports) {
                $denoConfig.imports.PSObject.Properties | ForEach-Object {
                    Write-Host "   - $($_.Name): $($_.Value)" -ForegroundColor $Colors.Info
                }
            }
        }
    }
}

# Final Summary
Write-TestHeader "EDGE FUNCTIONS TEST SUMMARY"

Write-Host "`n🎉 Edge Functions testing complete!" -ForegroundColor $Colors.Success

Write-Host "`n📝 Next Steps:" -ForegroundColor $Colors.Info
Write-Host "1. Deploy functions: supabase functions deploy --no-verify-jwt" -ForegroundColor $Colors.Info
Write-Host "2. Set secrets: supabase secrets set KEY=value" -ForegroundColor $Colors.Info
Write-Host "3. Configure cron: Add cron.yaml to dispatch-outbound" -ForegroundColor $Colors.Info
Write-Host "4. Monitor logs: supabase functions logs <function-name> --follow" -ForegroundColor $Colors.Info

Write-Host "`n🔧 Useful Commands:" -ForegroundColor $Colors.Info
Write-Host "   supabase functions serve --no-verify-jwt  # Local development" -ForegroundColor $Colors.Info
Write-Host "   supabase functions logs --follow          # Live monitoring" -ForegroundColor $Colors.Info
Write-Host "   supabase secrets list                     # Check secrets" -ForegroundColor $Colors.Info
Write-Host "   supabase db reset                         # Reset database" -ForegroundColor $Colors.Info

Write-Host "`n💡 Troubleshooting:" -ForegroundColor $Colors.Warning
Write-Host "   - Ensure Supabase project is linked: supabase link" -ForegroundColor $Colors.Info
Write-Host "   - Check function logs for runtime errors" -ForegroundColor $Colors.Info
Write-Host "   - Verify all environment secrets are set" -ForegroundColor $Colors.Info
Write-Host "   - Test database connectivity and RLS policies" -ForegroundColor $Colors.Info
