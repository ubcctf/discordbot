"use strict";

const Discord = require('discord.js');
const crypto = require("crypto");

const { sendEmail } = require("./mail");
const globals = require("./globals");
const { GUILD_ID, ADMIN_ID, discordAuthToken } = require(globals.configFile);
const { notifyAdminOfException, notifyAdmin, isVerified, sleep,
    addVerifiedRole, log, exceptionLogger } = require("./utils");
    

const DEBUG = true;

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


// ========================================================================================================


async function onGuildMemberAdd(member) {
    log(`New member ${member.displayName}:${member.user.id} joined!`);
    let user = member.user;
    const dm = await user.createDM();
    dm.startTyping();
    await sleep(1500);
    dm.stopTyping();
    await dm.send(`Hello ${member}! I'm the bot for the UBC CTF team's discord channel. In order to get full access to our server, you'll need to verify your UBC email address with me. E.g., \`\`\`!verify maple@student.ubc.ca\n!verify maple@alum.ubc.ca\n!verify maple@cs.ubc.ca\n!verify maple@<subdomain>.ubc.ca\`\`\`Return the token to me once you receive it. For troubleshooting and additional info, see the #welcome channel.`);
}


async function onMessage(message) {

    if (message.author.bot) {
        return;
    }
        
    if (message.guild && message.guild.id !== globals.guild.id) {
        throw "Whaaat, just received a message from another guild. This isn't supposed to happen.";
    }

    if (message.channel.type === "dm") {
        
        if (activeSessions.has(message.author.id)) {
            return;
        }

        let dmSession = await DmSession.newSession(message.author, message.channel);
        activeSessions.add(message.author.id);

        try {
            await dmSession.start(message);
        } finally {
            activeSessions.delete(message.author.id);
        }
    }
}


class DmSession {

    constructor(user, dm, guildMember) {
        this.dm = dm;
        this.user = user;
        this.guildMember = guildMember;
        this.RECV_TIMEOUT = 30 * 60 * 1000; // ms
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
        if (DEBUG) this.log(`sending: ${s}`);
        await this.typing(ms);
        await this.dm.send(s);
    }

    async recvMsg(_logID=null) {
        const msgs = await this.dm.awaitMessages(m => !m.author.bot, 
            { max: 1, time: this.RECV_TIMEOUT });    
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

    async validateEmailAddress(emailAddress) {
        if (emailAddress.split("@").length !== 2) return false;

        const [ localPart, hostPart ] = emailAddress.split("@");

        if (/[\s"'`><]/.test(emailAddress)) {
            await this.send(`Your email contains some weird characters? IDK Maybe this bot is just broken. Try again or message us in the #help channel.`)
            return false;
        }

        if (!(hostPart == "ubc.ca" || hostPart.endsWith(".ubc.ca"))) {
            await this.send(`I need an email address that ends with \`ubc.ca\``);
            return false;
        }

        if (!localPart) {
            await this.send(`Doesn't seem like a valid email address`);
            return false;
        }

        return true;
    }

    async start(message) {

        this.log("Starting email verification session");
        this.log(`recvd: ${message}`);

        const txt = message.content;
        
        if (isVerified(this.guildMember)) {
            await this.send("You're already verified, nothing I can do for you.");
            return;
        }
    
        if (!txt.startsWith("!verify")) {
            await this.send(`Please send \`!verify\` to verify your UBC email address. E.g., \`\`\`!verify maple@student.ubc.ca\`\`\``);
            return;
        }

        const splitcmd = txt.split(/\s+/);
    
        if (splitcmd.length !== 2) {
            await this.send(`Must pass exactly one argument to \`!verify\``);
            return;
        }
    
        const emailAddress = splitcmd[1];

        if (!await this.validateEmailAddress(emailAddress)) {
            return;
        }
    
        const randhex = crypto.randomBytes(16).toString("hex");
        const token = `token{${randhex}}`;
    
        try {
            await sendEmail(emailAddress, token);
        } catch (e) {
            await this.send(`Something went wrong while sending you the email, get help in the #help channel!`);
            notifyAdmin(`Failed while sending an email to ${emailAddress}.`);
            notifyAdminOfException(e);
            return;
        }
        
        await this.send(`Email sent.`);
    
        // TODO Block from sending !verify again until 60 seconds have passed

        for (var i = 0; i < this.MAX_TOKEN_ATTEMPTS; i++) {

            await this.send(`Waiting for the token. You've got ${this.RECV_TIMEOUT / 1000 / 60} minutes. Cancel with \`!cancel\``);
            
            let response = await this.recvMsg();

            if (!response) {
                await this.send(`Gotta be faster! Send \`!verify\` again.`);
                break;
            }

            if (response === "!cancel") break;

            const TOKEN_REGEX = /^token{[\w\d]+}$/;

            const isValidTokenSyntax = TOKEN_REGEX.test(response);
            const isCorrectToken = response === token;

            if (!isValidTokenSyntax || !isCorrectToken) {

                if (i === this.MAX_TOKEN_ATTEMPTS - 1) {
                    await this.send(`All the tokens you sent were incorrect. Try sending \`!verify\` again, or get help in the #help channel`);
                    break;
                }

                if (!isValidTokenSyntax) {
                    await this.send(`Try again. That doesn't look like a valid token to me. Should match \`${TOKEN_REGEX.source}\``);
                    continue;
                }

                if (!isCorrectToken) {
                    await this.send("Try again. Your token doesn't match what I sent to your email!");
                    continue;
                }
            }
            else if (response === token) {

                await addVerifiedRole(this.guildMember);
                this.log(`verified ${emailAddress}`);
                await this.send("Done! Before you go, how did you hear about our club? It would help us plan our outreach better :)");

                // If they reply before the timeout, recvMsg will log it.
                const response = await this.recvMsg("ea75e9ac");

                if (response) await this.send("Thanks!");

                break;
            
            } else {
                throw "Should never reach here";
            }
        }
        this.log("Done");
    }
}