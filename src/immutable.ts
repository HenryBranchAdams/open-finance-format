function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        return true;
      }
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function cloneJson(value: unknown, ancestors: Set<object>): unknown {
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (hasLoneSurrogate(value)) {
      throw new TypeError("Portable JSON strings must contain only Unicode scalar values");
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Portable JSON numbers must be finite");
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError(`Unsupported portable JSON value type: ${typeof value}`);
  }
  if (ancestors.has(value)) {
    throw new TypeError("Portable JSON values must not contain cycles");
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const clone = value.map((entry) => cloneJson(entry, ancestors));
      return Object.freeze(clone);
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Portable JSON objects must use a plain or null prototype");
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError("Portable JSON objects must not contain symbol keys");
    }

    const clone = Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        if (hasLoneSurrogate(key)) {
          throw new TypeError("Portable JSON object keys must contain only Unicode scalar values");
        }
        return [key, cloneJson(entry, ancestors)];
      }),
    );
    return Object.freeze(clone);
  } finally {
    ancestors.delete(value);
  }
}

export function cloneAndDeepFreezeJson<T>(value: T): T {
  return cloneJson(value, new Set<object>()) as T;
}
