"use strict";

const Discord = require('discord.js');
const crypto = require("crypto");

const { sendEmail } = require("./mail");
const globals = require("./globals");
const { GUILD_ID, ADMIN_ID, discordAuthToken } = require(globals.configFile);
const { validateEmailAddress, notifyAdminOfException, notifyAdmin, isVerified, sleep,
    addVerifiedRole, log, exceptionLogger } = require("./utils");


const RECV_TIMEOUT = 30 * 60 * 1000; // ms

const client = new Discord.Client();
const activeSessions = new Set();


client.once('ready', async () => {
    globals.guild = await client.guilds.fetch(GUILD_ID);
    globals.admin = await globals.guild.members.fetch(ADMIN_ID);
    log(`Starting up! Using guild "${globals.guild.name}"`);
});


client.on("message", async message => {
    await exceptionLogger(onMessage, message);
});


client.on("guildMemberAdd", async member => {
    await exceptionLogger(onGuildMemberAdd, member);
});


client.login(discordAuthToken)


// ==========================================================================================


async function onGuildMemberAdd(member) {
    log(`New member ${member.displayName}:${member.user.id} joined!`);
    let user = member.user;
    const dm = await user.createDM();
    dm.startTyping();
    await sleep(1500);
    dm.stopTyping();
    await dm.send(`Hello ${member}! I'm the UBC CTF team's Discord bot. In order to get full access to our server, you'll need to verify your UBC email address with me. E.g., \`maple@student.ubc.ca\`. Give me your email address, then return the token to me once you receive my email. For troubleshooting and additional info, see the #welcome channel.`);
}


async function onMessage(message) {

    if (message.author.bot) {
        return;
    }
        
    if (message.guild && message.guild.id !== globals.guild.id) {
        throw "Whaaat, just received a message from another guild. This isn't supposed to happen.";
    }

    if (message.channel.type === "dm") {

        let dmSession = await DmSession.newSession(message.author, message.channel);
        await dmSession.start(message);
    }
}


class DmSession {

    constructor(user, dm, guildMember) {
        this.dm = dm;
        this.user = user;
        this.guildMember = guildMember;
        this.MAX_TOKEN_ATTEMPTS = 3;
    }

    static async newSession(user, dm) {
        let guildMember;
        try {
            // For some reason I need to force cache invalidation. I'm fairly confident that Discord's server's are returning an invalid member list initially. And maybe because I left/joined the server with my test account super quickly over and over again. idk
            guildMember = await globals.guild.members.fetch({ user, force: true });
        } catch (e) {
            if (e.message == "Unknown Member") {
                throw `Just received a message from username: "${user.username}" that's not in our discord server. This should never happen because direct messaging is disabled.`;                
            }
            throw e;
        }
        return new DmSession(user, dm, guildMember);
    }

    log(s) {
        log(`${this.guildMember.displayName}:${this.user.id}: ${s}`);
    }

    async send(s, ms=1000) {
        this.log(`sending: ${s}`);
        await this.typing(ms);
        await this.dm.send(s);
    }

    async recvMsg({ timeout=RECV_TIMEOUT, _logID=null }={}) {
        const msgs = await this.dm.awaitMessages(m => !m.author.bot, { max: 1, time: timeout });    
        let response = msgs.first();

        if (!response) return null;

        response = response.content.trim();
        this.log((_logID ? _logID+"-" : "") + `recvd: ${response}`);
        return response;
    }

    async typing(ms) {
        this.dm.startTyping();
        await sleep(ms);
        this.dm.stopTyping();
    }

    async block() {
        // Don't handle any messages from this user until the time is future
        const future = Date.now() + 15*1000;

        while (Date.now() < future) {
            let timeout;
            if ((timeout = future - Date.now()) <= 0) break;
            if (await this.recvMsg({ timeout: timeout })) {
                const blockedtime = Math.ceil((future - Date.now())/1000);
                await this.send(`Blocked for ${blockedtime} seconds`);
            }
        }
    }

    async start(message) {
                
        if (activeSessions.has(message.author.id)) return;

        try {
            activeSessions.add(message.author.id);
            await this._start(message);
            // await this.block();
        } finally {
            activeSessions.delete(message.author.id);
            this.log("Closing session");
        }
    }

    async _start(message) {

        this.log("Starting email verification session");
        this.log(`recvd: ${message}`);

        if (isVerified(this.guildMember)) {
            await this.send("You're already verified, nothing I can do for you.");
            return;
        }

        if (!message.content) {
            await this.send("Send me your email address, e.g., `maple@student.ubc.ca`.");
            return;
        }

        // Take the last word in the message as the email address for backward compatibility with the !verify syntax we used to have
        const split = message.content.split(" ");
        const emailAddress = split[split.length - 1];
    
        if (!validateEmailAddress(emailAddress)) {
            await this.send("Invalid email address. I'm expecting your message to look something like `[your-email]@[subdomain.]ubc.ca`. Try again or see the #welcome channel for more info and troubleshooting.");
            return;
        }
    
        const randhex = crypto.randomBytes(16).toString("hex");
        const token = `token{${randhex}}`;
    
        try {
            await sendEmail(emailAddress, token);
        } catch (e) {
            await this.send(`Email failed to send.`);
            notifyAdmin(`Failed while sending an email to ${emailAddress}.`);
            notifyAdminOfException(e);
            return;
        }
        
        await this.send(`Email sent.`);
    
        // TODO Block from sending !verify again until 60 seconds have passed

        for (var i = 0; i < this.MAX_TOKEN_ATTEMPTS; i++) {

            await this.send(`Waiting for the token. You've got ${RECV_TIMEOUT / 1000 / 60} minutes. Cancel with \`!cancel\``);
            
            let response = await this.recvMsg();

            if (!response) {
                await this.send(`Gotta be faster! Send me your email address again.`);
                break;
            }

            if (response === "!cancel") {
                await this.send("Cancelled");
                break;
            }

            const isCorrectToken = response === token || response === randhex
            
            if (isCorrectToken) {
                
                await addVerifiedRole(this.guildMember);
                this.log(`verified ${emailAddress}`);
                
                await this.send("Done! Before you go, how did you hear about our club?");
                
                if (await this.recvMsg({ _logID: "ea75e9ac" })) await this.send("Thanks!");

                break;

            } else {
                
                if (i < this.MAX_TOKEN_ATTEMPTS - 1) {
                    await this.send('Incorrect token. Try again!');
                    continue;

                } else {
                    await this.send(`Incorrect token. Send me your email address again.`);
                    break;
                }
            }
        }
    }
}