#!/bin/bash

set -euo pipefail

if [[ "$1" == "dev" ]]; then
    # Includes devDependencies in the image
    docker build -t ubcdiscordbot-dev .

elif [[ "$1" == "production" ]]; then
    docker build --build-arg NPM_ARGS="--only=production" -t ubcdiscordbot .

else
    echo "Invalid usage"
fi