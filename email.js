import nodemailer from 'nodemailer';
import env from './config/env.js';
import logger from './logger.js';

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

export const sendEmail = async (options) => {
  const mailOptions = {
    from: `"E-commerce Shop" <noreply@ecommerce.com>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${options.email}`);
  } catch (err) {
    logger.error(`Email sending failed to ${options.email}:`, err);
  }
};
