import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
    try {
        const data = await resend.emails.send({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html
        });

        return data;
    } catch (error) {
        console.error("Email error:", error);
        throw new Error("Error sending email");
    }
};