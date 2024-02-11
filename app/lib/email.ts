import { SendEmailCommand } from '@aws-sdk/client-ses';
import * as Sentry from '@sentry/nextjs';
import { SendVerificationRequestParams } from 'next-auth/providers';

import { getSESClient } from './aws';

export async function sendVerificationRequest(
  params: SendVerificationRequestParams,
) {
  return await sendEmail({
    from: 'noreply@auditre.co',
    to: params.identifier,
    subject: 'Your login link',
    html: `<div><a href="${params.url}">Login</a></div>`,
  });
}

async function sendEmail({
  to,
  from,
  subject,
  html,
}: {
  to: string;
  from: string;
  subject: string;
  html: string;
}) {
  const command = new SendEmailCommand({
    Source: from,
    // ReplyToAddresses: [
    //   /* more items */
    // ],
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: html,
        },
        Text: {
          Charset: 'UTF-8',
          Data: html,
        },
      },
    },
  });

  try {
    const client = await getSESClient();
    await client.send(command);
  } catch (e) {
    Sentry.captureException(e);
  }
}
