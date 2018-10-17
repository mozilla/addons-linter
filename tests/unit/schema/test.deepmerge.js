import { deepmerge, deepmergeWithComplexArrays } from 'schema/deepmerge';

describe('deepmerge', () => {
  it('merges complex arrays', () => {
    const base = { foo: [{ bar: 'BAR' }] };
    const add = { foo: [{ baz: 'BAZ' }] };
    expect(deepmergeWithComplexArrays(base, add)).toEqual({
      foo: [{ bar: 'BAR', baz: 'BAZ' }],
    });
  });
  it('merges simple arrays', () => {
    const base = { foo: [{ bar: 'BAR' }] };
    const add = { foo: [{ baz: 'BAZ' }] };
    expect(deepmerge(base, add)).toEqual({
      foo: [{ bar: 'BAR' }, { baz: 'BAZ' }],
    });
  });
});
