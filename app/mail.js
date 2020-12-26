"use strict";

const nodemailer = require("nodemailer");
const globals = require("./globals");
const { gmailPassword, gmailUsername } = require(globals.configFile);


const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmailUsername,
      pass: gmailPassword
    }
});

function sendEmail(recipient, token) {
    return transporter.sendMail({
        replyTo: "noreply@noreply",
        to: recipient,
        subject: 'Verification token for the UBC CTF Discord',
        text: token,
        html: `<code>${token}</code>`
    });
}

exports.sendEmail = sendEmail;