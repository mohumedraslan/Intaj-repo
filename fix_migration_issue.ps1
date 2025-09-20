# PowerShell script to fix the migration issue
# Run this in PowerShell as Administrator

Write-Host "🔧 Fixing Supabase Migration Issue" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "supabase")) {
    Write-Host "❌ Error: Not in the correct directory. Please run this from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "📋 Step 1: Checking current migration status..." -ForegroundColor Yellow

# Try to check Supabase status
try {
    $status = supabase status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Supabase is running" -ForegroundColor Green
        Write-Host $status
    } else {
        Write-Host "⚠️  Supabase is not running or has issues" -ForegroundColor Yellow
        Write-Host $status
    }
} catch {
    Write-Host "❌ Error checking Supabase status: $_" -ForegroundColor Red
}

Write-Host "`n📋 Step 2: Options to fix the migration issue:" -ForegroundColor Yellow
Write-Host "1. Reset migrations (DESTRUCTIVE - will lose data)" -ForegroundColor Red
Write-Host "2. Apply fix migration only" -ForegroundColor Green
Write-Host "3. Check database schema first" -ForegroundColor Blue

$choice = Read-Host "Enter your choice (1, 2, or 3)"

switch ($choice) {
    "1" {
        Write-Host "⚠️  WARNING: This will reset your database!" -ForegroundColor Red
        $confirm = Read-Host "Type 'RESET' to confirm"
        if ($confirm -eq "RESET") {
            Write-Host "🔄 Resetting Supabase..." -ForegroundColor Yellow
            supabase db reset
        } else {
            Write-Host "❌ Reset cancelled" -ForegroundColor Yellow
        }
    }
    "2" {
        Write-Host "🔧 Applying fix migration..." -ForegroundColor Green
        
        # Check if the fix migration exists
        if (Test-Path "supabase\migrations\20240701000001_fix_onboarding_step_migration.sql") {
            Write-Host "✅ Fix migration found, applying..." -ForegroundColor Green
            try {
                supabase db push
                Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
            } catch {
                Write-Host "❌ Error applying migration: $_" -ForegroundColor Red
                Write-Host "💡 Try running the SQL manually in Supabase dashboard" -ForegroundColor Blue
            }
        } else {
            Write-Host "❌ Fix migration file not found!" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host "🔍 Checking database schema..." -ForegroundColor Blue
        Write-Host "Please run the following SQL in your Supabase SQL Editor:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "-- Copy and paste the contents of check_profiles_schema.sql" -ForegroundColor Gray
        Write-Host ""
        if (Test-Path "check_profiles_schema.sql") {
            Write-Host "✅ Schema check file created: check_profiles_schema.sql" -ForegroundColor Green
        }
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
    }
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. If migrations are working, deploy Edge Functions:" -ForegroundColor White
Write-Host "   supabase functions deploy process-inbound --no-verify-jwt" -ForegroundColor Gray
Write-Host "   supabase functions deploy dispatch-outbound --no-verify-jwt" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Set up environment variables in Supabase Dashboard" -ForegroundColor White
Write-Host "3. Configure cron scheduler for dispatch-outbound" -ForegroundColor White
Write-Host "4. Test the complete flow" -ForegroundColor White

Write-Host "`n🎉 Migration fix script completed!" -ForegroundColor Green
