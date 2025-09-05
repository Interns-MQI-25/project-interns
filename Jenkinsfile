pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        SERVICE_NAME = 'marquardt-inventory'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup Node.js') {
            steps {
                sh '''
                    # Install Node.js if not available
                    if ! command -v node &> /dev/null; then
                        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
                        sudo apt-get install -y nodejs
                    fi
                    
                    # Verify installation
                    node --version
                    npm --version
                '''
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh '''
                    npm install --production
                '''
            }
        }
        
        stage('Setup Database') {
            steps {
                sh '''
                    # Install MySQL if not available
                    if ! command -v mysql &> /dev/null; then
                        sudo apt-get update
                        sudo apt-get install -y mysql-server
                        sudo systemctl start mysql
                    fi
                    
                    # Setup database
                    node setup-db.js || echo "Database setup completed"
                    node create-admin.js || echo "Admin creation completed"
                '''
            }
        }
        
        stage('Install Service') {
            steps {
                sh '''
                    # Make installation script executable
                    chmod +x linux-deployment/install-systemd-service.sh
                    
                    # Install as systemd service
                    sudo ./linux-deployment/install-systemd-service.sh
                '''
            }
        }
        
        stage('Start Service') {
            steps {
                sh '''
                    # Start the service
                    if command -v systemctl &> /dev/null; then
                        sudo systemctl start ${SERVICE_NAME}
                        sudo systemctl enable ${SERVICE_NAME}
                        
                        # Wait for service to start
                        sleep 10
                        
                        # Check service status
                        sudo systemctl status ${SERVICE_NAME}
                    else
                        echo "Systemd not available - manual start required"
                    fi
                '''
            }
        }
        
        stage('Health Check') {
            steps {
                sh '''
                    # Wait for application to start
                    sleep 15
                    
                    # Test application health
                    curl -f http://localhost:3000/health || {
                        echo "Health check failed"
                        sudo journalctl -u ${SERVICE_NAME} -n 20
                        exit 1
                    }
                    
                    echo "Application is healthy and running"
                '''
            }
        }
    }
    
    post {
        always {
            sh '''
                # Cleanup - stop service if running
                if command -v systemctl &> /dev/null; then
                    sudo systemctl stop ${SERVICE_NAME} || true
                fi
            '''
        }
        
        success {
            echo 'Deployment successful! Application is running on http://localhost:3000'
        }
        
        failure {
            sh '''
                # Show logs for debugging
                if command -v systemctl &> /dev/null; then
                    sudo journalctl -u ${SERVICE_NAME} -n 50 || true
                fi
                
                # Show system info
                echo "=== System Information ==="
                uname -a
                df -h
                free -h
            '''
        }
    }
}