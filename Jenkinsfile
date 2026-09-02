pipeline {
  agent any
  environment {
    TAG_RELEASE = "${env.TAG_RELEASE ?: 'false'}"
    FORCE_TAG = "${env.FORCE_TAG ?: 'false'}"
  }
  stages {
    stage('Build') {
      steps {
        echo 'Build steps should be here (delegated to existing pipeline)'
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

    stage('Deploy (placeholder)') {
      when { expression { return env.DEPLOY == 'true' } }
      steps {
        echo 'Deployment is handled by your Jenkins job configuration or CD. Add deploy commands here if desired.'
      }
    }
  }
}
