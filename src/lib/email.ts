import nodemailer from "nodemailer";

interface EmailParams {
  firstName: string;
  lastName: string;
  date: string;
  time: string;
  service: string; // Service name
  barber: string; // Barber name
  email: string;
}

export const sendConfirmationEmail = async ({
  firstName,
  lastName,
  date,
  time,
  service,
  barber,
  email,
}: EmailParams) => {
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // e.g., 'Gmail'
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER!,
    to: email,
    subject: "Confirmación de Tu Reserva",
    html: `
      <p>Hola ${firstName} ${lastName},</p>
      <p>Tu reserva ha sido confirmada para el día ${date} a las ${time}.</p>
      <p><strong>Servicio:</strong> ${service}</p>
      <p><strong>Barbero:</strong> ${barber}</p>
      <p>Si necesitas cambiar o cancelar tu cita, por favor contáctanos con al menos 24 horas de anticipación.</p>
      <p>¡Esperamos verte pronto!</p>
      <p>Saludos,<br />Equipo de Barberia</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
