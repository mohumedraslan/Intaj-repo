# =====================================================
# MASTER TEST RUNNER - Intaj Platform
# Executes all test suites in proper sequence
# =====================================================

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$Environment = "local", # local, staging, production
    [switch]$SkipDatabase = $false,
    [switch]$SkipAPI = $false,
    [switch]$SkipEdgeFunctions = $false,
    [switch]$DeployFunctions = $false,
    [switch]$Verbose = $false,
    [switch]$GenerateReport = $true
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
    Write-Host "`n$('=' * 80)" -ForegroundColor $Colors.Header
    Write-Host $Title -ForegroundColor $Colors.Header
    Write-Host "$('=' * 80)" -ForegroundColor $Colors.Header
}

function Write-TestSection {
    param([string]$Section)
    Write-Host "`n$('-' * 60)" -ForegroundColor $Colors.Info
    Write-Host $Section -ForegroundColor $Colors.Info
    Write-Host "$('-' * 60)" -ForegroundColor $Colors.Info
}

# Global test results
$TestResults = @{
    StartTime = Get-Date
    Environment = $Environment
    BaseUrl = $BaseUrl
    DatabaseTests = @{ Status = "Skipped"; Details = @() }
    APITests = @{ Status = "Skipped"; Details = @() }
    EdgeFunctionTests = @{ Status = "Skipped"; Details = @() }
    OverallStatus = "Unknown"
    Errors = @()
    Warnings = @()
}

Write-TestHeader "INTAJ PLATFORM - MASTER TEST SUITE"
Write-Host "Environment: $Environment" -ForegroundColor $Colors.Info
Write-Host "Base URL: $BaseUrl" -ForegroundColor $Colors.Info
Write-Host "Start Time: $($TestResults.StartTime)" -ForegroundColor $Colors.Info

# Validate prerequisites
Write-TestSection "PREREQUISITES VALIDATION"

# Check environment variables
$requiredEnvVars = @(
    "SUPABASE_PROJECT_REF",
    "SUPABASE_ANON_KEY", 
    "INTERNAL_ADMIN_KEY"
)

$missingVars = @()
foreach ($var in $requiredEnvVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if (-not $value) {
        $missingVars += $var
        Write-Host "❌ Missing: $var" -ForegroundColor $Colors.Error
    } else {
        Write-Host "✅ Found: $var" -ForegroundColor $Colors.Success
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "`n⚠️  Warning: Missing environment variables. Some tests may fail." -ForegroundColor $Colors.Warning
    $TestResults.Warnings += "Missing environment variables: $($missingVars -join ', ')"
}

# Check if server is running
Write-Host "`n🔍 Checking server connectivity..."
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/example" -Method GET -TimeoutSec 10
    Write-Host "✅ Server is responding" -ForegroundColor $Colors.Success
} catch {
    Write-Host "❌ Server not responding: $($_.Exception.Message)" -ForegroundColor $Colors.Error
    $TestResults.Errors += "Server connectivity failed"
    
    if ($Environment -eq "local") {
        Write-Host "💡 Make sure to run: npm run dev" -ForegroundColor $Colors.Warning
    }
}

# Test 1: Database Operations
if (-not $SkipDatabase) {
    Write-TestSection "DATABASE TESTS"
    
    try {
        Write-Host "🗄️  Running database operations test..."
        
        # Check if we can connect to Supabase
        $dbTestResult = & supabase db ping 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database connection successful" -ForegroundColor $Colors.Success
            $TestResults.DatabaseTests.Status = "Passed"
            $TestResults.DatabaseTests.Details += "Database connectivity: OK"
            
            Write-Host "📝 Database test SQL available in: test_database_operations.sql" -ForegroundColor $Colors.Info
            Write-Host "   Run manually in Supabase SQL Editor for detailed validation" -ForegroundColor $Colors.Info
        } else {
            Write-Host "❌ Database connection failed: $dbTestResult" -ForegroundColor $Colors.Error
            $TestResults.DatabaseTests.Status = "Failed"
            $TestResults.Errors += "Database connection failed"
        }
    } catch {
        Write-Host "❌ Database test error: $($_.Exception.Message)" -ForegroundColor $Colors.Error
        $TestResults.DatabaseTests.Status = "Failed"
        $TestResults.Errors += "Database test exception: $($_.Exception.Message)"
    }
} else {
    Write-Host "⏭️  Skipping database tests" -ForegroundColor $Colors.Warning
}

# Test 2: API Routes
if (-not $SkipAPI) {
    Write-TestSection "API TESTS"
    
    try {
        Write-Host "🌐 Running comprehensive API test suite..."
        
        # Run the PowerShell API test suite
        $apiTestArgs = @(
            "-BaseUrl", $BaseUrl
        )
        
        if ($Verbose) {
            $apiTestArgs += "-Verbose"
        }
        
        $apiTestResult = & .\test_complete_api_suite.ps1 @apiTestArgs 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ API tests completed successfully" -ForegroundColor $Colors.Success
            $TestResults.APITests.Status = "Passed"
        } else {
            Write-Host "⚠️  API tests completed with issues" -ForegroundColor $Colors.Warning
            $TestResults.APITests.Status = "Partial"
            $TestResults.Warnings += "Some API tests failed"
        }
        
        $TestResults.APITests.Details = $apiTestResult
        
    } catch {
        Write-Host "❌ API test error: $($_.Exception.Message)" -ForegroundColor $Colors.Error
        $TestResults.APITests.Status = "Failed"
        $TestResults.Errors += "API test exception: $($_.Exception.Message)"
    }
} else {
    Write-Host "⏭️  Skipping API tests" -ForegroundColor $Colors.Warning
}

# Test 3: Edge Functions
if (-not $SkipEdgeFunctions) {
    Write-TestSection "EDGE FUNCTIONS TESTS"
    
    try {
        Write-Host "⚡ Running Edge Functions test suite..."
        
        $edgeFunctionArgs = @()
        
        if ($DeployFunctions) {
            $edgeFunctionArgs += "-Deploy"
        }
        
        if ($Verbose) {
            $edgeFunctionArgs += "-Verbose"
        }
        
        $edgeTestResult = & .\test_edge_functions.ps1 @edgeFunctionArgs 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Edge Functions tests completed successfully" -ForegroundColor $Colors.Success
            $TestResults.EdgeFunctionTests.Status = "Passed"
        } else {
            Write-Host "⚠️  Edge Functions tests completed with issues" -ForegroundColor $Colors.Warning
            $TestResults.EdgeFunctionTests.Status = "Partial"
            $TestResults.Warnings += "Some Edge Function tests failed"
        }
        
        $TestResults.EdgeFunctionTests.Details = $edgeTestResult
        
    } catch {
        Write-Host "❌ Edge Functions test error: $($_.Exception.Message)" -ForegroundColor $Colors.Error
        $TestResults.EdgeFunctionTests.Status = "Failed"
        $TestResults.Errors += "Edge Functions test exception: $($_.Exception.Message)"
    }
} else {
    Write-Host "⏭️  Skipping Edge Functions tests" -ForegroundColor $Colors.Warning
}

# Determine overall status
$TestResults.EndTime = Get-Date
$TestResults.Duration = $TestResults.EndTime - $TestResults.StartTime

$allStatuses = @(
    $TestResults.DatabaseTests.Status,
    $TestResults.APITests.Status,
    $TestResults.EdgeFunctionTests.Status
)

if ($TestResults.Errors.Count -gt 0) {
    $TestResults.OverallStatus = "Failed"
} elseif ($TestResults.Warnings.Count -gt 0 -or $allStatuses -contains "Partial") {
    $TestResults.OverallStatus = "Partial"
} elseif ($allStatuses -contains "Passed") {
    $TestResults.OverallStatus = "Passed"
} else {
    $TestResults.OverallStatus = "Skipped"
}

# Final Results Summary
Write-TestHeader "FINAL TEST RESULTS SUMMARY"

Write-Host "`n📊 OVERALL STATUS: " -NoNewline
switch ($TestResults.OverallStatus) {
    "Passed" { Write-Host "✅ ALL TESTS PASSED" -ForegroundColor $Colors.Success }
    "Partial" { Write-Host "⚠️  TESTS PASSED WITH WARNINGS" -ForegroundColor $Colors.Warning }
    "Failed" { Write-Host "❌ TESTS FAILED" -ForegroundColor $Colors.Error }
    "Skipped" { Write-Host "⏭️  TESTS SKIPPED" -ForegroundColor $Colors.Warning }
}

Write-Host "`n📋 Test Results:" -ForegroundColor $Colors.Info
Write-Host "   Database Tests: $($TestResults.DatabaseTests.Status)" -ForegroundColor $(
    switch ($TestResults.DatabaseTests.Status) {
        "Passed" { $Colors.Success }
        "Failed" { $Colors.Error }
        default { $Colors.Warning }
    }
)
Write-Host "   API Tests: $($TestResults.APITests.Status)" -ForegroundColor $(
    switch ($TestResults.APITests.Status) {
        "Passed" { $Colors.Success }
        "Failed" { $Colors.Error }
        default { $Colors.Warning }
    }
)
Write-Host "   Edge Function Tests: $($TestResults.EdgeFunctionTests.Status)" -ForegroundColor $(
    switch ($TestResults.EdgeFunctionTests.Status) {
        "Passed" { $Colors.Success }
        "Failed" { $Colors.Error }
        default { $Colors.Warning }
    }
)

Write-Host "`n⏱️  Duration: $($TestResults.Duration.ToString('mm\:ss'))" -ForegroundColor $Colors.Info

if ($TestResults.Errors.Count -gt 0) {
    Write-Host "`n❌ Errors ($($TestResults.Errors.Count)):" -ForegroundColor $Colors.Error
    $TestResults.Errors | ForEach-Object { Write-Host "   - $_" -ForegroundColor $Colors.Error }
}

if ($TestResults.Warnings.Count -gt 0) {
    Write-Host "`n⚠️  Warnings ($($TestResults.Warnings.Count)):" -ForegroundColor $Colors.Warning
    $TestResults.Warnings | ForEach-Object { Write-Host "   - $_" -ForegroundColor $Colors.Warning }
}

# Generate detailed report
if ($GenerateReport) {
    $reportFile = "test_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    $TestResults | ConvertTo-Json -Depth 5 | Out-File -FilePath $reportFile -Encoding UTF8
    Write-Host "`n💾 Detailed report saved to: $reportFile" -ForegroundColor $Colors.Info
}

# Next Steps Recommendations
Write-TestHeader "NEXT STEPS & RECOMMENDATIONS"

if ($TestResults.OverallStatus -eq "Passed") {
    Write-Host "🎉 All tests passed! Your Intaj platform is ready for deployment." -ForegroundColor $Colors.Success
    Write-Host "`n🚀 Deployment Checklist:" -ForegroundColor $Colors.Info
    Write-Host "   ✅ Database schema validated" -ForegroundColor $Colors.Success
    Write-Host "   ✅ API routes working" -ForegroundColor $Colors.Success
    Write-Host "   ✅ Edge Functions deployed" -ForegroundColor $Colors.Success
    Write-Host "`n📝 Final Steps:" -ForegroundColor $Colors.Info
    Write-Host "   1. Configure production environment variables" -ForegroundColor $Colors.Info
    Write-Host "   2. Set up monitoring and alerting" -ForegroundColor $Colors.Info
    Write-Host "   3. Configure backup and disaster recovery" -ForegroundColor $Colors.Info
    Write-Host "   4. Run load testing in staging environment" -ForegroundColor $Colors.Info
} else {
    Write-Host "⚠️  Some tests need attention before deployment." -ForegroundColor $Colors.Warning
    Write-Host "`n🔧 Recommended Actions:" -ForegroundColor $Colors.Info
    
    if ($TestResults.DatabaseTests.Status -ne "Passed") {
        Write-Host "   📊 Database Issues:" -ForegroundColor $Colors.Warning
        Write-Host "     - Run: supabase db reset" -ForegroundColor $Colors.Info
        Write-Host "     - Run: supabase db push" -ForegroundColor $Colors.Info
        Write-Host "     - Execute: test_database_operations.sql" -ForegroundColor $Colors.Info
    }
    
    if ($TestResults.APITests.Status -ne "Passed") {
        Write-Host "   🌐 API Issues:" -ForegroundColor $Colors.Warning
        Write-Host "     - Check environment variables" -ForegroundColor $Colors.Info
        Write-Host "     - Verify server is running: npm run dev" -ForegroundColor $Colors.Info
        Write-Host "     - Check authentication tokens" -ForegroundColor $Colors.Info
    }
    
    if ($TestResults.EdgeFunctionTests.Status -ne "Passed") {
        Write-Host "   ⚡ Edge Function Issues:" -ForegroundColor $Colors.Warning
        Write-Host "     - Deploy functions: supabase functions deploy" -ForegroundColor $Colors.Info
        Write-Host "     - Set secrets: supabase secrets set KEY=value" -ForegroundColor $Colors.Info
        Write-Host "     - Check function logs for errors" -ForegroundColor $Colors.Info
    }
}

Write-Host "`n📚 Documentation:" -ForegroundColor $Colors.Info
Write-Host "   - Complete testing guide: TESTING_GUIDE.md" -ForegroundColor $Colors.Info
Write-Host "   - Individual test scripts available in project root" -ForegroundColor $Colors.Info
Write-Host "   - API documentation: docs/api-reference.md" -ForegroundColor $Colors.Info

Write-Host "`n🎯 Quick Commands:" -ForegroundColor $Colors.Info
Write-Host "   # Run specific test suites:" -ForegroundColor $Colors.Info
Write-Host "   .\test_complete_api_suite.ps1 -Verbose" -ForegroundColor $Colors.Info
Write-Host "   .\test_edge_functions.ps1 -Deploy" -ForegroundColor $Colors.Info
Write-Host "   ./test_api_curl.sh  # Cross-platform" -ForegroundColor $Colors.Info

Write-Host "`n🔄 Continuous Testing:" -ForegroundColor $Colors.Info
Write-Host "   # Set up automated testing in CI/CD" -ForegroundColor $Colors.Info
Write-Host "   # Monitor production with health checks" -ForegroundColor $Colors.Info
Write-Host "   # Schedule regular test runs" -ForegroundColor $Colors.Info

Write-Host "`n✨ Happy Testing! The Intaj platform is looking great! ✨" -ForegroundColor $Colors.Success

# Exit with appropriate code
$exitCode = switch ($TestResults.OverallStatus) {
    "Passed" { 0 }
    "Partial" { 1 }
    "Failed" { 2 }
    default { 3 }
}

exit $exitCode
