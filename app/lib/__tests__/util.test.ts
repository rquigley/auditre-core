import { bucket, clientSafe, deepCopy, isFieldVisible, omit } from '../util';

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
    const input = { bar: 'sdf', orgId: 3, he: 'e' };
    const output = clientSafe(input);

    expect(output).toEqual({ bar: 'sdf', he: 'e' });
  });
});

describe('isFieldVisible', () => {
  it("Should show fields that aren't dependant", () => {
    const formConfig = {
      yep: {},
      nope: {},
    };
    expect(isFieldVisible('yep', [true], formConfig)).toEqual(true);
  });

  it('Should follow the truthiness of a parent', () => {
    const formConfig = {
      yep: {},
      nope: { dependsOn: 'yep' },
    };
    expect(isFieldVisible('nope', [true], formConfig)).toEqual(true);
    expect(isFieldVisible('nope', [false], formConfig)).toEqual(false);
  });

  it('Should follow the truthiness of multiple parents', () => {
    const formConfig = {
      foo: {},
      yep: { dependsOn: 'foo' },
      nope: { dependsOn: 'yep' },
    };
    expect(isFieldVisible('nope', [true, false], formConfig)).toEqual(false);
    expect(isFieldVisible('nope', [false, true], formConfig)).toEqual(false);
    expect(isFieldVisible('nope', [true, true], formConfig)).toEqual(true);
  });

  it('Should follow alt state if defined', () => {
    const formConfig = {
      yep: {},
      nope: { dependsOn: { field: 'yep', state: false } },
    };
    expect(isFieldVisible('nope', [true], formConfig)).toEqual(false);
    expect(isFieldVisible('nope', [false], formConfig)).toEqual(true);
  });

  it('Should follow alt state if defined true', () => {
    const formConfig = {
      yep: {},
      nope: { dependsOn: { field: 'yep', state: true } },
    };
    expect(isFieldVisible('nope', [true], formConfig)).toEqual(true);
    expect(isFieldVisible('nope', [false], formConfig)).toEqual(false);
  });

  it('Should follow deep alt state if defined', () => {
    const formConfig = {
      foo: {},
      yep: { dependsOn: 'foo' },
      nope: { dependsOn: { field: 'yep', state: false } },
    };
    expect(isFieldVisible('nope', [true, false], formConfig)).toEqual(false);
    expect(isFieldVisible('nope', [false, true], formConfig)).toEqual(true);
    expect(isFieldVisible('nope', [false, false], formConfig)).toEqual(false);
  });
});

describe('bucket', () => {
  it('should round robin bucket items into groups', () => {
    const inArr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const output = bucket(inArr, 3, 3);

    expect(output).toEqual([
      [1, 4, 7, 10],
      [2, 5, 8],
      [3, 6, 9],
    ]);
  });
  it('should not exceed maxNumBuckets', () => {
    const inArr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const output = bucket(inArr, 3, 1);

    expect(output).toEqual([inArr]);
  });
});
