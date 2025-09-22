#!/bin/bash

# Rollback Script for Intaj AI Platform
# Provides automated rollback procedures for different scenarios

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
NAMESPACE="${KUBE_NAMESPACE:-intaj-production}"
HELM_RELEASE="${HELM_RELEASE_NAME:-intaj-app}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"

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
    echo -e "${BLUE}[ROLLBACK]${NC} $1"
}

# Function to confirm rollback action
confirm_rollback() {
    local rollback_type=$1
    
    print_warning "You are about to initiate a $rollback_type rollback!"
    print_warning "This action may cause temporary service disruption."
    
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        print_status "Rollback cancelled by user"
        exit 0
    fi
    
    print_status "Rollback confirmed. Proceeding..."
}

# Function to enable maintenance mode
enable_maintenance_mode() {
    print_header "Enabling maintenance mode"
    
    # Create maintenance mode configuration
    cat > /tmp/maintenance-mode.yaml << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: maintenance-mode
  namespace: $NAMESPACE
data:
  enabled: "true"
  message: "Intaj AI Platform is currently undergoing maintenance. We'll be back shortly!"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maintenance-page
  namespace: $NAMESPACE
spec:
  replicas: 2
  selector:
    matchLabels:
      app: maintenance-page
  template:
    metadata:
      labels:
        app: maintenance-page
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: maintenance-html
          mountPath: /usr/share/nginx/html
      volumes:
      - name: maintenance-html
        configMap:
          name: maintenance-html
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: maintenance-html
  namespace: $NAMESPACE
data:
  index.html: |
    <!DOCTYPE html>
    <html>
    <head>
        <title>Maintenance - Intaj AI</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            .logo { font-size: 2em; color: #3b82f6; margin-bottom: 20px; }
            .message { font-size: 1.2em; color: #666; margin-bottom: 30px; }
            .status { color: #f59e0b; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🤖 Intaj AI</div>
            <h1>We'll be right back!</h1>
            <div class="message">
                Intaj AI Platform is currently undergoing maintenance.<br>
                We'll be back shortly with improved performance and features.
            </div>
            <div class="status">
                Status: <a href="https://status.intaj.ai">status.intaj.ai</a><br>
                Support: <a href="mailto:support@intaj.ai">support@intaj.ai</a>
            </div>
        </div>
    </body>
    </html>
---
apiVersion: v1
kind: Service
metadata:
  name: maintenance-page
  namespace: $NAMESPACE
spec:
  selector:
    app: maintenance-page
  ports:
  - port: 80
    targetPort: 80
EOF

    # Apply maintenance mode
    kubectl apply -f /tmp/maintenance-mode.yaml
    
    # Update ingress to point to maintenance page
    kubectl patch ingress intaj-ingress -n $NAMESPACE --type='json' \
        -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "maintenance-page"}]'
    
    print_status "Maintenance mode enabled"
    sleep 5  # Allow time for changes to propagate
}

# Function to disable maintenance mode
disable_maintenance_mode() {
    print_header "Disabling maintenance mode"
    
    # Restore original ingress
    kubectl patch ingress intaj-ingress -n $NAMESPACE --type='json' \
        -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "intaj-app"}]'
    
    # Remove maintenance mode resources
    kubectl delete -f /tmp/maintenance-mode.yaml --ignore-not-found=true
    rm -f /tmp/maintenance-mode.yaml
    
    print_status "Maintenance mode disabled"
}

# Function to get current deployment info
get_current_deployment_info() {
    print_header "Getting current deployment information"
    
    # Get current image tag
    local current_image=$(kubectl get deployment intaj-app -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}')
    local current_tag=$(echo $current_image | cut -d':' -f2)
    
    # Get Helm revision
    local helm_revision=$(helm history $HELM_RELEASE -n $NAMESPACE --max 1 -o json | jq -r '.[0].revision')
    
    print_status "Current image: $current_image"
    print_status "Current tag: $current_tag"
    print_status "Helm revision: $helm_revision"
    
    # Store info for rollback
    echo "$current_tag" > /tmp/current_tag
    echo "$helm_revision" > /tmp/current_revision
}

# Function to rollback application deployment
rollback_application() {
    local target_revision=$1
    
    print_header "Rolling back application deployment"
    
    if [[ -n "$target_revision" ]]; then
        print_status "Rolling back to Helm revision: $target_revision"
        helm rollback $HELM_RELEASE $target_revision -n $NAMESPACE
    else
        print_status "Rolling back to previous Helm revision"
        helm rollback $HELM_RELEASE -n $NAMESPACE
    fi
    
    # Wait for rollback to complete
    print_status "Waiting for rollback to complete..."
    kubectl rollout status deployment/intaj-app -n $NAMESPACE --timeout=300s
    
    if [[ $? -eq 0 ]]; then
        print_status "Application rollback completed successfully"
    else
        print_error "Application rollback failed"
        return 1
    fi
}

# Function to rollback database
rollback_database() {
    local backup_file=$1
    
    print_header "Rolling back database"
    
    if [[ -z "$backup_file" ]]; then
        # Find latest backup
        backup_file=$(find $BACKUP_DIR -name "postgres_*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
        
        if [[ -z "$backup_file" ]]; then
            print_error "No database backup found"
            return 1
        fi
        
        print_status "Using latest backup: $backup_file"
    fi
    
    # Scale down application to prevent database connections
    print_status "Scaling down application"
    kubectl scale deployment intaj-app -n $NAMESPACE --replicas=0
    
    # Wait for pods to terminate
    kubectl wait --for=delete pod -l app=intaj-app -n $NAMESPACE --timeout=60s
    
    # Restore database
    print_status "Restoring database from backup"
    $SCRIPT_DIR/backup-restore.sh restore-postgres "$backup_file"
    
    if [[ $? -eq 0 ]]; then
        print_status "Database rollback completed successfully"
        
        # Scale application back up
        print_status "Scaling application back up"
        kubectl scale deployment intaj-app -n $NAMESPACE --replicas=3
        
        # Wait for application to be ready
        kubectl rollout status deployment/intaj-app -n $NAMESPACE --timeout=300s
    else
        print_error "Database rollback failed"
        return 1
    fi
}

# Function to rollback Redis
rollback_redis() {
    local backup_file=$1
    
    print_header "Rolling back Redis"
    
    if [[ -z "$backup_file" ]]; then
        # Find latest Redis backup
        backup_file=$(find $BACKUP_DIR -name "redis_*.rdb" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
        
        if [[ -z "$backup_file" ]]; then
            print_error "No Redis backup found"
            return 1
        fi
        
        print_status "Using latest backup: $backup_file"
    fi
    
    # Restore Redis
    $SCRIPT_DIR/backup-restore.sh restore-redis "$backup_file"
    
    if [[ $? -eq 0 ]]; then
        print_status "Redis rollback completed successfully"
    else
        print_error "Redis rollback failed"
        return 1
    fi
}

# Function to verify rollback
verify_rollback() {
    print_header "Verifying rollback"
    
    local health_check_url="https://intaj.ai/api/v1/health"
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        print_status "Health check attempt $attempt/$max_attempts"
        
        if curl -f -s "$health_check_url" > /dev/null; then
            print_status "Health check passed"
            break
        else
            if [[ $attempt -eq $max_attempts ]]; then
                print_error "Health check failed after $max_attempts attempts"
                return 1
            fi
            
            sleep 10
            ((attempt++))
        fi
    done
    
    # Additional verification checks
    print_status "Running additional verification checks"
    
    # Check database connectivity
    kubectl exec deployment/intaj-app -n $NAMESPACE -- npm run db:check
    
    # Check Redis connectivity
    kubectl exec deployment/intaj-app -n $NAMESPACE -- npm run redis:check
    
    # Check external API connectivity
    kubectl exec deployment/intaj-app -n $NAMESPACE -- npm run api:check
    
    print_status "Rollback verification completed"
}

# Function to send rollback notification
send_notification() {
    local rollback_type=$1
    local status=$2
    
    local message="🔄 ROLLBACK $status: $rollback_type rollback has been $status"
    
    # Send Slack notification if webhook is configured
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    # Send email notification if configured
    if [[ -n "$NOTIFICATION_EMAIL" ]]; then
        echo "$message" | mail -s "Intaj AI Rollback Notification" "$NOTIFICATION_EMAIL"
    fi
    
    print_status "Notification sent: $message"
}

# Function to create rollback report
create_rollback_report() {
    local rollback_type=$1
    local start_time=$2
    local end_time=$3
    local status=$4
    
    local report_file="$BACKUP_DIR/rollback_report_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# Rollback Report - Intaj AI Platform

## Summary
- **Rollback Type**: $rollback_type
- **Status**: $status
- **Start Time**: $start_time
- **End Time**: $end_time
- **Duration**: $((end_time - start_time)) seconds
- **Initiated By**: $(whoami)
- **Reason**: [To be filled]

## Actions Taken
- Maintenance mode enabled
- Application rolled back
- Database restored (if applicable)
- Redis restored (if applicable)
- Health checks verified
- Maintenance mode disabled

## Verification Results
- Health check: [Pass/Fail]
- Database connectivity: [Pass/Fail]
- Redis connectivity: [Pass/Fail]
- External APIs: [Pass/Fail]

## Impact Assessment
- Service downtime: [Duration]
- Users affected: [Number]
- Data loss: [None/Description]
- Revenue impact: [Amount/None]

## Lessons Learned
[To be filled]

## Follow-up Actions
[To be filled]

---
Generated on: $(date)
EOF

    print_status "Rollback report created: $report_file"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <rollback-type> [options]"
    echo ""
    echo "Rollback Types:"
    echo "  quick              Quick application rollback (previous Helm revision)"
    echo "  app [revision]     Application rollback to specific revision"
    echo "  database [backup]  Database rollback to backup file"
    echo "  redis [backup]     Redis rollback to backup file"
    echo "  full [backup-dir]  Full system rollback (app + database + redis)"
    echo "  emergency          Emergency rollback with maintenance mode"
    echo ""
    echo "Options:"
    echo "  --no-maintenance   Skip maintenance mode"
    echo "  --no-verify        Skip verification checks"
    echo "  --no-notify        Skip notifications"
    echo ""
    echo "Examples:"
    echo "  $0 quick                                    # Quick rollback to previous version"
    echo "  $0 app 5                                    # Rollback to Helm revision 5"
    echo "  $0 database /backups/postgres_backup.sql.gz # Rollback database"
    echo "  $0 full /backups/20231201_120000/           # Full system rollback"
    echo "  $0 emergency                                # Emergency rollback"
}

# Main rollback function
main() {
    local rollback_type=$1
    local option=$2
    local start_time=$(date +%s)
    local maintenance_mode=true
    local verify_rollback=true
    local send_notifications=true
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-maintenance)
                maintenance_mode=false
                shift
                ;;
            --no-verify)
                verify_rollback=false
                shift
                ;;
            --no-notify)
                send_notifications=false
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    case $rollback_type in
        "quick")
            confirm_rollback "quick application"
            
            if [[ "$maintenance_mode" == "true" ]]; then
                enable_maintenance_mode
            fi
            
            get_current_deployment_info
            rollback_application
            
            if [[ "$verify_rollback" == "true" ]]; then
                verify_rollback
            fi
            
            if [[ "$maintenance_mode" == "true" ]]; then
                disable_maintenance_mode
            fi
            
            if [[ "$send_notifications" == "true" ]]; then
                send_notification "Quick Application" "COMPLETED"
            fi
            ;;
            
        "app")
            local target_revision=$option
            confirm_rollback "application"
            
            if [[ "$maintenance_mode" == "true" ]]; then
                enable_maintenance_mode
            fi
            
            get_current_deployment_info
            rollback_application "$target_revision"
            
            if [[ "$verify_rollback" == "true" ]]; then
                verify_rollback
            fi
            
            if [[ "$maintenance_mode" == "true" ]]; then
                disable_maintenance_mode
            fi
            
            if [[ "$send_notifications" == "true" ]]; then
                send_notification "Application" "COMPLETED"
            fi
            ;;
            
        "database")
            local backup_file=$option
            confirm_rollback "database"
            
            if [[ "$maintenance_mode" == "true" ]]; then
                enable_maintenance_mode
            fi
            
            rollback_database "$backup_file"
            
            if [[ "$verify_rollback" == "true" ]]; then
                verify_rollback
            fi
            
            if [[ "$maintenance_mode" == "true" ]]; then
                disable_maintenance_mode
            fi
            
            if [[ "$send_notifications" == "true" ]]; then
                send_notification "Database" "COMPLETED"
            fi
            ;;
            
        "redis")
            local backup_file=$option
            confirm_rollback "Redis"
            
            rollback_redis "$backup_file"
            
            if [[ "$send_notifications" == "true" ]]; then
                send_notification "Redis" "COMPLETED"
            fi
            ;;
            
        "full")
            local backup_dir=$option
            confirm_rollback "full system"
            
            enable_maintenance_mode
            
            get_current_deployment_info
            rollback_application
            rollback_database "$backup_dir/postgres_*.sql.gz"
            rollback_redis "$backup_dir/redis_*.rdb"
            
            if [[ "$verify_rollback" == "true" ]]; then
                verify_rollback
            fi
            
            disable_maintenance_mode
            
            if [[ "$send_notifications" == "true" ]]; then
                send_notification "Full System" "COMPLETED"
            fi
            ;;
            
        "emergency")
            print_warning "EMERGENCY ROLLBACK INITIATED"
            
            enable_maintenance_mode
            get_current_deployment_info
            rollback_application
            
            # Skip verification for emergency rollback
            disable_maintenance_mode
            
            if [[ "$send_notifications" == "true" ]]; then
                send_notification "Emergency" "COMPLETED"
            fi
            ;;
            
        "help"|"--help"|"-h")
            show_usage
            ;;
            
        *)
            print_error "Unknown rollback type: $rollback_type"
            show_usage
            exit 1
            ;;
    esac
    
    local end_time=$(date +%s)
    create_rollback_report "$rollback_type" "$start_time" "$end_time" "COMPLETED"
    
    print_status "Rollback completed successfully in $((end_time - start_time)) seconds"
}

# Trap to handle script interruption
trap 'print_error "Rollback interrupted! Manual intervention may be required."; exit 1' INT TERM

# Run main function with all arguments
main "$@"
