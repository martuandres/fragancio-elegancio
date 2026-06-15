import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function enviarEmail(para: string, asunto: string, cuerpo: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: para,
      subject: asunto,
      text: cuerpo,
    });
  } catch (err) {
    console.error("Error enviando email a", para, err);
  }
}
