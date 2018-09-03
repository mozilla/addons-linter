import merge from 'schema/deepmerge';

describe('deepmerge', () => {
  it('merges arrays', () => {
    const base = { foo: [{ bar: 'BAR' }] };
    const add = { foo: [{ baz: 'BAZ' }] };
    expect(merge(base, add)).toEqual({ foo: [{ bar: 'BAR', baz: 'BAZ' }] });
  });

  it('throws an error if you try to specify your own opts', () => {
    const base = { foo: [{ bar: 'BAR' }] };
    const add = { foo: [{ baz: 'BAZ' }] };
    expect(() => merge(base, add, { some: 'opts' })).toThrow(
      /use the deepmerge package directly/,
    );
  });
});
