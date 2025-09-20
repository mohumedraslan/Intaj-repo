# PowerShell script to reset and fix Supabase migrations
# This will clean up the migration issues and start fresh

Write-Host "🔄 Resetting and Fixing Supabase Migrations" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "supabase")) {
    Write-Host "❌ Error: Not in the correct directory. Please run this from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "⚠️  WARNING: This will reset your local Supabase database!" -ForegroundColor Yellow
Write-Host "All local data will be lost. Remote data is safe." -ForegroundColor Yellow
$confirm = Read-Host "Type 'RESET' to continue or press Enter to cancel"

if ($confirm -ne "RESET") {
    Write-Host "❌ Operation cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n🛑 Step 1: Stopping Supabase containers..." -ForegroundColor Yellow
try {
    supabase stop
    Write-Host "✅ Containers stopped" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No containers to stop or error stopping: $_" -ForegroundColor Yellow
}

Write-Host "`n🗑️  Step 2: Cleaning up Docker containers and volumes..." -ForegroundColor Yellow
try {
    # Remove Supabase containers and volumes
    docker container prune -f
    docker volume prune -f
    Write-Host "✅ Docker cleanup completed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Docker cleanup failed: $_" -ForegroundColor Yellow
}

Write-Host "`n📋 Step 3: Checking migration files..." -ForegroundColor Yellow

# Check if profiles table migration exists
if (-not (Test-Path "supabase\migrations\20230812000000_create_profiles_table.sql")) {
    Write-Host "❌ Profiles table migration missing!" -ForegroundColor Red
    Write-Host "💡 The profiles table migration should have been created automatically." -ForegroundColor Blue
    exit 1
} else {
    Write-Host "✅ Profiles table migration found" -ForegroundColor Green
}

# List all migration files in order
Write-Host "`n📁 Migration files found:" -ForegroundColor Blue
Get-ChildItem "supabase\migrations\*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "  📄 $($_.Name)" -ForegroundColor Gray
}

Write-Host "`n🚀 Step 4: Starting Supabase with fixed migrations..." -ForegroundColor Yellow
try {
    supabase start
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Supabase started successfully!" -ForegroundColor Green
        
        Write-Host "`n📊 Step 5: Checking database status..." -ForegroundColor Yellow
        $status = supabase status
        Write-Host $status
        
        Write-Host "`n🎉 Success! Your Supabase instance is now running with fixed migrations." -ForegroundColor Green
        Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
        Write-Host "1. Deploy Edge Functions:" -ForegroundColor White
        Write-Host "   supabase functions deploy process-inbound --no-verify-jwt" -ForegroundColor Gray
        Write-Host "   supabase functions deploy dispatch-outbound --no-verify-jwt" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Set environment variables in Supabase Dashboard" -ForegroundColor White
        Write-Host "3. Configure cron scheduler for dispatch-outbound" -ForegroundColor White
        Write-Host "4. Test agent creation through the UI" -ForegroundColor White
        
    } else {
        Write-Host "❌ Supabase failed to start. Check the error messages above." -ForegroundColor Red
        Write-Host "`n🔍 Troubleshooting tips:" -ForegroundColor Yellow
        Write-Host "1. Check if Docker is running" -ForegroundColor White
        Write-Host "2. Run: supabase start --debug" -ForegroundColor White
        Write-Host "3. Check migration files for syntax errors" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Error starting Supabase: $_" -ForegroundColor Red
}

Write-Host "`n🏁 Reset and fix script completed!" -ForegroundColor Green
