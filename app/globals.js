"use strict";

// Serves as a singleton to track globals across files.


if (process.argv.length != 3) {
    console.log("Expecting 3 arguments");
    process.exit(1);
}

// These variables are set on startup
exports.guild = null;
exports.admin = null;

exports.configFile = process.argv[2];