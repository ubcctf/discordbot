FROM node

ARG NPM_ARGS=""

RUN apt-get update && apt-get upgrade -y

# DEV
# RUN apt-get install -y man vim less strace ltrace netcat-openbsd

WORKDIR /app

COPY package.json /app/
COPY app app/

RUN npm install $NPM_ARGS