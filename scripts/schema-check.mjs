// Minimal JSON Schema checker — zero deps by design (see validate.mjs).
// Implements only the keywords registry/schema/entry.schema.json uses. Any other
// keyword (or format) throws, so extending the schema without extending this checker
// fails loudly instead of being silently skipped.

const ANNOTATIONS = new Set(['$schema', '$id', 'title', 'description']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const FORMATS = {
  date: (s) => {
    if (!DATE_RE.test(s)) return false;
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  },
  uri: (s) => URL.canParse(s),
};

const TYPES = {
  string: (v) => typeof v === 'string',
  object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
  array: (v) => Array.isArray(v),
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Returns a list of human-readable violations (empty when `value` conforms).
export function checkSchema(schema, value, at = '') {
  const errors = [];
  const where = at || '/';
  const err = (msg) => errors.push(`${where}: ${msg}`);

  for (const [kw, arg] of Object.entries(schema)) {
    if (ANNOTATIONS.has(kw)) continue;
    switch (kw) {
      case 'type':
        if (!Object.hasOwn(TYPES, arg)) throw new Error(`schema-check: unsupported type "${arg}"`);
        if (!TYPES[arg](value)) err(`expected ${arg}`);
        break;
      case 'enum':
        if (!arg.some((v) => same(v, value))) err(`must be one of ${arg.map((v) => JSON.stringify(v)).join(', ')}`);
        break;
      case 'const':
        if (!same(arg, value)) err(`must equal ${JSON.stringify(arg)}`);
        break;
      case 'pattern':
        if (typeof value === 'string' && !new RegExp(arg).test(value)) err(`must match ${arg}`);
        break;
      case 'minLength':
        if (typeof value === 'string' && [...value].length < arg) err(`must be at least ${arg} characters`);
        break;
      case 'maxLength':
        if (typeof value === 'string' && [...value].length > arg) err(`must be at most ${arg} characters`);
        break;
      case 'format':
        if (!Object.hasOwn(FORMATS, arg)) throw new Error(`schema-check: unsupported format "${arg}"`);
        if (typeof value === 'string' && !FORMATS[arg](value)) err(`must be a valid ${arg}`);
        break;
      case 'minItems':
        if (Array.isArray(value) && value.length < arg) err(`must have at least ${arg} item(s)`);
        break;
      case 'uniqueItems':
        if (arg && Array.isArray(value) && new Set(value.map((v) => JSON.stringify(v))).size !== value.length)
          err('items must be unique');
        break;
      case 'items':
        if (Array.isArray(value)) value.forEach((item, i) => errors.push(...checkSchema(arg, item, `${at}/${i}`)));
        break;
      case 'required':
        if (TYPES.object(value)) {
          for (const key of arg) if (!Object.hasOwn(value, key)) err(`required property "${key}" is missing`);
        }
        break;
      case 'properties':
        if (TYPES.object(value)) {
          for (const [key, sub] of Object.entries(arg)) {
            if (Object.hasOwn(value, key)) errors.push(...checkSchema(sub, value[key], `${at}/${key}`));
          }
        }
        break;
      case 'additionalProperties':
        if (arg !== false) throw new Error('schema-check: only additionalProperties:false is supported');
        if (TYPES.object(value)) {
          for (const key of Object.keys(value)) {
            if (!Object.hasOwn(schema.properties ?? {}, key)) err(`unexpected property "${key}"`);
          }
        }
        break;
      case 'allOf':
        for (const sub of arg) errors.push(...checkSchema(sub, value, at));
        break;
      case 'if':
        // Handled together with `then` below; `else` is not supported.
        break;
      case 'then':
        if (!schema.if) throw new Error('schema-check: "then" without "if"');
        if (checkSchema(schema.if, value, at).length === 0) errors.push(...checkSchema(arg, value, at));
        break;
      default:
        throw new Error(`schema-check: unsupported schema keyword "${kw}"`);
    }
  }
  return errors;
}
