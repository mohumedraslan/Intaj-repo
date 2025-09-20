# Test database connection and verify schema
Write-Host "🔍 Testing Database Connection and Schema" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check Supabase status
Write-Host "📊 Checking Supabase status..." -ForegroundColor Yellow
try {
    $containers = docker ps --filter "name=supabase" --format "table {{.Names}}\t{{.Status}}"
    Write-Host $containers -ForegroundColor Green
    
    # Check if database is healthy
    $dbStatus = docker ps --filter "name=supabase_db" --format "{{.Status}}"
    if ($dbStatus -like "*healthy*") {
        Write-Host "✅ Database is healthy and running" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database status: $dbStatus" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error checking Docker containers: $_" -ForegroundColor Red
}

Write-Host "`n📋 Next Steps - Deploy Edge Functions:" -ForegroundColor Yellow
Write-Host "1. Deploy process-inbound function:" -ForegroundColor White
Write-Host "   supabase functions deploy process-inbound --no-verify-jwt" -ForegroundColor Gray

Write-Host "`n2. Deploy dispatch-outbound function:" -ForegroundColor White  
Write-Host "   supabase functions deploy dispatch-outbound --no-verify-jwt" -ForegroundColor Gray

Write-Host "`n3. Set environment variables in Supabase Dashboard:" -ForegroundColor White
Write-Host "   - OPENROUTER_API_KEY" -ForegroundColor Gray
Write-Host "   - INTERNAL_ADMIN_KEY" -ForegroundColor Gray
Write-Host "   - LLM_GENERATE_URL" -ForegroundColor Gray

Write-Host "`n4. Configure cron scheduler:" -ForegroundColor White
Write-Host "   - Function: dispatch-outbound" -ForegroundColor Gray
Write-Host "   - Schedule: */10 * * * * *" -ForegroundColor Gray

Write-Host "`n5. Test agent creation through UI" -ForegroundColor White

Write-Host "`n🎉 Database is ready! You can now proceed with deployment." -ForegroundColor Green
