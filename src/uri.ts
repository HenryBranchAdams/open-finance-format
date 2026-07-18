const SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*$/u;
const HEX_DIGIT = /^[0-9A-Fa-f]$/u;
const URI_ASCII_CHARACTER = /^[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=]$/u;
const REG_NAME_CHARACTER = /^[A-Za-z0-9\-._~!$&'()*+,;=]$/u;
const IP_LITERAL_CHARACTER = /^[A-Za-z0-9\-._~!$&'()*+,;=:]$/u;

function hasValidEscapesAndCharacters(
  value: string,
  character: RegExp,
): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];
    if (current === "%") {
      if (
        !HEX_DIGIT.test(value[index + 1] ?? "") ||
        !HEX_DIGIT.test(value[index + 2] ?? "")
      ) {
        return false;
      }
      index += 2;
      continue;
    }
    if (current === undefined || current.charCodeAt(0) > 0x7f || !character.test(current)) {
      return false;
    }
  }
  return true;
}

export function isAbsoluteUri(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const colon = value.indexOf(":");
  if (colon <= 0 || !SCHEME.test(value.slice(0, colon))) {
    return false;
  }
  const remainder = value.slice(colon + 1);
  const query = remainder.indexOf("?");
  const fragment = remainder.indexOf("#");
  if (fragment !== -1 && remainder.indexOf("#", fragment + 1) !== -1) {
    return false;
  }
  const delimiterIndexes = [query, fragment].filter((index) => index >= 0);
  const schemeSpecificEnd =
    delimiterIndexes.length === 0 ? remainder.length : Math.min(...delimiterIndexes);
  if (schemeSpecificEnd === 0) {
    return false;
  }
  return hasValidEscapesAndCharacters(remainder, URI_ASCII_CHARACTER);
}

function validPortSuffix(value: string): boolean {
  return value === "" || /^:[0-9]+$/u.test(value);
}

function validHttpsAuthority(authority: string): boolean {
  if (authority === "" || authority.includes("@")) {
    return false;
  }
  if (authority.startsWith("[")) {
    const close = authority.indexOf("]");
    if (close <= 1 || authority.indexOf("]", close + 1) !== -1) {
      return false;
    }
    return (
      hasValidEscapesAndCharacters(
        authority.slice(1, close),
        IP_LITERAL_CHARACTER,
      ) && validPortSuffix(authority.slice(close + 1))
    );
  }
  if (authority.includes("[") || authority.includes("]")) {
    return false;
  }
  const firstColon = authority.indexOf(":");
  const lastColon = authority.lastIndexOf(":");
  if (firstColon !== lastColon) {
    return false;
  }
  const host = firstColon === -1 ? authority : authority.slice(0, firstColon);
  const port = firstColon === -1 ? "" : authority.slice(firstColon);
  return (
    host !== "" &&
    hasValidEscapesAndCharacters(host, REG_NAME_CHARACTER) &&
    validPortSuffix(port)
  );
}

export function isHttpsUrlWithoutUserInfo(value: unknown): value is string {
  if (!isAbsoluteUri(value)) {
    return false;
  }
  const colon = value.indexOf(":");
  if (value.slice(0, colon).toLowerCase() !== "https") {
    return false;
  }
  const remainder = value.slice(colon + 1);
  if (!remainder.startsWith("//")) {
    return false;
  }
  const authorityAndRest = remainder.slice(2);
  const boundary = authorityAndRest.search(/[/?#]/u);
  const authority =
    boundary === -1 ? authorityAndRest : authorityAndRest.slice(0, boundary);
  return validHttpsAuthority(authority);
}
