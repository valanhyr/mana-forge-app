pipeline {
  agent any
  environment {
    TAG_RELEASE = "${env.TAG_RELEASE ?: 'false'}"
    FORCE_TAG = "${env.FORCE_TAG ?: 'false'}"
    REGISTRY = "${env.REGISTRY ?: ''}"
    REGISTRY_CREDENTIALS_ID = "${env.REGISTRY_CREDENTIALS_ID ?: ''}"
    SSH_CREDENTIALS_ID = "${env.SSH_CREDENTIALS_ID ?: ''}"
    DEPLOY_HOST = "${env.DEPLOY_HOST ?: ''}"
    DEPLOY_COMPOSE_PATH = "${env.DEPLOY_COMPOSE_PATH ?: '/home/deploy/docker-compose.yml'}"
  }
  stages {
    stage('Build') {
      steps {
        echo 'Building service artifacts and Docker images'
        script {
          // Example: build web, api, engine images
          sh 'docker --version || true'
          dir('mana-forge-web') {
            sh 'npm ci --silent'
            sh 'npm run build --silent'
            sh "docker build -t ${env.REGISTRY}/mana-forge-web:${sh(returnStdout:true, script:'git rev-parse --short HEAD').trim()} ."
          }
          dir('mana-forge-api') {
            sh './mvnw -q clean package -DskipTests'
            sh "docker build -t ${env.REGISTRY}/mana-forge-api:${sh(returnStdout:true, script:'git rev-parse --short HEAD').trim()} ."
          }
          dir('mana-forge-engine') {
            sh 'python -V || true'
            sh 'pip --version || true'
            sh "docker build -t ${env.REGISTRY}/mana-forge-engine:${sh(returnStdout:true, script:'git rev-parse --short HEAD').trim()} ."
          }
        }
      }
    }

    stage('Push images') {
      when { expression { return env.REGISTRY != '' } }
      steps {
        script {
          if (env.REGISTRY_CREDENTIALS_ID) {
            docker.withRegistry("https://${env.REGISTRY}", env.REGISTRY_CREDENTIALS_ID) {
              sh "docker push ${env.REGISTRY}/mana-forge-web:${sh(returnStdout:true, script:'git rev-parse --short HEAD').trim()}"
              sh "docker push ${env.REGISTRY}/mana-forge-api:${sh(returnStdout:true, script:'git rev-parse --short HEAD').trim()}"
              sh "docker push ${env.REGISTRY}/mana-forge-engine:${sh(returnStdout:true, script:'git rev-parse --short HEAD').trim()}"
            }
          } else {
            echo 'REGISTRY_CREDENTIALS_ID not set - attempting to push without auth'
            sh "docker push ${env.REGISTRY}/mana-forge-web:${sh(returnStdout:true, script:'git rev-parse --short HEAD').trim()}"
            sh "docker push ${env.REGISTRY}/mana-forge-api:${sh(returnStdout:true, script:'git rev-parse --short HEAD').trim()}"
            sh "docker push ${env.REGISTRY}/mana-forge-engine:${sh(returnStdout:true, script:'git rev-parse --short HEAD').trim()}"
          }
        }
      }
    }

    stage('Tag release from inventory.json') {
      when { expression { return env.TAG_RELEASE == 'true' } }
      steps {
        script {
          def inventory = [:]
          try {
            inventory = readJSON file: 'mana-forge-web/public/inventory.json'
          } catch (err) {
            echo "readJSON not available, falling back to jq"
            sh 'cat mana-forge-web/public/inventory.json'
            def out = sh(returnStdout: true, script: "jq -r 'to_entries|map(\"\\(.key)=\\(.value)\")|.[]' mana-forge-web/public/inventory.json").trim()
            out.split('\n').each { line ->
              def parts = line.split('=',2)
              inventory[parts[0]] = parts[1]
            }
          }

          def commit = sh(returnStdout: true, script: 'git rev-parse --verify HEAD').trim()
          echo "Tagging commit ${commit} per inventory: ${inventory}"

          inventory.each { svc, ver ->
            def tag = "${svc}-${ver}"
            def exists = (sh(returnStatus: true, script: "git rev-parse -q --verify refs/tags/${tag}")) == 0
            if (!exists) {
              sh "git tag -a ${tag} -m '${svc} ${ver}' ${commit}"
            } else {
              echo "Tag ${tag} already exists; skipping unless FORCE_TAG=true"
              if (env.FORCE_TAG == 'true') {
                sh "git tag -f -a ${tag} -m '${svc} ${ver}' ${commit}"
              }
            }
            sh "git push origin refs/tags/${tag}"
          }
        }
      }
      post {
        success { echo 'Tags created and pushed successfully.' }
        failure { echo 'Tagging failed.' }
      }
    }

    stage('Deploy to host') {
      when { expression { return env.DEPLOY == 'true' && env.DEPLOY_HOST != '' } }
      steps {
        script {
          def shortSha = sh(returnStdout:true, script:'git rev-parse --short HEAD').trim()
          def webTag = "${env.REGISTRY ?: 'registry'}/mana-forge-web:${shortSha}"
          def apiTag = "${env.REGISTRY ?: 'registry'}/mana-forge-api:${shortSha}"
          def engineTag = "${env.REGISTRY ?: 'registry'}/mana-forge-engine:${shortSha}"

          if (!env.SSH_CREDENTIALS_ID) {
            error 'SSH_CREDENTIALS_ID is not set in job credentials. Aborting deploy.'
          }

          sshagent (credentials: [env.SSH_CREDENTIALS_ID]) {
            // Copy docker-compose override or instruct host to pull new images
            sh "ssh -o StrictHostKeyChecking=no ${env.DEPLOY_HOST} 'docker pull ${webTag} || true'"
            sh "ssh -o StrictHostKeyChecking=no ${env.DEPLOY_HOST} 'docker pull ${apiTag} || true'"
            sh "ssh -o StrictHostKeyChecking=no ${env.DEPLOY_HOST} 'docker pull ${engineTag} || true'"

            // Restart stack using docker compose path
            sh "ssh -o StrictHostKeyChecking=no ${env.DEPLOY_HOST} 'docker compose -f ${env.DEPLOY_COMPOSE_PATH} pull && docker compose -f ${env.DEPLOY_COMPOSE_PATH} up -d'"
          }
        }
      }
    }
  }
  post {
    success { echo 'Pipeline completed.' }
    failure { echo 'Pipeline failed. Check logs.' }
  }
}
