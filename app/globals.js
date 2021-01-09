"use strict";

const path = require("path");

// Serves as a singleton to track globals across files.

if (process.argv.length != 3) {
    console.log("[bot] Expecting 3 arguments");
    process.exit(1);
}

exports.configFile = path.join(process.cwd(), process.argv[2]);

// These variables are set on startup
exports.guild = null;
exports.admin = null;