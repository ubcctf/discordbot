#!/bin/bash

set -euo pipefail


if [[ "$1" == "shell" ]]; then
    # This is useful for dev. Mounts the ./app directory on your host into the container, so you don't have rebuild everytime you make changes to the app files. Also publishes port 9229, which is the default port that nodejs listens on for debuggers to attach. See package.json for examples on how to run the app in the container.
    docker run --rm --name ubcdiscordbot-dev -it --publish 127.0.0.1:9229:9229 \
        -v $(realpath ./app):/app/app \
        -v $(realpath ./test):/app/test \
        ubcdiscordbot-dev /bin/bash

elif [[ "$1" == "production" ]]; then
    docker run -d --name ubcdiscordbot ubcdiscordbot npm run production
    docker logs --follow ubcdiscordbot &>> ./log.txt &

else
    echo "Invalid usage."
fi