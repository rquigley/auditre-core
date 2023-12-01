import { normalizeRequestData } from '../request-data';

import type { DataObj } from '../request-data';

// TODO: these are broken since we're now doing validation against
// requestTypes in normalizeRequestData.
describe('normalizeRequestData', () => {
  const defaultValues = {
    foo: 'default foo value',
    bar: 'default bar value',
    baz: 'default baz value',
  };

  it('should return default values when no data is provided', () => {
    const data: Array<DataObj> = [];
    const { data: normalizedData } = normalizeRequestData(
      'some-rt',
      defaultValues,
      data,
    );
    expect(normalizedData).toEqual(defaultValues);
  });

  it('should return data when all fields are initialized', () => {
    const data: Array<DataObj> = [
      { requestId: 'foo', data: { value: 'foo value' } },
      { requestId: 'bar', data: { value: 'bar value' } },
      { requestId: 'baz', data: { value: 'baz value' } },
    ];
    const { data: normalizedData } = normalizeRequestData(
      'some-rt',
      defaultValues,
      data,
    );
    expect(normalizedData).toEqual({
      foo: 'foo value',
      bar: 'bar value',
      baz: 'baz value',
    });
  });

  it('should return default values for uninitialized fields', () => {
    const data: Array<DataObj> = [
      { requestId: 'foo', data: { value: 'foo value' } },
      { requestId: 'baz', data: { value: 'baz value' } },
    ];
    const { data: normalizedData, uninitializedFields } = normalizeRequestData(
      'some-rt',
      defaultValues,
      data,
    );
    expect(normalizedData).toEqual({
      foo: 'foo value',
      bar: 'default bar value',
      baz: 'baz value',
    });
    expect(uninitializedFields).toEqual(['bar']);
  });

  it('should return documentIds for fields with documentIds data', () => {
    const data: Array<DataObj> = [
      { requestId: 'foo', data: { value: 'foo value' } },
      {
        requestId: 'bar',
        data: { isDocuments: true, documentIds: ['doc1', 'doc2'] },
      },
      { requestId: 'baz', data: { value: 'baz value' } },
    ];
    const { data: normalizedData } = normalizeRequestData(
      'some-rt',
      defaultValues,
      data,
    );
    expect(normalizedData).toEqual({
      foo: 'foo value',
      bar: {
        isDocuments: true,
        documentIds: ['doc1', 'doc2'],
      },
      baz: 'baz value',
    });
  });

  // it('should return default values for fields with invalid data', () => {
  //   const data: Array<DataObj> = [
  //     { requestId: 'foo', data: { value: 'foo value' }, documentIds: [] },
  //     { requestId: 'bar', data: { value: 'bar value' }, documentIds: [] },
  //     { requestId: 'baz', data: 'invalid data', documentIds: [] },
  //   ];
  //   const { data: normalizedData, uninitializedFields } = normalizeRequestData(
  //     'some-rt',
  //     defaultValues,
  //     data,
  //   );
  //   expect(normalizedData).toEqual({
  //     foo: 'foo value',
  //     bar: 'bar value',
  //     baz: 'default baz value',
  //   });
  //   expect(uninitializedFields).toEqual(['baz']);
  // });
});
