export function classNames(...classes: string[]): string {
  return classes.filter(Boolean).join(' ');
}

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
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((_) => setTimeout(_, ms));
}

export function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}
type AnyObject = {
  [key: string]: any;
};

export function omit(
  obj: AnyObject[] | AnyObject,
  keysToOmit: string[],
): AnyObject[] | AnyObject {
  if (Array.isArray(obj)) {
    //@ts-ignore
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

const unsafeDbAttrs = ['orgId'];
export function clientSafe(
  obj: AnyObject[] | AnyObject,
  keys = unsafeDbAttrs,
): AnyObject[] | AnyObject {
  return omit(obj, keys);
}

export function head(str: string, numLines: number): string {
  const lines = str.split('\n');
  return lines.slice(0, numLines).join('\n');
}

export function isKey<T extends object>(x: T, k: PropertyKey): k is keyof T {
  return k in x;
}

export function isFieldVisible(
  field: string,
  isVisibleA: Array<boolean>,
  formConfig: any,
) {
  let isVisible = true;

  for (let n = 0, len = isVisibleA.length; n < len; n++) {
    const parentVal = isVisibleA.shift();
    let fieldConfig = formConfig[field];
    if (
      typeof fieldConfig.dependsOn === 'object' &&
      fieldConfig.dependsOn.state === false
    ) {
      isVisible = !parentVal;
    } else if (parentVal === false) {
      isVisible = false;
    }
    if (typeof fieldConfig.dependsOn === 'object') {
      field = fieldConfig.dependsOn.field;
    } else if (fieldConfig.dependsOn) {
      field = fieldConfig.dependsOn;
    }
  }
  return isVisible;
}

export function ucFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function pWithResolvers() {
  let _resolve;
  let _reject;
  const p = new Promise((resolve, reject) => {
    _resolve = resolve;
    _reject = reject;
  });
  return { resolve: _resolve, reject: _reject, promise: p };
}

export function humanCase(input: string): string {
  const words = input.toLowerCase().split('_');
  return words
    .map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(' ');
}

export function camelToKebab(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function kebabToCamel(input: string): string {
  return input
    .replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    .replaceAll('-', '');
}
