import nodemailer from "nodemailer";
import { renderTemplate } from "./emailTemplates.js";

const DEFAULT_GMAIL_USER = "weatherinmail@gmail.com";

const resolveGmailUser = () => process.env.GMAIL_USER || DEFAULT_GMAIL_USER;

const createTransport = () => {
    if (!process.env.GMAIL_PASS) {
        throw new Error("Missing Gmail credentials for transporter");
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: resolveGmailUser(),
            pass: process.env.GMAIL_PASS,
        },
    });
};

const sendDailyWeatherEmail = async ({ recipient, weatherData }) => {
    const transporter = createTransport();

    const html = await renderTemplate("daily-weather", {
        ...weatherData,
        YEAR: new Date().getFullYear().toString(),
        UNSUBSCRIBE_LINK: weatherData.UNSUBSCRIBE_LINK ?? "https://weathermail.com/preferences",
    });

    const subjectCity = weatherData.CITY_NAME ?? "your city";
    const subjectDate = weatherData.DATE ?? new Date().toLocaleDateString();

    const mailOptions = {
        from: `WeatherMail <${resolveGmailUser()}>`,
        to: recipient,
        subject: `☀️ Today’s Weather for ${subjectCity} | ${subjectDate}`,
        html,
    };

    await transporter.sendMail(mailOptions);
    return { ok: true };
};

const sendWelcomeEmail = async ({ recipient, cityName }) => {
    const transporter = createTransport();

    const html = await renderTemplate("welcome", {
        CITY_NAME: cityName,
        YEAR: new Date().getFullYear().toString(),
        UNSUBSCRIBE_LINK: process.env.UNSUBSCRIBE_URL ?? "https://weathermail.com/preferences",
        LOGO_URL:
            process.env.WELCOME_LOGO_URL ??
            "https://raw.githubusercontent.com/Sarbeswarpanda04/Weather-mail/refs/heads/main/public/assets/images/emailheaderlogo.png",
    });

    const mailOptions = {
        from: `WeatherMail <${resolveGmailUser()}>`,
        to: recipient,
        subject: "🎉 You’re subscribed! Daily weather updates start tomorrow",
        html,
    };

    await transporter.sendMail(mailOptions);
    return { ok: true };
};

export { sendDailyWeatherEmail, sendWelcomeEmail };
