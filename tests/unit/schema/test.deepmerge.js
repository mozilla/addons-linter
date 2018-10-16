import merge from 'schema/deepmerge';

describe('deepmerge', () => {
  it('merges arrays', () => {
    const base = { foo: [{ bar: 'BAR' }] };
    const add = { foo: [{ baz: 'BAZ' }] };
    expect(merge(base, add)).toEqual({ foo: [{ bar: 'BAR', baz: 'BAZ' }] });
  });
});
