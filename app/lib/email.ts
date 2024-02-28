import { SendRawEmailCommand } from '@aws-sdk/client-ses';
import * as Sentry from '@sentry/nextjs';
import dedent from 'dedent';
import { SendVerificationRequestParams } from 'next-auth/providers';
import { uuidv7 } from 'uuidv7';

import { getByEmail } from '@/controllers/user';
import { getSESClient } from './aws';

export async function sendVerificationRequest(
  params: SendVerificationRequestParams,
) {
  const user = await getByEmail(params.identifier);
  if (!user) {
    throw new Error('No user found');
  }
  const isVerification = user.emailVerified === null;
  const subject = isVerification ? 'Verify your email' : 'Your login link';
  return await sendEmail({
    from: 'AuditRe <noreply@auditre.co>',
    to: params.identifier,
    subject,
    html: `<div><a href="${params.url}">Login</a></div>`,
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
    ${allowThreading ? '' : `References: <${uuidv7()}@auditre.co>`}MIME-Version: 1.0
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
