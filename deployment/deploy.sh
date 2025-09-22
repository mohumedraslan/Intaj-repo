#!/bin/bash

# Intaj Production Deployment Script
# This script handles the complete deployment process for the Intaj AI platform

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_ENV="${1:-production}"
VERSION="${2:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "kubectl" "helm" "supabase")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "$cmd is required but not installed"
            exit 1
        fi
    done
    
    # Check environment variables
    local required_vars=("SUPABASE_PROJECT_ID" "SUPABASE_ACCESS_TOKEN" "DOCKER_REGISTRY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Environment variable $var is required"
            exit 1
        fi
    done
    
    log_success "Prerequisites check passed"
}

# Load environment configuration
load_environment() {
    log_info "Loading environment configuration for $DEPLOYMENT_ENV..."
    
    local env_file="$PROJECT_ROOT/.env.$DEPLOYMENT_ENV"
    if [[ -f "$env_file" ]]; then
        source "$env_file"
        log_success "Environment configuration loaded"
    else
        log_error "Environment file $env_file not found"
        exit 1
    fi
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building and pushing Docker image..."
    
    local image_tag="$DOCKER_REGISTRY/intaj:$VERSION"
    
    # Build the image
    docker build \
        -f "$PROJECT_ROOT/Dockerfile.production" \
        -t "$image_tag" \
        --build-arg NODE_ENV=production \
        --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
        --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
        --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
        "$PROJECT_ROOT"
    
    # Push the image
    docker push "$image_tag"
    
    log_success "Docker image built and pushed: $image_tag"
}

# Deploy Supabase Edge Functions
deploy_edge_functions() {
    log_info "Deploying Supabase Edge Functions..."
    
    cd "$PROJECT_ROOT"
    
    # Deploy process-inbound function
    supabase functions deploy process-inbound \
        --project-ref "$SUPABASE_PROJECT_ID" \
        --create-jwt-secret
    
    # Deploy dispatch-outbound function
    supabase functions deploy dispatch-outbound \
        --project-ref "$SUPABASE_PROJECT_ID"
    
    # Set up cron job for dispatch-outbound
    supabase functions schedule dispatch-outbound \
        --cron "*/10 * * * * *" \
        --project-ref "$SUPABASE_PROJECT_ID"
    
    log_success "Edge Functions deployed successfully"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Push database changes
    supabase db push --project-ref "$SUPABASE_PROJECT_ID"
    
    log_success "Database migrations completed"
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    local namespace="intaj-$DEPLOYMENT_ENV"
    local image_tag="$DOCKER_REGISTRY/intaj:$VERSION"
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy using Helm
    helm upgrade --install intaj-app \
        "$PROJECT_ROOT/deployment/helm/intaj" \
        --namespace "$namespace" \
        --set image.repository="$DOCKER_REGISTRY/intaj" \
        --set image.tag="$VERSION" \
        --set environment="$DEPLOYMENT_ENV" \
        --set ingress.hosts[0].host="$APP_DOMAIN" \
        --values "$PROJECT_ROOT/deployment/helm/values-$DEPLOYMENT_ENV.yaml" \
        --wait \
        --timeout=10m
    
    log_success "Kubernetes deployment completed"
}

# Start monitoring stack
start_monitoring() {
    log_info "Starting monitoring stack..."
    
    cd "$PROJECT_ROOT/monitoring"
    
    # Start monitoring services
    docker-compose -f docker-compose.monitoring.yml up -d
    
    # Wait for services to be ready
    sleep 30
    
    # Import Grafana dashboards
    if [[ -d "grafana/dashboards" ]]; then
        log_info "Importing Grafana dashboards..."
        # Dashboard import logic would go here
    fi
    
    log_success "Monitoring stack started"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local app_url="https://$APP_DOMAIN"
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$app_url/api/v1/health" > /dev/null; then
            log_success "Health check passed"
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    local app_url="https://$APP_DOMAIN"
    
    # Test API endpoints
    local endpoints=(
        "/api/v1/health"
        "/api/v1/agents"
        "/api/v1/integrations"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s -H "Authorization: Bearer $SMOKE_TEST_TOKEN" "$app_url$endpoint" > /dev/null; then
            log_success "Smoke test passed: $endpoint"
        else
            log_error "Smoke test failed: $endpoint"
            return 1
        fi
    done
    
    log_success "All smoke tests passed"
}

# Rollback function
rollback() {
    log_warning "Rolling back deployment..."
    
    local namespace="intaj-$DEPLOYMENT_ENV"
    
    # Rollback Kubernetes deployment
    helm rollback intaj-app --namespace "$namespace"
    
    log_success "Rollback completed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    # Add cleanup logic here
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting Intaj deployment for environment: $DEPLOYMENT_ENV, version: $VERSION"
    
    # Set up error handling
    trap 'log_error "Deployment failed"; rollback; cleanup; exit 1' ERR
    trap 'cleanup' EXIT
    
    # Deployment steps
    check_prerequisites
    load_environment
    
    if [[ "$DEPLOYMENT_ENV" != "local" ]]; then
        build_and_push_image
    fi
    
    run_migrations
    deploy_edge_functions
    
    if [[ "$DEPLOYMENT_ENV" != "local" ]]; then
        deploy_to_kubernetes
        start_monitoring
        health_check
        run_smoke_tests
    fi
    
    log_success "Deployment completed successfully!"
    
    # Display deployment information
    echo ""
    echo "🚀 Deployment Summary:"
    echo "   Environment: $DEPLOYMENT_ENV"
    echo "   Version: $VERSION"
    echo "   App URL: https://$APP_DOMAIN"
    echo "   Monitoring: https://$APP_DOMAIN/monitoring"
    echo ""
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
