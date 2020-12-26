#!/bin/bash

set -euo pipefail

function run_in_background {
    docker run -d --name ubcdiscordbot ubcdiscordbot node /app/app/bot.js "$1"
}


if [[ "$1" == "shell" ]]; then
    # This is useful for dev. Mounts the ./app directory on your host into the container, so you don't have rebuild everytime you make changes to the app files. Also publishes port 9229, which is the default port that nodejs listens on for debuggers to attach. Note: use node --inspect=0.0.0.0:9229 ./app/bot.js inside the container to run with debugging enabled.
    docker run --rm --name ubcdiscordbot -it --publish 127.0.0.1:9229:9229 -v $(realpath ./app):/app/app ubcdiscordbot /bin/bash

elif [[ "$1" == "production" ]]; then
    run_in_background production
    docker logs --follow ubcdiscordbot &>> ./log.txt &

elif [[ "$1" == "test" ]]; then
    run_in_background test

else
    echo "Invalid usage."
fi