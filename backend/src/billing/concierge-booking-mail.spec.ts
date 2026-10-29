import * as nodemailer from 'nodemailer';
import { sendConciergeHoursBooked } from './concierge-booking-mail';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('Concierge booking email', () => {
  it('escapes a calendar link and keeps the subject on one line', async () => {
    const sendMail = jest.fn(async (_mail: { html: string; subject: string }) => ({}));
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    process.env.SMTP_USER = 'mailer@jobocate.test';
    process.env.SMTP_PASSWORD = 'secret';
    await sendConciergeHoursBooked('student@example.com', {
      audience: 'candidate',
      minutes: 30,
      durationUrl: 'https://calendly.com/intro?q=" onclick="alert(1)',
      coachName: 'Coach\r\nBcc: evil@example.com',
      candidateName: 'Sam',
    });
    const mail = sendMail.mock.calls[0][0];
    expect(mail.html).toContain('href="https://calendly.com/intro?q=&quot; onclick=&quot;alert(1)"');
    expect(mail.html).not.toContain('onclick="alert(1)"');
    expect(mail.subject).toBe('30 min booked with Coach Bcc: evil@example.com');
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });
});
