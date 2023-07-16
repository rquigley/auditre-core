export function generatePassword(
  length: number = 8,
  includeSymbols = true,
): string {
  let charset;
  if (includeSymbols) {
    charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  } else {
    charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  }
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function omit(obj: T, keysToOmit: K[]): Omit<T, K> {
  let result = { ...obj };
  keysToOmit.forEach((key) => {
    delete result[key];
  });
  return result;
}

const unsafeDbAttrs = ['id', 'orgId'];
export function clientSafe<T extends object>(obj: T): Omit<T, 'id' | 'orgId'> {
  return omit(obj, unsafeDbAttrs);
}
