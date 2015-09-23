import { foo } from 'foo';
import { join } from 'path';


export class Foo {

  constructor(foo_=foo, join_=join) {
    this.bar = 'test';
    foo_();
    join_('foo', 'bar');
  }

}
