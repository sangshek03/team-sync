import nodemailer from 'nodemailer';

class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'vidyaleap.i4c@gmail.com',
        pass: 'elaw nqdm inmi pfbe',
      },
    });
  }

  async sendInviteEmail(
    email: string,
    name: string,
    password: string,
    role: string,
    token: string
  ) {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/invite/accept?token=${token}&email=${email}&password=${password}`;

    const mailOptions = {
      from: 'vidyaleap.i4c@gmail.com',
      to: email,
      subject: "You're Invited!",
      html: `
        <p>Hello ${name},</p>
        <p>You've been invited as <b>${role}</b>.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${password}</p>
        <a href="${loginUrl}">Click here to login</a> (Valid 24 hrs)
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}

export const emailService = new EmailService();
