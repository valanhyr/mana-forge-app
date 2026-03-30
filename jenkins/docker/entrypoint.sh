#!/bin/bash
set -e

# Fix Docker socket permissions on every start
if [ -S /var/run/docker.sock ]; then
    chmod 666 /var/run/docker.sock
fi

# Start Jenkins normally
exec /usr/bin/tini -- /usr/local/bin/jenkins.sh "$@"
