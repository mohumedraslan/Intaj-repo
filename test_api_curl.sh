#!/bin/bash
# =====================================================
# CURL-BASED API TEST SUITE
# Intaj Platform - Cross-Platform Testing
# =====================================================

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_KEY="${INTERNAL_ADMIN_KEY:-your-admin-key-here}"
JWT_TOKEN="${SUPABASE_JWT_TOKEN:-your-jwt-token-here}"
BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-your-bot-token-here}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
print_header() {
    echo -e "\n${PURPLE}${'=' * 60}${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}${'=' * 60}${NC}"
}

print_test() {
    local test_name="$1"
    local success="$2"
    local message="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✅ PASS${NC} - $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC} - $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    if [ -n "$message" ]; then
        echo -e "   ${CYAN}$message${NC}"
    fi
}

# Test HTTP response
test_http() {
    local url="$1"
    local method="${2:-GET}"
    local headers="$3"
    local data="$4"
    local expected_status="${5:-200}"
    
    local curl_cmd="curl -s -w '%{http_code}' -X $method"
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    local response=$(eval $curl_cmd)
    local status_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "true|$body"
    else
        echo "false|Status: $status_code, Expected: $expected_status"
    fi
}

# Start testing
print_header "INTAJ PLATFORM CURL API TEST SUITE"
echo -e "${CYAN}Base URL: $BASE_URL${NC}"
echo -e "${CYAN}Admin Key: ${ADMIN_KEY:0:10}...${NC}"
echo -e "${CYAN}JWT Token: ${JWT_TOKEN:0:20}...${NC}"

# Test 1: Basic Connectivity
print_header "GROUP 1: BASIC CONNECTIVITY TESTS"

echo -e "\n🔍 Test 1.1: Server Health Check"
result=$(test_http "$BASE_URL/api/example")
IFS='|' read -r success message <<< "$result"
print_test "Server Connectivity" "$success" "$message"

# Test 2: Authentication
print_header "GROUP 2: AUTHENTICATION TESTS"

if [ "$JWT_TOKEN" != "your-jwt-token-here" ]; then
    echo -e "\n🔐 Test 2.1: JWT Token Validation"
    headers="-H 'Authorization: Bearer $JWT_TOKEN' -H 'Content-Type: application/json'"
    result=$(test_http "$BASE_URL/api/agents" "GET" "$headers")
    IFS='|' read -r success message <<< "$result"
    print_test "JWT Authentication" "$success" "$message"
else
    print_test "JWT Authentication" "false" "No JWT token provided"
fi

# Test 3: Agent Creation
print_header "GROUP 3: AGENT MANAGEMENT TESTS"

AGENT_ID=""
CONNECTION_ID=""

if [ "$JWT_TOKEN" != "your-jwt-token-here" ]; then
    echo -e "\n🤖 Test 3.1: Create Agent"
    headers="-H 'Authorization: Bearer $JWT_TOKEN' -H 'Content-Type: application/json'"
    data='{
        "name": "Test Curl Agent",
        "base_prompt": "You are a helpful test assistant created via curl testing",
        "model": "gpt-4o",
        "description": "Test agent created by curl test suite"
    }'
    
    result=$(test_http "$BASE_URL/api/agents" "POST" "$headers" "$data" "200")
    IFS='|' read -r success response <<< "$result"
    
    if [ "$success" = "true" ]; then
        AGENT_ID=$(echo "$response" | grep -o '"agentId":"[^"]*' | cut -d'"' -f4)
        print_test "Agent Creation" "true" "Agent ID: $AGENT_ID"
    else
        print_test "Agent Creation" "false" "$response"
    fi
    
    echo -e "\n📋 Test 3.2: List Agents"
    result=$(test_http "$BASE_URL/api/agents" "GET" "$headers")
    IFS='|' read -r success message <<< "$result"
    print_test "List Agents" "$success" "$message"
else
    print_test "Agent Creation" "false" "No JWT token provided"
    print_test "List Agents" "false" "No JWT token provided"
fi

# Test 4: Telegram Integration
print_header "GROUP 4: TELEGRAM INTEGRATION TESTS"

if [ "$BOT_TOKEN" != "your-bot-token-here" ] && [ -n "$AGENT_ID" ]; then
    echo -e "\n📱 Test 4.1: Create Agent with Telegram Integration"
    headers="-H 'Authorization: Bearer $JWT_TOKEN' -H 'Content-Type: application/json'"
    data="{
        \"name\": \"Test Telegram Curl Agent\",
        \"base_prompt\": \"You are a helpful Telegram bot assistant\",
        \"model\": \"gpt-4o\",
        \"integrations\": {
            \"telegramToken\": \"$BOT_TOKEN\",
            \"autoSetupWebhook\": true,
            \"baseUrl\": \"$BASE_URL\"
        }
    }"
    
    result=$(test_http "$BASE_URL/api/agents" "POST" "$headers" "$data" "200")
    IFS='|' read -r success response <<< "$result"
    
    if [ "$success" = "true" ]; then
        CONNECTION_ID=$(echo "$response" | grep -o '"connectionId":"[^"]*' | cut -d'"' -f4)
        print_test "Telegram Agent Creation" "true" "Connection ID: $CONNECTION_ID"
    else
        print_test "Telegram Agent Creation" "false" "$response"
    fi
    
    echo -e "\n🔗 Test 4.2: Manual Webhook Setup"
    headers="-H 'Content-Type: application/json'"
    data="{
        \"botToken\": \"$BOT_TOKEN\",
        \"baseUrl\": \"$BASE_URL\"
    }"
    
    result=$(test_http "$BASE_URL/api/integrations/telegram/setupWebhook" "POST" "$headers" "$data" "200")
    IFS='|' read -r success message <<< "$result"
    print_test "Webhook Setup" "$success" "$message"
else
    print_test "Telegram Agent Creation" "false" "No bot token or agent ID"
    print_test "Webhook Setup" "false" "No bot token"
fi

# Test 5: Internal API
print_header "GROUP 5: INTERNAL API TESTS"

if [ "$ADMIN_KEY" != "your-admin-key-here" ]; then
    if [ -n "$AGENT_ID" ]; then
        echo -e "\n🧠 Test 5.1: LLM Generation"
        headers="-H 'X-ADMIN-KEY: $ADMIN_KEY' -H 'Content-Type: application/json'"
        data="{
            \"agentId\": \"$AGENT_ID\",
            \"messages\": [
                {
                    \"role\": \"user\",
                    \"content\": \"Hello, this is a test message for API validation\"
                }
            ]
        }"
        
        result=$(test_http "$BASE_URL/api/internal/llm-generate" "POST" "$headers" "$data" "200")
        IFS='|' read -r success message <<< "$result"
        print_test "LLM Generation" "$success" "$message"
    else
        print_test "LLM Generation" "false" "No agent ID available"
    fi
    
    echo -e "\n📤 Test 5.2: Message Dispatch"
    headers="-H 'X-ADMIN-KEY: $ADMIN_KEY'"
    result=$(test_http "$BASE_URL/api/internal/dispatch" "POST" "$headers" "" "200")
    IFS='|' read -r success message <<< "$result"
    print_test "Message Dispatch" "$success" "$message"
else
    print_test "LLM Generation" "false" "No admin key provided"
    print_test "Message Dispatch" "false" "No admin key provided"
fi

# Test 6: Database Operations
print_header "GROUP 6: DATABASE OPERATIONS TESTS"

if [ "$JWT_TOKEN" != "your-jwt-token-here" ] && [ -n "$AGENT_ID" ]; then
    echo -e "\n❓ Test 6.1: FAQ Operations"
    headers="-H 'Authorization: Bearer $JWT_TOKEN' -H 'Content-Type: application/json'"
    data="{
        \"agent_id\": \"$AGENT_ID\",
        \"question\": \"What is this curl test about?\",
        \"answer\": \"This is an automated curl API test for the FAQ system\"
    }"
    
    result=$(test_http "$BASE_URL/api/faqs" "POST" "$headers" "$data" "200")
    IFS='|' read -r success message <<< "$result"
    print_test "FAQ Creation" "$success" "$message"
    
    echo -e "\n📄 Test 6.2: Data Source Operations"
    data="{
        \"agent_id\": \"$AGENT_ID\",
        \"type\": \"text\",
        \"name\": \"Test Curl Knowledge Base\",
        \"content\": \"This is test content for the knowledge base validation via curl\"
    }"
    
    result=$(test_http "$BASE_URL/api/data_sources" "POST" "$headers" "$data" "200")
    IFS='|' read -r success message <<< "$result"
    print_test "Data Source Creation" "$success" "$message"
else
    print_test "FAQ Creation" "false" "No JWT token or agent ID"
    print_test "Data Source Creation" "false" "No JWT token or agent ID"
fi

# Test 7: Error Handling
print_header "GROUP 7: ERROR HANDLING TESTS"

echo -e "\n🚫 Test 7.1: Invalid Endpoint"
result=$(test_http "$BASE_URL/api/nonexistent" "GET" "" "" "404")
IFS='|' read -r success message <<< "$result"
print_test "404 Error Handling" "$success" "Expected 404 response"

echo -e "\n🔒 Test 7.2: Unauthorized Access"
headers="-H 'Content-Type: application/json'"
data='{"agentId": "fake-id", "messages": []}'
result=$(test_http "$BASE_URL/api/internal/llm-generate" "POST" "$headers" "$data" "401")
IFS='|' read -r success message <<< "$result"
print_test "Unauthorized Access Handling" "$success" "Expected 401 response"

# Test 8: Webhook Simulation
print_header "GROUP 8: WEBHOOK SIMULATION TESTS"

echo -e "\n📨 Test 8.1: Telegram Webhook Simulation"
if [ -n "$AGENT_ID" ]; then
    headers="-H 'Content-Type: application/json'"
    data='{
        "update_id": 123456789,
        "message": {
            "message_id": 1,
            "from": {
                "id": 987654321,
                "is_bot": false,
                "first_name": "Test",
                "username": "testuser"
            },
            "chat": {
                "id": 987654321,
                "first_name": "Test",
                "username": "testuser",
                "type": "private"
            },
            "date": 1640995200,
            "text": "Hello, this is a test message from curl"
        }
    }'
    
    result=$(test_http "$BASE_URL/api/webhooks/telegram/$AGENT_ID" "POST" "$headers" "$data" "200")
    IFS='|' read -r success message <<< "$result"
    print_test "Telegram Webhook" "$success" "$message"
else
    print_test "Telegram Webhook" "false" "No agent ID available"
fi

# Final Results
print_header "TEST RESULTS SUMMARY"

PASS_RATE=0
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
fi

echo -e "\n📊 ${PURPLE}FINAL RESULTS:${NC}"
echo -e "   ${CYAN}Total Tests: $TOTAL_TESTS${NC}"
echo -e "   ${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "   ${RED}Failed: $FAILED_TESTS${NC}"
echo -e "   ${YELLOW}Pass Rate: $PASS_RATE%${NC}"

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "\n${YELLOW}⚠️  Some tests failed. Check the output above for details.${NC}"
    echo -e "${CYAN}💡 Common issues:${NC}"
    echo -e "   ${CYAN}- Missing environment variables (JWT_TOKEN, BOT_TOKEN, ADMIN_KEY)${NC}"
    echo -e "   ${CYAN}- Server not running on $BASE_URL${NC}"
    echo -e "   ${CYAN}- Database connection issues${NC}"
    echo -e "   ${CYAN}- Invalid authentication tokens${NC}"
fi

echo -e "\n${GREEN}🎉 Curl API testing complete!${NC}"
echo -e "\n${CYAN}📝 Next Steps:${NC}"
echo -e "${CYAN}1. Set environment variables: export SUPABASE_JWT_TOKEN=...${NC}"
echo -e "${CYAN}2. Deploy Edge Functions: supabase functions deploy${NC}"
echo -e "${CYAN}3. Configure cron scheduler for automated dispatch${NC}"
echo -e "${CYAN}4. Test end-to-end flow with real Telegram messages${NC}"

# Save results
RESULTS_FILE="curl_test_results_$(date +%Y%m%d_%H%M%S).json"
cat > "$RESULTS_FILE" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "baseUrl": "$BASE_URL",
    "results": {
        "total": $TOTAL_TESTS,
        "passed": $PASSED_TESTS,
        "failed": $FAILED_TESTS,
        "passRate": $PASS_RATE
    },
    "testAgentId": "$AGENT_ID",
    "testConnectionId": "$CONNECTION_ID"
}
EOF

echo -e "\n${CYAN}💾 Results saved to: $RESULTS_FILE${NC}"

# Exit with appropriate code
exit $FAILED_TESTS
