import type { JsonValue } from "../types.ts";

export class JcsSerializationError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = "JcsSerializationError";
  }
}

function assertUnicodeScalarString(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new JcsSerializationError("JCS cannot serialize a lone high surrogate");
      }
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new JcsSerializationError("JCS cannot serialize a lone low surrogate");
    }
  }
}

function serialize(value: unknown): string {
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    assertUnicodeScalarString(value);
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new JcsSerializationError("JCS numbers must be finite IEEE-754 values");
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const serialized: string[] = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) {
        throw new JcsSerializationError("JCS arrays must not be sparse");
      }
      serialized.push(serialize(value[index]));
    }
    return `[${serialized.join(",")}]`;
  }

  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new JcsSerializationError("JCS accepts only plain JSON objects");
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new JcsSerializationError("JCS objects must not contain symbol keys");
    }

    const object = value as Record<string, unknown>;
    const members = Object.keys(object)
      .sort()
      .map((key) => {
        assertUnicodeScalarString(key);
        return `${JSON.stringify(key)}:${serialize(object[key])}`;
      });
    return `{${members.join(",")}}`;
  }

  throw new JcsSerializationError(`Unsupported JSON value type: ${typeof value}`);
}

export function canonicalizeJsonText(value: unknown): string {
  return serialize(value);
}

export function canonicalizeJson(value: JsonValue | unknown): Uint8Array {
  return new TextEncoder().encode(canonicalizeJsonText(value));
}
