#!/bin/bash

# ==========================================
# Environment Setup Script for GitHub Actions
# ==========================================
# This script helps set up environment files for deployment

set -e  # Exit on any error

echo "🚀 Setting up environment configuration for GitHub Actions deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required files exist
check_files() {
    print_message "Checking required files..."
    
    if [ ! -f ".env.deployment" ]; then
        print_error ".env.deployment file not found!"
        echo "Creating .env.deployment from template..."
        cp .env.example .env.deployment
        print_warning "Please edit .env.deployment with your actual configuration"
        return 1
    fi
    
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local file not found!"
        echo "Creating .env.local from template..."
        cp .env.example .env.local
        print_warning "Please edit .env.local for local development"
    fi
    
    print_success "Environment files are available"
    return 0
}

# Validate environment variables
validate_deployment_config() {
    print_message "Validating deployment configuration..."
    
    # Source the deployment environment
    if [ -f ".env.deployment" ]; then
        set -a
        source .env.deployment
        set +a
        
        # Check required variables
        required_vars=(
            "PROJECT_ID"
            "INSTANCE_NAME"
            "DEV_DB_HOST"
            "DEV_DB_USER"
            "DEV_DB_PASSWORD"
            "DEV_DB_NAME"
        )
        
        missing_vars=()
        for var in "${required_vars[@]}"; do
            if [ -z "${!var}" ]; then
                missing_vars+=("$var")
            fi
        done
        
        if [ ${#missing_vars[@]} -gt 0 ]; then
            print_error "Missing required environment variables:"
            for var in "${missing_vars[@]}"; do
                echo "  - $var"
            done
            return 1
        fi
        
        print_success "All required environment variables are set"
        return 0
    else
        print_error ".env.deployment file not found"
        return 1
    fi
}

# Test database connection string format
validate_database_config() {
    print_message "Validating database configuration..."
    
    if [ -f ".env.deployment" ]; then
        set -a
        source .env.deployment
        set +a
        
        # Check Cloud SQL connection string format
        if [[ "$DEV_DB_HOST" =~ ^/cloudsql/[^:]+:[^:]+:[^:]+$ ]]; then
            print_success "Development database connection string format is valid"
        else
            print_error "Invalid development database connection string format"
            echo "Expected format: /cloudsql/PROJECT_ID:REGION:INSTANCE_NAME"
            echo "Current value: $DEV_DB_HOST"
            return 1
        fi
        
        print_success "Database configuration is valid"
        return 0
    fi
}

# Generate app.yaml files for different environments
generate_app_configs() {
    print_message "Generating app.yaml configurations..."
    
    if [ -f ".env.deployment" ]; then
        set -a
        source .env.deployment
        set +a
        
        # Ensure config directory exists
        mkdir -p config
        print_info "Using config/ directory for YAML files"
        
        # Generate development app.yaml
        cat > config/app-dev.yaml << EOF
runtime: nodejs20
service: ${DEV_SERVICE:-dev}

env_variables:
  NODE_ENV: 'development'
  DB_HOST: '$DEV_DB_HOST'
  DB_USER: '$DEV_DB_USER'
  DB_PASSWORD: '$DEV_DB_PASSWORD'
  DB_NAME: '$DEV_DB_NAME'
  SESSION_SECRET: '$DEV_SESSION_SECRET'
  EMAIL_USER: '$EMAIL_USER'
  EMAIL_PASS: '$EMAIL_PASS'
  ADMIN_EMAIL: '$ADMIN_EMAIL'

beta_settings:
  cloud_sql_instances: $PROJECT_ID:${REGION:-us-central1}:$INSTANCE_NAME

automatic_scaling:
  min_instances: 1
  max_instances: 2
  target_cpu_utilization: 0.65

handlers:
- url: /.*
  script: auto
  secure: always
EOF

        print_success "Generated config/app-dev.yaml"
        
        # Generate staging app.yaml
        cat > config/app-staging.yaml << EOF
runtime: nodejs20
service: ${STAGING_SERVICE:-staging}

env_variables:
  NODE_ENV: 'staging'
  DB_HOST: '$STAGING_DB_HOST'
  DB_USER: '$STAGING_DB_USER'
  DB_PASSWORD: '$STAGING_DB_PASSWORD'
  DB_NAME: '$STAGING_DB_NAME'
  SESSION_SECRET: '$STAGING_SESSION_SECRET'
  EMAIL_USER: '$EMAIL_USER'
  EMAIL_PASS: '$EMAIL_PASS'
  ADMIN_EMAIL: '$ADMIN_EMAIL'

beta_settings:
  cloud_sql_instances: $PROJECT_ID:${REGION:-us-central1}:$INSTANCE_NAME

automatic_scaling:
  min_instances: 1
  max_instances: 3
  target_cpu_utilization: 0.65

handlers:
- url: /.*
  script: auto
  secure: always
EOF

        print_success "Generated config/app-staging.yaml"
        
        # Generate production app.yaml
        cat > config/app-production.yaml << EOF
runtime: nodejs20
service: ${PROD_SERVICE:-default}

env_variables:
  NODE_ENV: 'production'
  DB_HOST: '$PROD_DB_HOST'
  DB_USER: '$PROD_DB_USER'
  DB_PASSWORD: '$PROD_DB_PASSWORD'
  DB_NAME: '$PROD_DB_NAME'
  SESSION_SECRET: '$PROD_SESSION_SECRET'
  EMAIL_USER: '$EMAIL_USER'
  EMAIL_PASS: '$EMAIL_PASS'
  ADMIN_EMAIL: '$ADMIN_EMAIL'

beta_settings:
  cloud_sql_instances: $PROJECT_ID:${REGION:-us-central1}:$INSTANCE_NAME

automatic_scaling:
  min_instances: 1
  max_instances: 5
  target_cpu_utilization: 0.65

handlers:
- url: /.*
  script: auto
  secure: always
EOF

        print_success "Generated config/app-production.yaml"
        
        print_success "App configuration files generated successfully in config/ directory"
        return 0
    else
        print_error "Cannot generate app configs: .env.deployment not found"
        return 1
    fi
}

# Show configuration summary
show_config_summary() {
    print_message "Configuration Summary:"
    
    if [ -f ".env.deployment" ]; then
        set -a
        source .env.deployment
        set +a
        
        echo "  Project ID: $PROJECT_ID"
        echo "  Cloud SQL Instance: $INSTANCE_NAME"
        echo "  Region: ${REGION:-us-central1}"
        echo "  Development Service: ${DEV_SERVICE:-dev}"
        echo "  Staging Service: ${STAGING_SERVICE:-staging}"
        echo "  Production Service: ${PROD_SERVICE:-default}"
        echo ""
        echo "  Database Configuration:"
        echo "    Development: $DEV_DB_HOST"
        echo "    Database Name: $DEV_DB_NAME"
        echo "    Database User: $DEV_DB_USER"
    fi
}

# Main execution
main() {
    echo "🔧 GitHub Actions Environment Setup"
    echo "===================================="
    echo ""
    
    # Run all checks and setup
    if check_files && validate_deployment_config && validate_database_config; then
        generate_app_configs
        echo ""
        show_config_summary
        echo ""
        print_success "✅ Environment setup completed successfully!"
        echo ""
        print_message "Next steps:"
        echo "  1. Commit the .env.deployment file to your repository"
        echo "  2. Ensure GCP_SA_KEY secret is configured in GitHub"
        echo "  3. Push changes to trigger GitHub Actions deployment"
        echo ""
        print_warning "Note: Keep your .env.local file private for local development"
    else
        print_error "❌ Environment setup failed!"
        echo ""
        print_message "Please fix the issues above and run this script again."
        exit 1
    fi
}

# Run main function
main "$@"
