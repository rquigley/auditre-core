import { omit, deepCopy, clientSafe } from '../util';

describe('omit', () => {
  it('should prune specified keys from an object', () => {
    const input = { foo: 1, bar: 'sdf', yep: 'no', he: 'e' };
    const inputCopy = deepCopy(input);
    const keysToOmit = ['bar', 'he'];
    const output = omit(input, keysToOmit);

    expect(output).toEqual({ foo: 1, yep: 'no' });
    expect(input).toEqual(inputCopy);
  });

  it('should prune specified keys from array of objects', () => {
    const input = [
      { foo: 1, bar: 'sdf', yep: 'no', he: 'e' },
      { foo: 1, bar: 'sdf', yep: 'no', he: 'e' },
    ];
    const keysToOmit = ['bar', 'he'];
    const output = omit(input, keysToOmit);

    expect(output).toEqual([
      { foo: 1, yep: 'no' },
      { foo: 1, yep: 'no' },
    ]);
  });

  it('should prune specified keys from nested objects in an array', () => {
    const input = [
      {
        foo: { foo: 1, bar: 'sdf', yep: 'no', he: 'e' },
        bar: 'sdf',
        yep: 'no',
        he: 'e',
      },
      {
        foo: { foo: 1, bar: 'sdf', yep: 'no', he: 'e' },
        bar: 'sdf',
        yep: 'no',
        he: 'e',
      },
    ];
    const inputCopy = deepCopy(input);

    const keysToOmit = ['bar', 'he'];
    const output = omit(input, keysToOmit);

    expect(output).toEqual([
      { foo: { foo: 1, yep: 'no' }, yep: 'no' },
      { foo: { foo: 1, yep: 'no' }, yep: 'no' },
    ]);
    expect(input).toEqual(inputCopy);
  });
});

describe('clientSafe', () => {
  it('should prune default ids from an object', () => {
    const input = { id: 1, bar: 'sdf', orgId: 3, he: 'e' };
    const output = clientSafe(input);

    expect(output).toEqual({ bar: 'sdf', he: 'e' });
  });
});
