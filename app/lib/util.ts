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
    // @ts-expect-error
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
  let currentField = field;

  for (let n = 0, len = isVisibleA.length; n < len; n++) {
    const parentVal = isVisibleA[n];
    const fieldConfig = formConfig[currentField];
    if (
      typeof fieldConfig.dependsOn === 'object' &&
      fieldConfig.dependsOn.state === false
    ) {
      isVisible = !parentVal;
    } else if (parentVal === false) {
      isVisible = false;
    }
    currentField = fieldConfig.dependsOn
      ? typeof fieldConfig.dependsOn === 'object'
        ? fieldConfig.dependsOn.field
        : fieldConfig.dependsOn
      : currentField;
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
  let result = '';
  let shouldCapitalize = false;
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '-') {
      shouldCapitalize = true;
    } else {
      result += shouldCapitalize ? input[i].toUpperCase() : input[i];
      shouldCapitalize = false;
    }
  }
  return result;
}

export function kebabToHuman(input: string): string {
  let lowerCaseInput = input.toLowerCase();
  let capitalized =
    lowerCaseInput.charAt(0).toUpperCase() + lowerCaseInput.slice(1);
  return capitalized.replace(/-/g, ' ');
}

export function getLastDayOfMonth(month: string, year: string) {
  const numericalYear = parseInt(year, 10);
  const isLeapYear =
    (numericalYear % 4 === 0 && numericalYear % 100 !== 0) ||
    numericalYear % 400 === 0;
  switch (month) {
    case '1':
    case '3':
    case '5':
    case '7':
    case '8':
    case '10':
    case '12':
      return '31';
    case '4':
    case '6':
    case '9':
    case '11':
      return '30';
    case '2':
      return isLeapYear ? '29' : '28';
    default:
      return 'MISSING';
  }
}

export function getMonthName(month: string) {
  switch (month) {
    case '1':
      return 'January';
    case '2':
      return 'February';
    case '3':
      return 'March';
    case '4':
      return 'April';
    case '5':
      return 'May';
    case '6':
      return 'June';
    case '7':
      return 'July';
    case '8':
      return 'August';
    case '9':
      return 'September';
    case '10':
      return 'October';
    case '11':
      return 'November';
    case '12':
      return 'December';
    default:
      return 'MISSING';
  }
}
