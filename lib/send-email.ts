import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

type Attachment = { filename: string; content: string; contentType: string };

export async function sendEmail(to: string, subject: string, html: string, attachments?: Attachment[]) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER / EMAIL_PASS missing in .env");
  }

  await transporter.sendMail({
    from: `"HireKarlo" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
}