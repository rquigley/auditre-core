// See https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#overwriting-encryption-keys-advanced
// https://github.com/vercel/next.js/blob/4a6d3675f29fd9c7780c074bf7798e85648db069/packages/next/src/server/app-render/action-encryption-utils.ts#L177
//
// Drop the generated key into https://github.com/auditrehq/core/settings/secrets/actions
// This is added at buildtime to encrypt the server actions. We want to preserve it in order to
// keep server actions working between deploys

export function arrayBufferToString(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

  // @anonrig: V8 has a limit of 65535 arguments in a function.
  // For len < 65535, this is faster.
  // https://github.com/vercel/next.js/pull/56377#pullrequestreview-1656181623
  if (len < 65535) {
    return String.fromCharCode.apply(null, bytes as unknown as number[]);
  }

  let binary = '';
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

async function main() {
  let key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  );

  const exported = await crypto.subtle.exportKey('raw', key);
  const b64 = btoa(arrayBufferToString(exported));

  console.log(`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${b64}`);
}

main().catch(console.log);
