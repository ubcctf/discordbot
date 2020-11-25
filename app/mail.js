"use strict";

const nodemailer = require("nodemailer");
const { gmailPassword, gmailUsername } = require("./credentials.json");
const { log } = require("./utils");


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