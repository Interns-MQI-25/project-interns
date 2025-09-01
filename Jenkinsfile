pipeline {
    agent any
    environment {
        IMAGE_NAME = "project-interns:localtunnel"
        CONTAINER_NAME = "project-interns-localtunnel"
        LT_SUBDOMAIN = "mqi-rdt"
    }
    stages {
        stage('Checkout') {
            steps {
                git 'https://github.com/Interns-MQI-25/project-interns.git'
            }
        }
        stage('Build Docker Image') {
            steps {
                sh 'docker build -f Dockerfile.localtunnel -t $IMAGE_NAME .'
            }
        }
        stage('Stop Old Container') {
            steps {
                sh 'docker rm -f $CONTAINER_NAME || true'
            }
        }
        stage('Run Container') {
            steps {
                sh '''
                docker run -d --name $CONTAINER_NAME \
                  -e LT_SUBDOMAIN=$LT_SUBDOMAIN \
                  --restart unless-stopped \
                  -p 3000:3000 $IMAGE_NAME
                '''
            }
        }
    }
    post {
        always {
            sh 'docker ps -a'
        }
    }
}
