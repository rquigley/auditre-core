import { SendRawEmailCommand } from '@aws-sdk/client-ses';
import * as Sentry from '@sentry/nextjs';
import dedent from 'dedent';
import { NodemailerConfig } from 'next-auth/providers/nodemailer';
import { uuidv7 } from 'uuidv7';

import { getByEmail } from '@/controllers/user';
import { getSESClient } from './aws';

export async function sendVerificationRequest(
  params: Parameters<NodemailerConfig['sendVerificationRequest']>[0],
) {
  const user = await getByEmail(params.identifier);
  if (!user) {
    throw new Error('No user found');
  }
  // const isVerification = user.emailVerified === null;

  const subject = `AuditRe confirmation code: ${params.token}`;
  const body = `
    <h1>Confirm your email address</h1>
    <p>Your confirmation code is below. Enter it in your open browser window to finish your signup.</p>

    <p style="font-size: 24px; font-weight: bold;">${params.token}</p>

    <p>If you didnt request this code, you can safely ignore this email. There is nothing to worry about.</p>
  `;
  const plainText = `
    Confirm your email address
    Your confirmation code is below. Enter it in your open browser window to finish your signup:

    ${params.token}

    If you didnt request this code, you can safely ignore this email. There is nothing to worry about.
  `;

  const html = `
    <div>
      ${body}
    </div>
    <div>
      &copy;AuditRe, Inc.<br>
      228 Park Ave South, PMB 71384, New York NY 10003-1502
    </div>
  `;

  return await sendEmail({
    from: 'AuditRe <noreply@auditre.co>',
    to: params.identifier,
    subject,
    html,
    plainText,
  });
}

export async function sendEmail({
  to,
  from = 'AuditRe <noreply@auditre.co>',
  subject,
  html,
  plainText,
  allowThreading = false,
}: {
  to: string;
  from?: string;
  subject: string;
  html: string;
  plainText?: string;
  allowThreading?: boolean;
}) {
  const boundary = '----=_Part_701508.113845573989152';
  if (!plainText) {
    plainText = textFromHtml(html);
  }
  const rawMessage = dedent`
    From: ${from}
    To: ${to}
    Subject: ${subject}
    ${
      allowThreading
        ? ''
        : `References: <${uuidv7()}@auditre.co>
    `
    }MIME-Version: 1.0
    Content-Type: multipart/alternative; boundary="${boundary}"

    --${boundary}
    Content-Type: text/plain; charset="UTF-8"
    Content-Transfer-Encoding: 7bit

    ${plainText}

    --${boundary}
    Content-Type: text/html; charset="UTF-8"
    Content-Transfer-Encoding: 7bit

    ${html}

    --${boundary}--
  `;

  const encoder = new TextEncoder();
  const uintArrayValue = encoder.encode(rawMessage);
  const command = new SendRawEmailCommand({
    RawMessage: {
      Data: uintArrayValue,
    },
  });

  try {
    const client = await getSESClient();
    await client.send(command);
  } catch (e) {
    Sentry.captureException(e);
  }
}

function textFromHtml(html: string): string {
  let text = html.replace(/<\/?[^>]+(>|$)/g, '');

  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');

  return text;
}
