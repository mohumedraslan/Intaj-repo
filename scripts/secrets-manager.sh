#!/bin/bash

# Secrets Manager Script for Intaj AI Platform
# This script helps manage environment secrets across different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SECRETS_DIR="$PROJECT_ROOT/secrets"
ENVIRONMENTS=("development" "staging" "production")

# Ensure secrets directory exists
mkdir -p "$SECRETS_DIR"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SECRETS MANAGER]${NC} $1"
}

# Function to generate a random secret
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Function to generate JWT secret
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
}

# Function to generate encryption key
generate_encryption_key() {
    openssl rand -hex 16
}

# Function to create environment secrets file
create_env_secrets() {
    local env=$1
    local secrets_file="$SECRETS_DIR/.env.$env.secrets"
    
    print_header "Creating secrets for $env environment"
    
    cat > "$secrets_file" << EOF
# Generated secrets for $env environment
# Generated on: $(date)
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# Authentication Secrets
NEXTAUTH_SECRET=$(generate_secret 64)
JWT_SECRET=$(generate_jwt_secret)
SESSION_SECRET=$(generate_secret 32)
ENCRYPTION_KEY=$(generate_encryption_key)

# Database Secrets
POSTGRES_PASSWORD=$(generate_secret 24)
REDIS_PASSWORD=$(generate_secret 24)

# API Keys (REPLACE WITH ACTUAL VALUES)
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-api-key
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key

# Supabase Secrets (REPLACE WITH ACTUAL VALUES)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ACCESS_TOKEN=your-supabase-access-token

# Stripe Secrets (REPLACE WITH ACTUAL VALUES)
STRIPE_SECRET_KEY=sk_$([ "$env" = "production" ] && echo "live" || echo "test")_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret

# Integration Secrets (REPLACE WITH ACTUAL VALUES)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=$(generate_secret 32)
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_VERIFY_TOKEN=$(generate_secret 32)

# Email Secrets (REPLACE WITH ACTUAL VALUES)
SMTP_PASSWORD=your-smtp-password

# Monitoring Secrets
PROMETHEUS_PASSWORD=$(generate_secret 16)
GRAFANA_PASSWORD=$(generate_secret 16)
ALERTMANAGER_PASSWORD=$(generate_secret 16)

# External Service Secrets (REPLACE WITH ACTUAL VALUES)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/slack/webhook
PAGERDUTY_ROUTING_KEY=your-pagerduty-routing-key
SENTRY_AUTH_TOKEN=your-sentry-auth-token
MIXPANEL_TOKEN=your-mixpanel-token

EOF

    print_status "Secrets file created: $secrets_file"
    print_warning "Please update the placeholder values with actual API keys and tokens"
}

# Function to validate secrets file
validate_secrets() {
    local env=$1
    local secrets_file="$SECRETS_DIR/.env.$env.secrets"
    
    if [[ ! -f "$secrets_file" ]]; then
        print_error "Secrets file not found: $secrets_file"
        return 1
    fi
    
    print_header "Validating secrets for $env environment"
    
    # Check for placeholder values
    local placeholders=(
        "your-openrouter-api-key"
        "your-openai-api-key"
        "your-supabase-service-role-key"
        "your-stripe-secret-key"
        "your-telegram-bot-token"
    )
    
    local has_placeholders=false
    for placeholder in "${placeholders[@]}"; do
        if grep -q "$placeholder" "$secrets_file"; then
            print_warning "Found placeholder value: $placeholder"
            has_placeholders=true
        fi
    done
    
    if [[ "$has_placeholders" = true ]]; then
        print_warning "Please replace placeholder values with actual secrets"
        return 1
    else
        print_status "All secrets appear to be configured"
        return 0
    fi
}

# Function to encrypt secrets file
encrypt_secrets() {
    local env=$1
    local secrets_file="$SECRETS_DIR/.env.$env.secrets"
    local encrypted_file="$SECRETS_DIR/.env.$env.secrets.enc"
    
    if [[ ! -f "$secrets_file" ]]; then
        print_error "Secrets file not found: $secrets_file"
        return 1
    fi
    
    print_header "Encrypting secrets for $env environment"
    
    # Prompt for encryption password
    read -s -p "Enter encryption password: " password
    echo
    
    # Encrypt the file
    openssl enc -aes-256-cbc -salt -in "$secrets_file" -out "$encrypted_file" -pass pass:"$password"
    
    if [[ $? -eq 0 ]]; then
        print_status "Secrets encrypted: $encrypted_file"
        print_warning "Store the encryption password securely!"
    else
        print_error "Failed to encrypt secrets"
        return 1
    fi
}

# Function to decrypt secrets file
decrypt_secrets() {
    local env=$1
    local encrypted_file="$SECRETS_DIR/.env.$env.secrets.enc"
    local secrets_file="$SECRETS_DIR/.env.$env.secrets"
    
    if [[ ! -f "$encrypted_file" ]]; then
        print_error "Encrypted secrets file not found: $encrypted_file"
        return 1
    fi
    
    print_header "Decrypting secrets for $env environment"
    
    # Prompt for decryption password
    read -s -p "Enter decryption password: " password
    echo
    
    # Decrypt the file
    openssl enc -aes-256-cbc -d -in "$encrypted_file" -out "$secrets_file" -pass pass:"$password"
    
    if [[ $? -eq 0 ]]; then
        print_status "Secrets decrypted: $secrets_file"
    else
        print_error "Failed to decrypt secrets (wrong password?)"
        return 1
    fi
}

# Function to deploy secrets to Kubernetes
deploy_k8s_secrets() {
    local env=$1
    local secrets_file="$SECRETS_DIR/.env.$env.secrets"
    local namespace="intaj-$env"
    
    if [[ ! -f "$secrets_file" ]]; then
        print_error "Secrets file not found: $secrets_file"
        return 1
    fi
    
    print_header "Deploying secrets to Kubernetes ($env)"
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
    
    # Create secret from env file
    kubectl create secret generic intaj-secrets \
        --from-env-file="$secrets_file" \
        --namespace="$namespace" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    print_status "Secrets deployed to Kubernetes namespace: $namespace"
}

# Function to deploy secrets to Supabase
deploy_supabase_secrets() {
    local env=$1
    local secrets_file="$SECRETS_DIR/.env.$env.secrets"
    
    if [[ ! -f "$secrets_file" ]]; then
        print_error "Secrets file not found: $secrets_file"
        return 1
    fi
    
    print_header "Deploying secrets to Supabase ($env)"
    
    # Source the secrets file
    set -a
    source "$secrets_file"
    set +a
    
    # Deploy secrets to Supabase (requires Supabase CLI)
    if command -v supabase &> /dev/null; then
        # Set secrets for Edge Functions
        supabase secrets set --env-file "$secrets_file"
        print_status "Secrets deployed to Supabase Edge Functions"
    else
        print_warning "Supabase CLI not found. Please install it to deploy secrets."
    fi
}

# Function to backup secrets
backup_secrets() {
    local backup_dir="$SECRETS_DIR/backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    
    mkdir -p "$backup_dir"
    
    print_header "Backing up secrets"
    
    for env in "${ENVIRONMENTS[@]}"; do
        local secrets_file="$SECRETS_DIR/.env.$env.secrets"
        if [[ -f "$secrets_file" ]]; then
            cp "$secrets_file" "$backup_dir/.env.$env.secrets.$timestamp"
            print_status "Backed up $env secrets"
        fi
    done
    
    print_status "Secrets backed up to: $backup_dir"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <command> [environment]"
    echo ""
    echo "Commands:"
    echo "  generate <env>     Generate secrets for environment (development|staging|production)"
    echo "  validate <env>     Validate secrets for environment"
    echo "  encrypt <env>      Encrypt secrets file"
    echo "  decrypt <env>      Decrypt secrets file"
    echo "  deploy-k8s <env>   Deploy secrets to Kubernetes"
    echo "  deploy-supabase <env> Deploy secrets to Supabase"
    echo "  backup             Backup all secrets files"
    echo "  help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 generate production"
    echo "  $0 validate staging"
    echo "  $0 deploy-k8s production"
    echo "  $0 backup"
}

# Main script logic
main() {
    local command=$1
    local environment=$2
    
    case $command in
        "generate")
            if [[ -z "$environment" ]]; then
                print_error "Environment required for generate command"
                show_usage
                exit 1
            fi
            create_env_secrets "$environment"
            ;;
        "validate")
            if [[ -z "$environment" ]]; then
                print_error "Environment required for validate command"
                show_usage
                exit 1
            fi
            validate_secrets "$environment"
            ;;
        "encrypt")
            if [[ -z "$environment" ]]; then
                print_error "Environment required for encrypt command"
                show_usage
                exit 1
            fi
            encrypt_secrets "$environment"
            ;;
        "decrypt")
            if [[ -z "$environment" ]]; then
                print_error "Environment required for decrypt command"
                show_usage
                exit 1
            fi
            decrypt_secrets "$environment"
            ;;
        "deploy-k8s")
            if [[ -z "$environment" ]]; then
                print_error "Environment required for deploy-k8s command"
                show_usage
                exit 1
            fi
            deploy_k8s_secrets "$environment"
            ;;
        "deploy-supabase")
            if [[ -z "$environment" ]]; then
                print_error "Environment required for deploy-supabase command"
                show_usage
                exit 1
            fi
            deploy_supabase_secrets "$environment"
            ;;
        "backup")
            backup_secrets
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
