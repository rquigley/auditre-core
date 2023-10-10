import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

import type { APIGatewayProxyHandler } from 'aws-lambda';

const client = new DynamoDBClient({ region: 'us-east-2' });
const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event) => {
  const email = JSON.parse(event?.body || '')?.email;
  const timestamp = new Date().toISOString();
  const sourceIp = event['requestContext']['identity']['sourceIp'];
  const userAgent = event['requestContext']['identity']['userAgent'];

  const params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      email,
      timestamp,
      sourceIp,
      userAgent,
    },
  };

  try {
    await docClient.send(new PutCommand(params));

    const slackWebhookUrl =
      'https://hooks.slack.com/services/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';

    const payload = {
      text: `New email address stored: ${email}. Timestamp: ${timestamp}`,
    };
    await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Data stored successfully!' }),
    };
  } catch (error) {
    const message =
      error instanceof Error ? JSON.stringify(error.message) : 'Unknown error';
    return {
      statusCode: 500,
      body: message,
    };
  }
};
