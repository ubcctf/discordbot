"use strict";

const globals = require("./globals");
const { VERIFIED_ROLE_ID } = require(globals.configFile);


function log(s) {
    let datetime = new Date();
    console.log(`${datetime.toISOString()}: ${s}`);
}


function validateEmailAddress(emailAddress) {
        
    let split = emailAddress.split("@");
    
    if (split.length !== 2) return false;

    const [ localPart, hostPart ] = split;

    if (/[^a-z0-9._]/i.test(localPart) || 
        /[^a-z0-9.]/i.test(hostPart)) 
        return false;

    if (!localPart || !(hostPart == "ubc.ca" || hostPart.endsWith(".ubc.ca"))) 
        return false;

    return true;
}


async function addVerifiedRole(guildMember) {
    
    if (isVerified(guildMember)) {
        notifyAdmin(`Attempted to verify user "${guildMember.nickname}" that was already verified, something's wrong in the logic.`);
        return;
    }

    await guildMember.roles.add(VERIFIED_ROLE_ID, "UBC email address has been verified");
}


function isVerified(guildMember) {
    // roles.cache is apparently supposed to contain the full set of roles for the member, always. Not sure though. There doesn't seem to be any other way to access the full list of roles for a member aside from using the cache attribute.
    return guildMember.roles.cache.has(VERIFIED_ROLE_ID);
}


async function notifyAdmin(s) {
    let dm = await globals.admin.createDM();
    await dm.send(s);
}


async function notifyAdminOfException(e) {
    let msg = e.stack ? e.stack : e.toString();
    await notifyAdmin(`\`\`\`\n${msg.replaceAll(/`/g, "'")}\n\`\`\``);
}


async function exceptionLogger(func, ...args) {
    try {
        await func(...args);
    } catch (e) {
        await notifyAdminOfException(e);
        // Important: Not killing the app if an exception occurs is dangerous b/c it could end up in an inconsitent state. However, this app has almost no state (currently) so the consequences are low.
        // throw e;
    }
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


exports.validateEmailAddress = validateEmailAddress;
exports.addVerifiedRole = addVerifiedRole
exports.isVerified = isVerified
exports.notifyAdmin = notifyAdmin
exports.notifyAdminOfException = notifyAdminOfException
exports.log = log;
exports.exceptionLogger = exceptionLogger;
exports.sleep = sleep;