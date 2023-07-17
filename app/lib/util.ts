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

type AnyObject = {
  [key: string]: any;
};

export function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function omit(
  obj: any[] | AnyObject,
  keysToOmit: string[],
): any[] | AnyObject {
  if (Array.isArray(obj)) {
    return obj.map((item) => omit(item, keysToOmit));
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj: AnyObject = {};
    Object.keys(obj)
      .filter((key) => !keysToOmit.includes(key))
      .forEach((key) => {
        newObj[key] = omit(obj[key], keysToOmit);
      });
    return newObj;
  }
  return obj;
}

const unsafeDbAttrs = ['id', 'orgId'];

export function clientSafe(obj: any[] | AnyObject, keys = unsafeDbAttrs) {
  return omit(obj, keys);
}
