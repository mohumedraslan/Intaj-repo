#!/bin/bash

# Backup and Restore Script for Intaj AI Platform
# Handles database backups, file backups, and disaster recovery procedures

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
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Default configuration (can be overridden by environment variables)
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-intaj_user}"
POSTGRES_DB="${POSTGRES_DB:-intaj_production}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-intaj-backups-production}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

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
    echo -e "${BLUE}[BACKUP]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    local missing_tools=()
    
    # Check for required tools
    command -v pg_dump >/dev/null 2>&1 || missing_tools+=("pg_dump")
    command -v redis-cli >/dev/null 2>&1 || missing_tools+=("redis-cli")
    command -v aws >/dev/null 2>&1 || missing_tools+=("aws-cli")
    command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please install the missing tools before running backups"
        exit 1
    fi
    
    print_status "All prerequisites satisfied"
}

# Function to backup PostgreSQL database
backup_postgres() {
    local backup_file="$BACKUP_DIR/postgres_${POSTGRES_DB}_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    print_header "Backing up PostgreSQL database: $POSTGRES_DB"
    
    # Create database backup
    PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --no-owner \
        --no-privileges \
        --create \
        --clean \
        --if-exists \
        > "$backup_file"
    
    if [[ $? -eq 0 ]]; then
        # Compress the backup
        gzip "$backup_file"
        print_status "PostgreSQL backup completed: $compressed_file"
        
        # Calculate backup size
        local backup_size=$(du -h "$compressed_file" | cut -f1)
        print_status "Backup size: $backup_size"
        
        return 0
    else
        print_error "PostgreSQL backup failed"
        return 1
    fi
}

# Function to backup Redis data
backup_redis() {
    local backup_file="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
    
    print_header "Backing up Redis data"
    
    # Create Redis backup using BGSAVE
    if [[ -n "$REDIS_PASSWORD" ]]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE
    fi
    
    # Wait for background save to complete
    local save_in_progress=1
    while [[ $save_in_progress -eq 1 ]]; do
        sleep 2
        if [[ -n "$REDIS_PASSWORD" ]]; then
            local last_save=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)
        else
            local last_save=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE)
        fi
        
        # Check if save is complete (this is a simplified check)
        save_in_progress=0
    done
    
    # Copy the RDB file
    if [[ -n "$REDIS_PASSWORD" ]]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --rdb "$backup_file"
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$backup_file"
    fi
    
    if [[ -f "$backup_file" ]]; then
        print_status "Redis backup completed: $backup_file"
        
        # Calculate backup size
        local backup_size=$(du -h "$backup_file" | cut -f1)
        print_status "Backup size: $backup_size"
        
        return 0
    else
        print_error "Redis backup failed"
        return 1
    fi
}

# Function to backup application files
backup_app_files() {
    local backup_file="$BACKUP_DIR/app_files_${TIMESTAMP}.tar.gz"
    
    print_header "Backing up application files"
    
    # Define directories to backup
    local backup_dirs=(
        "uploads"
        "logs"
        "config"
        ".env.production"
        ".env.staging"
    )
    
    # Create tar archive of application files
    tar -czf "$backup_file" \
        -C "$PROJECT_ROOT" \
        --exclude="node_modules" \
        --exclude=".git" \
        --exclude="backups" \
        --exclude="*.log" \
        "${backup_dirs[@]}" 2>/dev/null || true
    
    if [[ -f "$backup_file" ]]; then
        print_status "Application files backup completed: $backup_file"
        
        # Calculate backup size
        local backup_size=$(du -h "$backup_file" | cut -f1)
        print_status "Backup size: $backup_size"
        
        return 0
    else
        print_error "Application files backup failed"
        return 1
    fi
}

# Function to backup Kubernetes resources
backup_k8s_resources() {
    local backup_file="$BACKUP_DIR/k8s_resources_${TIMESTAMP}.yaml"
    
    print_header "Backing up Kubernetes resources"
    
    # Get all resources in the intaj namespaces
    local namespaces=("intaj-production" "intaj-staging")
    
    for namespace in "${namespaces[@]}"; do
        if kubectl get namespace "$namespace" >/dev/null 2>&1; then
            print_status "Backing up namespace: $namespace"
            
            # Export all resources
            kubectl get all,configmaps,secrets,pvc,ingress \
                --namespace="$namespace" \
                -o yaml >> "$backup_file"
            
            echo "---" >> "$backup_file"
        fi
    done
    
    if [[ -f "$backup_file" ]]; then
        print_status "Kubernetes resources backup completed: $backup_file"
        return 0
    else
        print_error "Kubernetes resources backup failed"
        return 1
    fi
}

# Function to upload backups to S3
upload_to_s3() {
    local backup_files=("$@")
    
    print_header "Uploading backups to S3: $S3_BACKUP_BUCKET"
    
    for backup_file in "${backup_files[@]}"; do
        if [[ -f "$backup_file" ]]; then
            local s3_key="backups/$(date +%Y/%m/%d)/$(basename "$backup_file")"
            
            aws s3 cp "$backup_file" "s3://$S3_BACKUP_BUCKET/$s3_key" \
                --storage-class STANDARD_IA \
                --metadata "timestamp=$TIMESTAMP,environment=${NODE_ENV:-production}"
            
            if [[ $? -eq 0 ]]; then
                print_status "Uploaded to S3: s3://$S3_BACKUP_BUCKET/$s3_key"
            else
                print_error "Failed to upload: $backup_file"
            fi
        fi
    done
}

# Function to clean up old backups
cleanup_old_backups() {
    print_header "Cleaning up old backups (older than $BACKUP_RETENTION_DAYS days)"
    
    # Clean up local backups
    find "$BACKUP_DIR" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
    
    # Clean up S3 backups
    local cutoff_date=$(date -d "$BACKUP_RETENTION_DAYS days ago" +%Y-%m-%d)
    aws s3api list-objects-v2 \
        --bucket "$S3_BACKUP_BUCKET" \
        --prefix "backups/" \
        --query "Contents[?LastModified<='$cutoff_date'].Key" \
        --output text | \
    while read -r key; do
        if [[ -n "$key" ]]; then
            aws s3 rm "s3://$S3_BACKUP_BUCKET/$key"
            print_status "Deleted old backup: $key"
        fi
    done
}

# Function to restore PostgreSQL database
restore_postgres() {
    local backup_file=$1
    
    if [[ -z "$backup_file" ]]; then
        print_error "Backup file path required for restore"
        return 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        print_error "Backup file not found: $backup_file"
        return 1
    fi
    
    print_header "Restoring PostgreSQL database from: $backup_file"
    print_warning "This will overwrite the current database!"
    
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        print_status "Restore cancelled"
        return 0
    fi
    
    # Decompress if needed
    local restore_file="$backup_file"
    if [[ "$backup_file" == *.gz ]]; then
        restore_file="${backup_file%.gz}"
        gunzip -c "$backup_file" > "$restore_file"
    fi
    
    # Restore database
    PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d postgres \
        -f "$restore_file"
    
    if [[ $? -eq 0 ]]; then
        print_status "PostgreSQL restore completed successfully"
        
        # Clean up temporary file if we created one
        if [[ "$backup_file" == *.gz ]]; then
            rm -f "$restore_file"
        fi
        
        return 0
    else
        print_error "PostgreSQL restore failed"
        return 1
    fi
}

# Function to restore Redis data
restore_redis() {
    local backup_file=$1
    
    if [[ -z "$backup_file" ]]; then
        print_error "Backup file path required for restore"
        return 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        print_error "Backup file not found: $backup_file"
        return 1
    fi
    
    print_header "Restoring Redis data from: $backup_file"
    print_warning "This will overwrite the current Redis data!"
    
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        print_status "Restore cancelled"
        return 0
    fi
    
    # Stop Redis temporarily (if running locally)
    if systemctl is-active --quiet redis; then
        print_status "Stopping Redis service"
        sudo systemctl stop redis
    fi
    
    # Copy backup file to Redis data directory
    local redis_data_dir="/var/lib/redis"
    if [[ -d "$redis_data_dir" ]]; then
        sudo cp "$backup_file" "$redis_data_dir/dump.rdb"
        sudo chown redis:redis "$redis_data_dir/dump.rdb"
        print_status "Redis backup file copied"
    fi
    
    # Start Redis service
    if ! systemctl is-active --quiet redis; then
        print_status "Starting Redis service"
        sudo systemctl start redis
    fi
    
    print_status "Redis restore completed"
}

# Function to create disaster recovery plan
create_dr_plan() {
    local dr_plan_file="$BACKUP_DIR/disaster_recovery_plan_${TIMESTAMP}.md"
    
    print_header "Creating disaster recovery plan"
    
    cat > "$dr_plan_file" << 'EOF'
# Disaster Recovery Plan - Intaj AI Platform

## Overview
This document outlines the disaster recovery procedures for the Intaj AI Platform.

## Recovery Time Objectives (RTO)
- **Critical Systems**: 4 hours
- **Non-Critical Systems**: 24 hours

## Recovery Point Objectives (RPO)
- **Database**: 1 hour (automated backups every hour)
- **Application Files**: 24 hours (daily backups)

## Backup Schedule
- **Database**: Every 6 hours + daily full backup
- **Redis**: Daily backup
- **Application Files**: Daily backup
- **Kubernetes Resources**: Daily backup

## Recovery Procedures

### 1. Database Recovery
```bash
# Restore PostgreSQL from backup
./scripts/backup-restore.sh restore-postgres /path/to/backup.sql.gz

# Restore Redis from backup
./scripts/backup-restore.sh restore-redis /path/to/backup.rdb
```

### 2. Application Recovery
```bash
# Deploy from backup
kubectl apply -f /path/to/k8s_backup.yaml

# Restore application files
tar -xzf /path/to/app_files_backup.tar.gz -C /app
```

### 3. Infrastructure Recovery
```bash
# Recreate infrastructure using Terraform
cd infrastructure
terraform init
terraform plan
terraform apply

# Deploy application using Helm
helm upgrade --install intaj-app ./helm/intaj-app
```

## Emergency Contacts
- **DevOps Team**: devops@intaj.ai
- **Database Admin**: dba@intaj.ai
- **Security Team**: security@intaj.ai

## Monitoring and Alerting
- **Prometheus**: Monitor system health
- **Grafana**: Visualize metrics and alerts
- **PagerDuty**: Critical incident notifications
- **Slack**: Team communications

## Testing Schedule
- **Monthly**: Backup restoration test
- **Quarterly**: Full disaster recovery drill
- **Annually**: Complete infrastructure rebuild test

## Documentation Updates
This plan should be reviewed and updated:
- After any major infrastructure changes
- Following any disaster recovery incidents
- At least quarterly during team reviews
EOF

    print_status "Disaster recovery plan created: $dr_plan_file"
}

# Function to run health checks
run_health_checks() {
    print_header "Running post-backup health checks"
    
    # Check database connectivity
    if PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER"; then
        print_status "PostgreSQL: Healthy"
    else
        print_error "PostgreSQL: Unhealthy"
    fi
    
    # Check Redis connectivity
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} ping | grep -q PONG; then
        print_status "Redis: Healthy"
    else
        print_error "Redis: Unhealthy"
    fi
    
    # Check application health endpoint
    if curl -f -s "http://localhost:3000/api/v1/health" > /dev/null; then
        print_status "Application: Healthy"
    else
        print_warning "Application: Health check failed (may be normal if not running)"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  backup-all              Run complete backup (database, redis, files, k8s)"
    echo "  backup-postgres         Backup PostgreSQL database only"
    echo "  backup-redis            Backup Redis data only"
    echo "  backup-files            Backup application files only"
    echo "  backup-k8s              Backup Kubernetes resources only"
    echo "  restore-postgres <file> Restore PostgreSQL from backup file"
    echo "  restore-redis <file>    Restore Redis from backup file"
    echo "  cleanup                 Clean up old backups"
    echo "  create-dr-plan          Create disaster recovery plan"
    echo "  health-check            Run system health checks"
    echo "  help                    Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  POSTGRES_HOST           PostgreSQL host (default: localhost)"
    echo "  POSTGRES_PORT           PostgreSQL port (default: 5432)"
    echo "  POSTGRES_USER           PostgreSQL user"
    echo "  POSTGRES_PASSWORD       PostgreSQL password"
    echo "  POSTGRES_DB             PostgreSQL database name"
    echo "  REDIS_HOST              Redis host (default: localhost)"
    echo "  REDIS_PORT              Redis port (default: 6379)"
    echo "  REDIS_PASSWORD          Redis password (optional)"
    echo "  S3_BACKUP_BUCKET        S3 bucket for backups"
    echo "  BACKUP_RETENTION_DAYS   Days to retain backups (default: 30)"
    echo ""
    echo "Examples:"
    echo "  $0 backup-all"
    echo "  $0 restore-postgres /path/to/backup.sql.gz"
    echo "  $0 cleanup"
}

# Main script logic
main() {
    local command=$1
    shift
    
    case $command in
        "backup-all")
            check_prerequisites
            
            local backup_files=()
            
            # Run all backups
            if backup_postgres; then
                backup_files+=("$BACKUP_DIR/postgres_${POSTGRES_DB}_${TIMESTAMP}.sql.gz")
            fi
            
            if backup_redis; then
                backup_files+=("$BACKUP_DIR/redis_${TIMESTAMP}.rdb")
            fi
            
            if backup_app_files; then
                backup_files+=("$BACKUP_DIR/app_files_${TIMESTAMP}.tar.gz")
            fi
            
            if backup_k8s_resources; then
                backup_files+=("$BACKUP_DIR/k8s_resources_${TIMESTAMP}.yaml")
            fi
            
            # Upload to S3 if configured
            if [[ -n "$S3_BACKUP_BUCKET" ]]; then
                upload_to_s3 "${backup_files[@]}"
            fi
            
            # Run health checks
            run_health_checks
            
            print_status "Complete backup finished"
            ;;
        "backup-postgres")
            check_prerequisites
            backup_postgres
            ;;
        "backup-redis")
            check_prerequisites
            backup_redis
            ;;
        "backup-files")
            backup_app_files
            ;;
        "backup-k8s")
            backup_k8s_resources
            ;;
        "restore-postgres")
            restore_postgres "$1"
            ;;
        "restore-redis")
            restore_redis "$1"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "create-dr-plan")
            create_dr_plan
            ;;
        "health-check")
            run_health_checks
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
