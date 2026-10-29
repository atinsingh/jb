import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { conciergeDurationLabel } from './concierge-fee';

const logger = new Logger('ConciergeBookingMail');
const text = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\r\n]+/g, ' ');
const attr = (value: string) => text(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

export async function sendConciergeHoursBooked(to: string, details: {
  audience: 'candidate' | 'concierge';
  minutes: number;
  durationUrl: string;
  coachName: string;
  candidateName: string;
}): Promise<boolean> {
  const length = conciergeDurationLabel(details.minutes);
  const link = `<p><a href="${attr(details.durationUrl)}">Book this ${length} session</a></p>`;
  const intro = details.audience === 'candidate'
    ? `You paid for ${length} with ${text(details.coachName)}. The coach is paid monthly. Open the link to pick a time on their calendar.`
    : `${text(details.candidateName)} paid for ${length} with you. You are paid monthly, after the session is earned. They will book it on the calendar link for that length.`;
  const subject = details.audience === 'candidate' ? `${length} booked with ${oneLine(details.coachName)}` : `${oneLine(details.candidateName)} booked ${length}`;
  return sendHtml(to, subject, `<p>${intro}</p>${link}<p>Messages are open in Jobocate now that this session is paid. Jobocate keeps its fee, and the coach is paid on the 2nd of the month.</p>`);
}

export async function sendConciergeSessionNotice(to: string, details: {
  audience: 'candidate' | 'concierge';
  kind: 'scheduled' | 'rescheduled' | 'canceled' | 'missed';
  when: string;
  otherName: string;
}): Promise<boolean> {
  const subject = oneLine(`${details.kind === 'scheduled' ? 'Booked' : details.kind === 'rescheduled' ? 'Rescheduled' : details.kind === 'canceled' ? 'Canceled' : 'Missed'}: ${details.when} with ${details.otherName}`);
  const line = details.kind === 'missed'
    ? `${text(details.otherName)} reported that the session at ${text(details.when)} did not happen. The payment was returned.`
    : details.kind === 'canceled'
      ? `The session at ${text(details.when)} with ${text(details.otherName)} was canceled. The payment was returned.`
      : `The session with ${text(details.otherName)} is ${details.kind} for ${text(details.when)}. Change it from the calendar link in the confirmation, not from a second booking.`;
  return sendHtml(to, subject, `<p>${line}</p>`);
}

export async function sendConciergePayoutNotice(to: string, details: { totalCents: number; monthLabel: string }): Promise<boolean> {
  const total = (details.totalCents / 100).toFixed(2);
  return sendHtml(to, oneLine(`Concierge payout for ${details.monthLabel}`), `<p>Jobocate sent you CA$${text(total)} for sessions earned before ${text(details.monthLabel)}.</p>`);
}

async function sendHtml(to: string, subject: string, body: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    logger.warn(`Concierge booking email skipped for ${to}: SMTP is not configured`);
    return false;
  }
  const from = process.env.SMTP_FROM
    ? (process.env.SMTP_FROM.includes('<') ? process.env.SMTP_FROM : `"Jobocate" <${process.env.SMTP_FROM}>`)
    : `"Jobocate" <${process.env.SMTP_USER}>`;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  await transporter.sendMail({
    from,
    to,
    subject,
    html: `<div style="max-width:640px;margin:0 auto;">${body}</div>`,
  });
  logger.log(`Concierge booking email sent to ${to}`);
  return true;
}
