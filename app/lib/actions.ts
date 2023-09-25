'use server';

import { cookies } from 'next/headers';

const POST_AUTH_URL = 'post-login-url';
export async function setPostAuthUrl(url: string) {
  cookies().set(POST_AUTH_URL, url, {
    httpOnly: true,
    sameSite: 'strict',
  });
}

export async function getPostAuthUrl() {
  const url = cookies().get(POST_AUTH_URL)?.value || '/';
  // TODO: currently seeing a bug where this cannot be called unless in a server action
  // but this is... a server action.
  //cookies().delete(POST_AUTH_URL);
  return url;
}

export async function deletePostAuthUrl() {
  cookies().delete(POST_AUTH_URL);
}
