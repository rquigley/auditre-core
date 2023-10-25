import { normalizeRequestData } from '../request-data';

import type { DataObj } from '../request-data';

describe('normalizeRequestData', () => {
  const defaultValues = {
    foo: 'default foo value',
    bar: 'default bar value',
    baz: 'default baz value',
  };

  it('should return default values when no data is provided', () => {
    const data: Array<DataObj> = [];
    const { data: normalizedData } = normalizeRequestData(defaultValues, data);
    expect(normalizedData).toEqual(defaultValues);
  });

  it('should return data when all fields are initialized', () => {
    const data: Array<DataObj> = [
      { requestId: 'foo', data: { value: 'foo value' }, documentId: null },
      { requestId: 'bar', data: null, documentId: 'bar document id' },
      { requestId: 'baz', data: { value: 'baz value' }, documentId: null },
    ];
    const { data: normalizedData } = normalizeRequestData(defaultValues, data);
    expect(normalizedData).toEqual({
      foo: 'foo value',
      bar: 'bar document id',
      baz: 'baz value',
    });
  });

  it('should return default values for uninitialized fields', () => {
    const data: Array<DataObj> = [
      { requestId: 'foo', data: { value: 'foo value' }, documentId: null },
      { requestId: 'baz', data: { value: 'baz value' }, documentId: null },
    ];
    const { data: normalizedData, uninitializedFields } = normalizeRequestData(
      defaultValues,
      data,
    );
    expect(normalizedData).toEqual({
      bar: 'default bar value',
      baz: 'baz value',
      foo: 'foo value',
    });
    expect(uninitializedFields).toEqual(['bar']);
  });

  it('should return documentId for fields with documentId data', () => {
    const data: Array<DataObj> = [
      { requestId: 'foo', data: { value: 'foo value' }, documentId: null },
      { requestId: 'bar', data: null, documentId: 'document id' },
      { requestId: 'baz', data: { value: 'baz value' }, documentId: null },
    ];
    const { data: normalizedData } = normalizeRequestData(defaultValues, data);
    expect(normalizedData).toEqual({
      foo: 'foo value',
      bar: 'document id',
      baz: 'baz value',
    });
  });

  // TODO: I don't think we care about this, currently...
  //   it('should return default values for fields with invalid data', () => {
  //     const data: Array<DataObj> = [
  //       { requestId: 'foo', data: { value: 'foo value' }, documentId: null },
  //       //   { requestId: 'bar', data: 'invalid data' },
  //       { requestId: 'baz', data: { value: 'baz value' }, documentId: null },
  //     ];
  //     const { data: normalizedData, uninitializedFields } = normalizeRequestData(
  //       defaultValues,
  //       data,
  //     );
  //     expect(normalizedData).toEqual({
  //       foo: 'foo value',
  //       bar: 'default bar value',
  //       baz: 'baz value',
  //     });
  //     expect(uninitializedFields).toEqual(['bar']);
  //   });
});
