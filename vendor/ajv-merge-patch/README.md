# ajv-merge-patch

$merge and $patch keywords for [Ajv JSON-Schema validator](https://github.com/epoberezkin/ajv) to extend JSON-schemas

[![build](https://github.com/ajv-validator/ajv-merge-patch/actions/workflows/build.yml/badge.svg)](https://github.com/ajv-validator/ajv-merge-patch/actions/workflows/build.yml)
[![npm version](https://badge.fury.io/js/ajv-merge-patch.svg)](https://www.npmjs.com/package/ajv-merge-patch)
[![Coverage Status](https://coveralls.io/repos/github/epoberezkin/ajv-merge-patch/badge.svg?branch=master)](https://coveralls.io/github/epoberezkin/ajv-merge-patch?branch=master)


## Problem solved

The keywords `$merge` and `$patch` allow to extend the JSON-schemas using patches in the format [JSON Merge Patch (RFC 7396)](https://tools.ietf.org/html/rfc7396) or [JSON Patch (RFC 6902)](https://tools.ietf.org/html/rfc6902).


Schema extension is necessary if you want to add additional properties to the recursive schema (e.g. meta-schema). Consider this example:

Original schema:

```json
{
  "id": "mySchema.json#",
  "type": "object",
  "properties": {
    "foo": { "type": "string" },
    "bar": { "$ref": "#" }
  },
  "additionalProperties": false
}
```

Valid data: `{ foo: 'a' }`, `{ foo: 'a', bar: { foo: 'b' } }` etc.

If you want to define schema that would allow more properties, the only way to do it without `$merge` or `$patch` keywords is to copy-paste and edit the original schema.

Using `$merge` keyword you can create an extended schema in this way:

```json
{
  "id": "mySchemaExtended.json#",
  "$merge": {
    "source": { "$ref": "mySchema.json#" },
    "with": {
      "properties": {
        "baz": { "type": "number" }
      }
    }
  }
}
```

Valid data: `{ foo: 'a', baz: 1 }`, `{ foo: 'a', baz: 1, bar: { foo: 'b', baz: 2 } }`, etc.

`$merge` is implemented as a [custom macro keyword](https://github.com/epoberezkin/ajv/blob/master/CUSTOM.md#define-keyword-with-macro-function) using [json-merge-patch](https://github.com/pierreinglebert/json-merge-patch) package.


The same schema extension using `$patch` keyword:

```json
{
  "id": "mySchemaExtended.json#",
  "$patch": {
    "source": { "$ref": "mySchema.json#" },
    "with": [
      {
        "op": "add",
        "path": "/properties/baz",
        "value": { "type": "number" }
      }
    ]
  }
}
```

`$patch` is implemented as a [custom macro keyword](https://github.com/epoberezkin/ajv/blob/master/CUSTOM.md#define-keyword-with-macro-function) using [fast-json-patch](https://github.com/Starcounter-Jack/JSON-Patch) package.


In the majority of cases `$merge` format is easier to understand and to maintain. `$patch` can be used for extensions and changes that cannot be expressed using `$merge`, e.g. [Adding an array value](https://tools.ietf.org/html/rfc6902#page-18).

`with` property in keywords can also be a reference to a part of some schema, in which case the resolved value will be used rather than the actual object with property `$ref`.

__Please note__:

1. In case the `source` schema or the patch in `with` keyword use `$ref`, they won't take into account the resolution scope for their internal $refs defined by the parent objects - they will be used as separate objects.
2. `$ref` in both `source` schema and `with` patch take into account current $ref resolution scope (from version 2.0.0).


See also:
- [v5 proposal](https://github.com/daveclayton/json-schema-validator/wiki/v5:-merge)
- [$merge and $patch tests](https://github.com/epoberezkin/ajv-merge-patch/blob/master/spec)
- [discussion in JSON-Schema-Org](https://github.com/json-schema-org/json-schema-spec/issues/15)


## Usage with Ajv

These keywords are compatible with Ajv version >=5.1.0-beta.0.

To add these keywords to Ajv instance:

```javascript
var Ajv = require('ajv');
var ajv = new Ajv();
require('ajv-merge-patch')(ajv);
```

## Using in the browser

You can include these keywords in your code using browserify.

To include only `$merge` keyword:

```javascript
require('ajv-merge-patch/keywords/merge')(ajv);
```

To include only `$patch` keyword:

```javascript
require('ajv-merge-patch/keywords/patch')(ajv);
```

## License

[MIT](https://github.com/epoberezkin/ajv-merge-patch/blob/master/LICENSE)
