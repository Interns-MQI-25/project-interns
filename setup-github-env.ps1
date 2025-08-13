# ==========================================
# Environment Setup Script for GitHub Actions (PowerShell)
# ==========================================
# This script helps set up environment files for deployment on Windows

param(
    [switch]$Validate,
    [switch]$Generate,
    [switch]$Help
)

# Colors for output
$ErrorColor = "Red"
$SuccessColor = "Green"
$WarningColor = "Yellow"
$InfoColor = "Cyan"

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $InfoColor
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $SuccessColor
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $WarningColor
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $ErrorColor
}

function Show-Help {
    Write-Host @"
🚀 GitHub Actions Environment Setup Script

Usage:
    .\setup-github-env.ps1 [OPTIONS]

Options:
    -Validate    Only validate existing configuration
    -Generate    Only generate app.yaml files
    -Help        Show this help message

Examples:
    .\setup-github-env.ps1                 # Full setup
    .\setup-github-env.ps1 -Validate       # Validate only
    .\setup-github-env.ps1 -Generate       # Generate configs only

"@
}

function Test-EnvironmentFiles {
    Write-Info "Checking required files..."
    
    $allFilesExist = $true
    
    if (-not (Test-Path ".env.deployment")) {
        Write-Error ".env.deployment file not found!"
        if (Test-Path ".env.example") {
            Write-Info "Creating .env.deployment from template..."
            Copy-Item ".env.example" ".env.deployment"
            Write-Warning "Please edit .env.deployment with your actual configuration"
        }
        $allFilesExist = $false
    }
    
    if (-not (Test-Path ".env.local")) {
        Write-Warning ".env.local file not found!"
        if (Test-Path ".env.example") {
            Write-Info "Creating .env.local from template..."
            Copy-Item ".env.example" ".env.local"
            Write-Warning "Please edit .env.local for local development"
        }
    }
    
    if ($allFilesExist) {
        Write-Success "Environment files are available"
    }
    
    return $allFilesExist
}

function Get-EnvironmentVariables {
    param([string]$FilePath)
    
    $envVars = @{}
    
    if (Test-Path $FilePath) {
        Get-Content $FilePath | ForEach-Object {
            if ($_ -match '^([^#][^=]*?)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                # Remove quotes if present
                $value = $value.Trim('"', "'")
                $envVars[$key] = $value
            }
        }
    }
    
    return $envVars
}

function Test-DeploymentConfig {
    Write-Info "Validating deployment configuration..."
    
    if (-not (Test-Path ".env.deployment")) {
        Write-Error ".env.deployment file not found"
        return $false
    }
    
    $envVars = Get-EnvironmentVariables ".env.deployment"
    
    $requiredVars = @(
        "PROJECT_ID",
        "INSTANCE_NAME", 
        "DEV_DB_HOST",
        "DEV_DB_USER",
        "DEV_DB_PASSWORD",
        "DEV_DB_NAME"
    )
    
    $missingVars = @()
    foreach ($var in $requiredVars) {
        if (-not $envVars.ContainsKey($var) -or [string]::IsNullOrWhiteSpace($envVars[$var])) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Error "Missing required environment variables:"
        foreach ($var in $missingVars) {
            Write-Host "  - $var" -ForegroundColor $ErrorColor
        }
        return $false
    }
    
    Write-Success "All required environment variables are set"
    return $true
}

function Test-DatabaseConfig {
    Write-Info "Validating database configuration..."
    
    $envVars = Get-EnvironmentVariables ".env.deployment"
    
    if ($envVars.ContainsKey("DEV_DB_HOST")) {
        $dbHost = $envVars["DEV_DB_HOST"]
        
        # Check Cloud SQL connection string format
        if ($dbHost -match '^/cloudsql/[^:]+:[^:]+:[^:]+$') {
            Write-Success "Development database connection string format is valid"
        } else {
            Write-Error "Invalid development database connection string format"
            Write-Host "Expected format: /cloudsql/PROJECT_ID:REGION:INSTANCE_NAME" -ForegroundColor $ErrorColor
            Write-Host "Current value: $dbHost" -ForegroundColor $ErrorColor
            return $false
        }
    }
    
    Write-Success "Database configuration is valid"
    return $true
}

function New-AppConfigs {
    Write-Info "Generating app.yaml configurations..."
    
    if (-not (Test-Path ".env.deployment")) {
        Write-Error "Cannot generate app configs: .env.deployment not found"
        return $false
    }
    
    # Ensure config directory exists
    if (-not (Test-Path "config")) {
        New-Item -ItemType Directory -Path "config" | Out-Null
        Write-Info "Created config directory"
    }
    
    $envVars = Get-EnvironmentVariables ".env.deployment"
    
    # Generate development app.yaml
    $devService = if ($envVars.ContainsKey("DEV_SERVICE")) { $envVars["DEV_SERVICE"] } else { "dev" }
    $region = if ($envVars.ContainsKey("REGION")) { $envVars["REGION"] } else { "us-central1" }
    
    $cloudSqlInstance = "$($envVars['PROJECT_ID']):${region}:$($envVars['INSTANCE_NAME'])"
    
    $appDevLines = @(
        "runtime: nodejs20",
        "service: $devService",
        "",
        "env_variables:",
        "  NODE_ENV: 'development'",
        "  DB_HOST: '$($envVars["DEV_DB_HOST"])'",
        "  DB_USER: '$($envVars["DEV_DB_USER"])'",
        "  DB_PASSWORD: '$($envVars["DEV_DB_PASSWORD"])'",
        "  DB_NAME: '$($envVars["DEV_DB_NAME"])'",
        "  SESSION_SECRET: '$($envVars["DEV_SESSION_SECRET"])'",
        "  EMAIL_USER: '$($envVars["EMAIL_USER"])'",
        "  EMAIL_PASS: '$($envVars["EMAIL_PASS"])'",
        "  ADMIN_EMAIL: '$($envVars["ADMIN_EMAIL"])'",
        "",
        "beta_settings:",
        "  cloud_sql_instances: $cloudSqlInstance",
        "",
        "automatic_scaling:",
        "  min_instances: 1",
        "  max_instances: 2",
        "  target_cpu_utilization: 0.65",
        "",
        "handlers:",
        "- url: /.*",
        "  script: auto",
        "  secure: always"
    )

    $appDevContent = $appDevLines -join "`r`n"
    Set-Content -Path "config\app-dev.yaml" -Value $appDevContent -Encoding UTF8
    Write-Success "Generated config\app-dev.yaml"
    
    # Generate staging app.yaml
    $stagingService = if ($envVars.ContainsKey("STAGING_SERVICE")) { $envVars["STAGING_SERVICE"] } else { "staging" }
    
    $appStagingLines = @(
        "runtime: nodejs20",
        "service: $stagingService",
        "",
        "env_variables:",
        "  NODE_ENV: 'staging'",
        "  DB_HOST: '$($envVars["STAGING_DB_HOST"])'",
        "  DB_USER: '$($envVars["STAGING_DB_USER"])'",
        "  DB_PASSWORD: '$($envVars["STAGING_DB_PASSWORD"])'",
        "  DB_NAME: '$($envVars["STAGING_DB_NAME"])'",
        "  SESSION_SECRET: '$($envVars["STAGING_SESSION_SECRET"])'",
        "  EMAIL_USER: '$($envVars["EMAIL_USER"])'",
        "  EMAIL_PASS: '$($envVars["EMAIL_PASS"])'",
        "  ADMIN_EMAIL: '$($envVars["ADMIN_EMAIL"])'",
        "",
        "beta_settings:",
        "  cloud_sql_instances: $cloudSqlInstance",
        "",
        "automatic_scaling:",
        "  min_instances: 1",
        "  max_instances: 3",
        "  target_cpu_utilization: 0.65",
        "",
        "handlers:",
        "- url: /.*",
        "  script: auto",
        "  secure: always"
    )

    $appStagingContent = $appStagingLines -join "`r`n"
    Set-Content -Path "config\app-staging.yaml" -Value $appStagingContent -Encoding UTF8
    Write-Success "Generated config\app-staging.yaml"
    
    # Generate production app.yaml (based on existing app.yaml if it exists)
    $prodService = if ($envVars.ContainsKey("PROD_SERVICE")) { $envVars["PROD_SERVICE"] } else { "default" }
    
    $appProdLines = @(
        "runtime: nodejs20",
        "service: $prodService",
        "",
        "env_variables:",
        "  NODE_ENV: 'production'",
        "  DB_HOST: '$($envVars["PROD_DB_HOST"])'",
        "  DB_USER: '$($envVars["PROD_DB_USER"])'",
        "  DB_PASSWORD: '$($envVars["PROD_DB_PASSWORD"])'",
        "  DB_NAME: '$($envVars["PROD_DB_NAME"])'",
        "  SESSION_SECRET: '$($envVars["PROD_SESSION_SECRET"])'",
        "  EMAIL_USER: '$($envVars["EMAIL_USER"])'",
        "  EMAIL_PASS: '$($envVars["EMAIL_PASS"])'",
        "  ADMIN_EMAIL: '$($envVars["ADMIN_EMAIL"])'",
        "",
        "beta_settings:",
        "  cloud_sql_instances: $cloudSqlInstance",
        "",
        "automatic_scaling:",
        "  min_instances: 1",
        "  max_instances: 5",
        "  target_cpu_utilization: 0.65",
        "",
        "handlers:",
        "- url: /.*",
        "  script: auto",
        "  secure: always"
    )

    $appProdContent = $appProdLines -join "`r`n"
    Set-Content -Path "config\app-production.yaml" -Value $appProdContent -Encoding UTF8
    Write-Success "Generated config\app-production.yaml"
    
    Write-Success "App configuration files generated successfully in config/ directory"
    return $true
}

function Show-ConfigSummary {
    Write-Info "Configuration Summary:"
    
    if (Test-Path ".env.deployment") {
        $envVars = Get-EnvironmentVariables ".env.deployment"
        
        Write-Host "  Project ID: $($envVars["PROJECT_ID"])"
        Write-Host "  Cloud SQL Instance: $($envVars["INSTANCE_NAME"])"
        Write-Host "  Region: $(if ($envVars["REGION"]) { $envVars["REGION"] } else { "us-central1" })"
        Write-Host "  Development Service: $(if ($envVars["DEV_SERVICE"]) { $envVars["DEV_SERVICE"] } else { "dev" })"
        Write-Host "  Staging Service: $(if ($envVars["STAGING_SERVICE"]) { $envVars["STAGING_SERVICE"] } else { "staging" })"
        Write-Host "  Production Service: $(if ($envVars["PROD_SERVICE"]) { $envVars["PROD_SERVICE"] } else { "default" })"
        Write-Host ""
        Write-Host "  Database Configuration:"
        Write-Host "    Development: $($envVars["DEV_DB_HOST"])"
        Write-Host "    Database Name: $($envVars["DEV_DB_NAME"])"
        Write-Host "    Database User: $($envVars["DEV_DB_USER"])"
    }
}

function Main {
    Write-Host "🔧 GitHub Actions Environment Setup (PowerShell)" -ForegroundColor $InfoColor
    Write-Host "===================================================" -ForegroundColor $InfoColor
    Write-Host ""
    
    if ($Help) {
        Show-Help
        return
    }
    
    $success = $true
    
    if (-not $Generate) {
        $success = $success -and (Test-EnvironmentFiles)
        $success = $success -and (Test-DeploymentConfig)
        $success = $success -and (Test-DatabaseConfig)
    }
    
    if ($success -and (-not $Validate)) {
        $success = $success -and (New-AppConfigs)
    }
    
    if ($success) {
        Write-Host ""
        Show-ConfigSummary
        Write-Host ""
        Write-Success "✅ Environment setup completed successfully!"
        Write-Host ""
        Write-Info "Next steps:"
        Write-Host "  1. Commit the .env.deployment file to your repository"
        Write-Host "  2. Ensure GCP_SA_KEY secret is configured in GitHub"
        Write-Host "  3. Push changes to trigger GitHub Actions deployment"
        Write-Host ""
        Write-Warning "Note: Keep your .env.local file private for local development"
    } else {
        Write-Error "❌ Environment setup failed!"
        Write-Host ""
        Write-Info "Please fix the issues above and run this script again."
        exit 1
    }
}

# Run main function
Main
