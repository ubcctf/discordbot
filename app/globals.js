"use strict";

// Serves as a singleton to track globals across files.


if (process.argv.length != 3) {
    console.log("Expecting 3 arguments");
    process.exit(1);
}

// These variables are set on startup
exports.guild = null;
exports.admin = null;

const map = {
    "test": "./config-test.json",
    "production": "./config-production.json",
}

if (!(exports.configFile = map[process.argv[2]])) throw "Invalid argument";