import { ERROR_VALUE } from './../../error';
import { toNumber } from './../../helper/number';

export const SYMBOL = '^';

export default function func(exp1, exp2) {
  const result = Math.pow(toNumber(exp1), toNumber(exp2));

  if (isNaN(result)) {
    throw Error(ERROR_VALUE);
  }

  return result;
}

func.SYMBOL = SYMBOL;
