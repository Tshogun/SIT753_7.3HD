pipeline {
    agent any

    environment {
        APP_NAME        = 'devops-demo'
        IMAGE_NAME      = 'devops-demo'
        STAGING_PORT    = '5050'
        PRODUCTION_PORT = '5051'
    }

    stages {

        stage('Build') {
            steps {
                echo 'Installing dependencies...'
                sh 'npm ci'

                echo 'Building the application...'
                sh 'npm run build'

                echo 'Building Docker image...'
                sh '''
                    docker build \
                        -f Dockerfile.production \
                        -t ${IMAGE_NAME}:${BUILD_NUMBER} \
                        .
                '''
                echo 'Recording build artifact metadata...'

sh '''
    echo "Application: ${APP_NAME}" > build-metadata.txt
    echo "Jenkins Build Number: ${BUILD_NUMBER}" >> build-metadata.txt
    echo "Docker Image: ${IMAGE_NAME}:${BUILD_NUMBER}" >> build-metadata.txt
    echo "Git Commit: ${GIT_COMMIT}" >> build-metadata.txt
    echo "Build Date: $(date)" >> build-metadata.txt
    echo "Docker Image ID: $(docker image inspect ${IMAGE_NAME}:${BUILD_NUMBER} --format='{{.Id}}')" >> build-metadata.txt
'''

echo 'Build artifact metadata:'
sh 'cat build-metadata.txt'

archiveArtifacts artifacts: 'build-metadata.txt',
                 allowEmptyArchive: false

echo 'Build completed successfully.'
            }
        }

        stage('Test') {
            steps {
                echo 'Running automated tests...'
                sh 'npm test'
            }
        }

        stage('Code Quality') {

    steps {

        echo '=== CODE QUALITY STAGE ==='

        sh 'npm run lint'

        sh 'npm run type-check'

        echo 'Running SonarQube analysis...'

        script {
            def scannerHome = tool 'SonarScanner'

            withSonarQubeEnv('SonarQube') {
                sh "${scannerHome}/bin/sonar-scanner"
            }
            timeout(time: 5, unit: 'MINUTES') {
    waitForQualityGate abortPipeline: true
}
        }

        echo 'ESLint, TypeScript, and SonarQube analysis completed.'
    }
}
        stage('Security') {

    steps {

        echo '=== SECURITY STAGE ==='

        echo 'Running npm dependency security audit...'

        sh '''
            npm audit --audit-level=high > security-audit.txt 2>&1 || true
            cat security-audit.txt
        '''

        echo 'Running Trivy container image security scan...'

        sh '''
            trivy image \
                --format table \
                --output trivy-report.txt \
                ${IMAGE_NAME}:${BUILD_NUMBER}

            cat trivy-report.txt
        '''

        archiveArtifacts artifacts: 'security-audit.txt,trivy-report.txt',
                         allowEmptyArchive: false

        echo 'Dependency and container security analysis completed.'
    }
}
        stage('Deploy to Staging') {
            steps {
                echo 'Deploying to staging...'

                sh '''
                    docker rm -f ${APP_NAME}-staging 2>/dev/null || true

                    docker run -d \
                        --name ${APP_NAME}-staging \
                        -p ${STAGING_PORT}:5050 \
                        ${IMAGE_NAME}:${BUILD_NUMBER}
                '''

                echo 'Checking staging health...'

                sh '''
                    sleep 5
                    curl -f \
                        http://localhost:${STAGING_PORT}/api/v1/health/live
                '''
            }
        }

        stage('Release to Production') {
            steps {
                echo 'Promoting image to production...'

                sh '''
                    docker tag \
                        ${IMAGE_NAME}:${BUILD_NUMBER} \
                        ${IMAGE_NAME}:production
                '''

                sh '''
                    docker rm -f ${APP_NAME}-production 2>/dev/null || true

                    docker run -d \
                        --name ${APP_NAME}-production \
                        -p ${PRODUCTION_PORT}:5050 \
                        ${IMAGE_NAME}:production
                '''
            }
        }

        stage('Monitoring') {

    steps {

        echo '=== MONITORING STAGE ==='

        echo 'Checking production health endpoint...'

        sh '''
            curl -f \
                http://localhost:${PRODUCTION_PORT}/api/v1/health/live
            echo ""
        '''

        echo 'Collecting live container metrics...'

        sh '''
            docker stats ${APP_NAME}-production --no-stream
        '''

        echo 'Collecting recent production logs...'

        sh '''
            docker logs --tail 20 ${APP_NAME}-production
        '''

        echo 'Running monitoring incident simulation...'

        script {

            try {

                echo 'Simulating production outage...'

                sh 'docker stop ${APP_NAME}-production'

                def healthResult = sh(
                    script: '''
                        curl -f --max-time 5 \
                        http://localhost:${PRODUCTION_PORT}/api/v1/health/live
                    ''',
                    returnStatus: true
                )

                if (healthResult == 0) {
                    error('Monitoring alert test failed: production service remained available.')
                }

                echo 'ALERT DETECTED: Production health check failed as expected.'

            } finally {

                echo 'Recovering production service...'

                sh 'docker start ${APP_NAME}-production || true'
            }
        }

        echo 'Verifying production recovery...'

        sh '''
            sleep 5
            curl -f \
                http://localhost:${PRODUCTION_PORT}/api/v1/health/live
        '''

        echo 'Monitoring and incident recovery checks completed successfully.'
    }
}
    }

    post {
        success {
            echo 'Pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Check the failed stage for details.'
        }

        always {
            echo 'Pipeline execution finished.'
        }
    }
}
