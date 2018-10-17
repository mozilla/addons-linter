import { deepmerge, deepmergeWithComplexArrays } from 'schema/deepmerge';

describe('deepmerge', () => {
  it('merges simple arrays', () => {
    const base = { foo: [{ bar: 'BAR' }] };
    const add = { foo: [{ baz: 'BAZ' }] };
    expect(deepmerge(base, add)).toEqual({
      foo: [{ bar: 'BAR' }, { baz: 'BAZ' }],
    });
  });

  it('should work on arrays of nested objects', () => {
    const target = [{ key1: { subkey: 'one' } }];
    const src = [{ key1: { subkey: 'two' } }, { key2: { subkey: 'three' } }];
    const expected = [
      { key1: { subkey: 'two' } },
      { key2: { subkey: 'three' } },
      { key1: { subkey: 'one' } },
    ];
    expect(deepmerge(src, target)).toEqual(expected);
  });

  it('should add nested object in target', () => {
    const src = {
      b: {
        c: {},
      },
    };

    const target = {
      a: {},
    };

    const expected = {
      a: {},
      b: {
        c: {},
      },
    };

    expect(deepmerge(target, src)).toEqual(expected);
  });

  it('should replace object with simple key in target', () => {
    const src = { key1: 'value1' };
    const target = {
      key1: {
        subkey1: 'subvalue1',
        subkey2: 'subvalue2',
      },
      key2: 'value2',
    };

    const expected = { key1: 'value1', key2: 'value2' };

    expect(deepmerge(target, src)).toEqual(expected);
  });
});

describe('deepmergeWithComplexArrays', () => {
  it('merges complex arrays', () => {
    const base = { foo: [{ bar: 'BAR' }] };
    const add = { foo: [{ baz: 'BAZ' }] };
    expect(deepmergeWithComplexArrays(base, add)).toEqual({
      foo: [{ bar: 'BAR', baz: 'BAZ' }],
    });
  });

  it('should work on arrays of nested objects', () => {
    const target = [{ key1: { subkey: 'one' } }];
    const src = [{ key1: { subkey: 'two' } }, { key2: { subkey: 'three' } }];
    const expected = [
      { key1: { subkey: 'one' } },
      { key2: { subkey: 'three' } },
    ];
    expect(deepmergeWithComplexArrays(src, target)).toEqual(expected);
  });

  it('should add nested object in target', () => {
    const src = {
      b: {
        c: {},
      },
    };

    const target = {
      a: {},
    };

    const expected = {
      a: {},
      b: {
        c: {},
      },
    };

    expect(deepmergeWithComplexArrays(target, src)).toEqual(expected);
  });

  it('should replace object with simple key in target', () => {
    const src = { key1: 'value1' };
    const target = {
      key1: {
        subkey1: 'subvalue1',
        subkey2: 'subvalue2',
      },
      key2: 'value2',
    };

    const expected = { key1: 'value1', key2: 'value2' };

    expect(deepmergeWithComplexArrays(target, src)).toEqual(expected);
  });
});
