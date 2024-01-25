import {
  bucket,
  extractLinesContaining,
  isFieldVisible,
  isSameYear,
} from '../util';

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

describe('extractLinesContaining', () => {
  it(`should only extract lines we're interested in`, () => {
    const input = 'How many\nCows\nDo you think\neat IN france\nwith\na spoon';
    const output = extractLinesContaining(input, ['cows', 'france']);

    expect(output).toEqual(['Cows', 'eat IN france']);
  });
});

describe('isSameYear', () => {
  it('should return false if date is not provided', () => {
    expect(isSameYear('2022', undefined)).toBe(false);
  });

  it('should return true if auditYear and the year of date (as a Date object) are the same', () => {
    expect(isSameYear('2022', new Date('2022-01-01'))).toBe(true);
  });

  it('should return false if auditYear and the year of date (as a Date object) are not the same', () => {
    expect(isSameYear('2021', new Date('2022-01-01'))).toBe(false);
  });

  it('should return true if auditYear and the year of date (as a string) are the same', () => {
    expect(isSameYear('2022', '2022-01-01')).toBe(true);
  });

  it('should return false if auditYear and the year of date (as a string) are not the same', () => {
    expect(isSameYear('2021', '2022-01-01')).toBe(false);
  });
});
