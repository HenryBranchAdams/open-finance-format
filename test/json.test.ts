import assert from "node:assert/strict";
import test from "node:test";

import { canonicalizeJson, canonicalizeJsonText } from "../src/json/jcs.ts";
import { admitJson } from "../src/json/parse.ts";
import {
  officialJcsNumberVectors,
  officialJcsVectors,
} from "./vectors/rfc8785/official-vectors.ts";

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

test("admission rejects malformed UTF-8 with OFF-E1001", () => {
  const result = admitJson(Uint8Array.of(0xc3, 0x28));
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics[0], {
    code: "OFF-E1001",
    severity: "error",
    instanceLocation: "",
    ruleId: "OFF.ADMISSION.UTF8",
    parameters: { byteOffset: 1 },
  });
});

test("malformed UTF-8 offsets identify the illegal or offending octet", () => {
  const vectors: readonly {
    readonly name: string;
    readonly input: Uint8Array;
    readonly byteOffset: number;
  }[] = [
    { name: "illegal continuation lead", input: Uint8Array.of(0x80), byteOffset: 0 },
    { name: "illegal overlong lead", input: Uint8Array.of(0xc0, 0x80), byteOffset: 0 },
    { name: "invalid second octet", input: Uint8Array.of(0xc2, 0x20), byteOffset: 1 },
    { name: "invalid third octet", input: Uint8Array.of(0xe1, 0x80, 0x20), byteOffset: 2 },
    { name: "invalid fourth octet", input: Uint8Array.of(0xf1, 0x80, 0x80, 0x20), byteOffset: 3 },
    { name: "truncated sequence", input: Uint8Array.of(0xe1, 0x80), byteOffset: 0 },
    { name: "overlong sequence", input: Uint8Array.of(0xe0, 0x80, 0x80), byteOffset: 1 },
    { name: "surrogate sequence", input: Uint8Array.of(0xed, 0xa0, 0x80), byteOffset: 1 },
    { name: "out-of-range sequence", input: Uint8Array.of(0xf4, 0x90, 0x80, 0x80), byteOffset: 1 },
  ];

  for (const vector of vectors) {
    const result = admitJson(vector.input);
    assert.equal(result.ok, false, vector.name);
    assert.equal(result.diagnostics.length, 1, vector.name);
    assert.deepEqual(
      result.diagnostics[0]?.parameters,
      { byteOffset: vector.byteOffset },
      vector.name,
    );
  }
});

test("admission detects decoded duplicate names at a JSON Pointer", () => {
  const result = admitJson(bytes('{"outer":{"a":"first","\\u0061":"second"}}'));
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics[0], {
    code: "OFF-E1003",
    severity: "error",
    instanceLocation: "/outer",
    ruleId: "OFF.ADMISSION.DUPLICATE_NAME",
    parameters: { name: "a", occurrence: 2 },
  });
});

test("admission deduplicates cardinality collisions using canonical parameter bytes", () => {
  const unicode = admitJson(bytes('{"a":"\\ud800","a":"x\\ud800"}'));
  assert.equal(unicode.ok, false);
  const unicodeDiagnostics = unicode.diagnostics.filter(
    (entry) => entry.code === "OFF-E1004",
  );
  assert.deepEqual(unicodeDiagnostics, [
    {
      code: "OFF-E1004",
      severity: "error",
      instanceLocation: "/a",
      ruleId: "OFF.ADMISSION.UNICODE",
      parameters: { codeUnitOffset: 0 },
    },
  ]);

  const number = admitJson(
    bytes('{"extensions":{"urn:test":{"n":1e400,"n":-1e400}}}'),
  );
  assert.equal(number.ok, false);
  const numberDiagnostics = number.diagnostics.filter(
    (entry) => entry.code === "OFF-E1005",
  );
  assert.deepEqual(numberDiagnostics, [
    {
      code: "OFF-E1005",
      severity: "error",
      instanceLocation: "/extensions/urn:test/n",
      ruleId: "OFF.ADMISSION.NUMBER",
      parameters: { lexeme: "-1e400", reason: "notFiniteBinary64" },
    },
  ]);

  const duplicateName = admitJson(
    bytes('{"z":"first","z":"second","a":"first","a":"second"}'),
  );
  assert.equal(duplicateName.ok, false);
  assert.deepEqual(
    duplicateName.diagnostics.filter((entry) => entry.code === "OFF-E1003"),
    [
      {
        code: "OFF-E1003",
        severity: "error",
        instanceLocation: "",
        ruleId: "OFF.ADMISSION.DUPLICATE_NAME",
        parameters: { name: "a", occurrence: 2 },
      },
    ],
  );

  const utf8Earlier = "\ue000";
  const utf16Earlier = "\u{10000}";
  const duplicateUnicodeNames = admitJson(
    bytes(
      `{"${utf16Earlier}":"first","${utf16Earlier}":"second","${utf8Earlier}":"first","${utf8Earlier}":"second"}`,
    ),
  );
  assert.equal(duplicateUnicodeNames.ok, false);
  assert.deepEqual(
    duplicateUnicodeNames.diagnostics.filter(
      (entry) => entry.code === "OFF-E1003",
    )[0]?.parameters,
    { name: utf8Earlier, occurrence: 2 },
  );
});

test("admission bounds repeated-member diagnostics while retaining the canonical winner", () => {
  const repetitions = 20_000;
  const document = `{${Array.from(
    { length: repetitions },
    () => '"z":"value"',
  ).join(",")}}`;
  const result = admitJson(bytes(document));

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.diagnostics.filter((entry) => entry.code === "OFF-E1003"),
    [
      {
        code: "OFF-E1003",
        severity: "error",
        instanceLocation: "",
        ruleId: "OFF.ADMISSION.DUPLICATE_NAME",
        parameters: { name: "z", occurrence: 10_000 },
      },
    ],
  );
});

test("admission diagnostics use locale-free pointer ordering", () => {
  const result = admitJson(bytes('{"z":"\\ud800","ä":"\\ud800"}'));
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.diagnostics.map((entry) => entry.instanceLocation),
    ["/z", "/ä"],
  );
});

test("a malformed JSON tail suppresses diagnostics that require valid JSON", () => {
  const result = admitJson(bytes('{"a":"first","a":"second",'));
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics.map((entry) => entry.code), ["OFF-E1002"]);
  assert.deepEqual(result.diagnostics[0]?.parameters, { byteOffset: 26 });
});

test("invalid member names suppress non-portable diagnostics for their subtree", () => {
  const vectors: readonly {
    readonly name: string;
    readonly text: string;
    readonly instanceLocation: string;
  }[] = [
    {
      name: "duplicate invalid key",
      text: '{"\\ud800":true,"\\ud800":false}',
      instanceLocation: "",
    },
    {
      name: "invalid key above a disallowed number",
      text: '{"\\ud800":{"n":1}}',
      instanceLocation: "",
    },
    {
      name: "invalid key above another invalid string",
      text: '{"outer":{"\\ud800":{"value":"\\udc00"}}}',
      instanceLocation: "/outer",
    },
  ];

  for (const vector of vectors) {
    const result = admitJson(bytes(vector.text));
    assert.equal(result.ok, false, vector.name);
    assert.deepEqual(
      result.diagnostics,
      [
        {
          code: "OFF-E1004",
          severity: "error",
          instanceLocation: vector.instanceLocation,
          ruleId: "OFF.ADMISSION.UNICODE",
          parameters: { codeUnitOffset: 0 },
        },
      ],
      vector.name,
    );
    assert.doesNotThrow(
      () => canonicalizeJsonText(result.diagnostics),
      vector.name,
    );
  }
});

test("admission rejects lone surrogates at their JSON Pointer", () => {
  const result = admitJson(bytes('{"nested":{"value":"\\ud800"}}'));
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0]?.code, "OFF-E1004");
  assert.equal(result.diagnostics[0]?.instanceLocation, "/nested/value");
  assert.deepEqual(result.diagnostics[0]?.parameters, { codeUnitOffset: 0 });
});

test("number admission is path-aware", () => {
  for (const token of ["-0", "1.0", "1e2", "9007199254740992"]) {
    const result = admitJson(bytes(`{"resources":[{"byteSize":${token}}]}`));
    assert.equal(result.ok, false, token);
    assert.equal(result.diagnostics[0]?.code, "OFF-E1005", token);
    assert.equal(result.diagnostics[0]?.instanceLocation, "/resources/0/byteSize");
    assert.deepEqual(result.diagnostics[0]?.parameters, {
      lexeme: token,
      reason: "notCanonicalNonNegativeSafeInteger",
    });
  }

  const admitted = admitJson(
    bytes(
      '{"resources":[{"byteSize":9007199254740991}],"extensions":{"urn:test":{"minusZero":-0,"fraction":4.50,"exponent":1E30}}}',
    ),
  );
  assert.equal(admitted.ok, true);
  if (!admitted.ok) {
    assert.fail("expected the extension number document to be admitted");
  }
  assert.equal(
    canonicalizeJsonText(admitted.value),
    '{"extensions":{"urn:test":{"exponent":1e+30,"fraction":4.5,"minusZero":0}},"resources":[{"byteSize":9007199254740991}]}',
  );
});

test("numbers outside known fields and extensions are rejected", () => {
  const result = admitJson(bytes('{"title":1}'));
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0]?.code, "OFF-E1005");
  assert.equal(result.diagnostics[0]?.instanceLocation, "/title");
  assert.deepEqual(result.diagnostics[0]?.parameters, {
    lexeme: "1",
    reason: "numberNotAllowedAtLocation",
  });
});

test("malformed JSON reports a UTF-8 byte offset", () => {
  const result = admitJson(bytes('{"accent":"é",}'));
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0]?.code, "OFF-E1002");
  assert.deepEqual(result.diagnostics[0]?.parameters, { byteOffset: 15 });
});

test("JSON syntax offsets identify the first failed grammar expectation", () => {
  const vectors: readonly { readonly text: string; readonly byteOffset: number }[] = [
    { text: '{"x":truX}', byteOffset: 8 },
    { text: '{"x":tru', byteOffset: 8 },
    { text: '{"x":"\\u12G4"}', byteOffset: 10 },
    { text: '{"x":', byteOffset: 5 },
  ];

  for (const vector of vectors) {
    const result = admitJson(bytes(vector.text));
    assert.equal(result.ok, false, vector.text);
    assert.equal(result.diagnostics[0]?.code, "OFF-E1002", vector.text);
    assert.deepEqual(
      result.diagnostics[0]?.parameters,
      { byteOffset: vector.byteOffset },
      vector.text,
    );
  }
});

test("JCS matches the official RFC 8785 vectors", () => {
  for (const vector of officialJcsVectors) {
    assert.equal(canonicalizeJsonText(vector.value), vector.expected, vector.name);
  }
});

test("JCS matches every RFC 8785 Appendix B number vector", () => {
  for (const vector of officialJcsNumberVectors) {
    const octets = Uint8Array.from(
      vector.ieee754.match(/../gu) ?? [],
      (octet) => Number.parseInt(octet, 16),
    );
    const value = new DataView(octets.buffer).getFloat64(0, false);
    if (vector.expected === null) {
      assert.throws(() => canonicalizeJsonText(value), /finite IEEE-754/u);
    } else {
      assert.equal(canonicalizeJsonText(value), vector.expected, vector.ieee754);
    }
  }
});

test("canonical bytes are idempotent and preserve Unicode without normalization", () => {
  const value = { "é": "é", "e\u0301": "e\u0301" };
  const first = canonicalizeJson(value);
  const second = canonicalizeJson(JSON.parse(new TextDecoder().decode(first)));
  assert.deepEqual(second, first);
  assert.equal(
    new TextDecoder().decode(first),
    '{"é":"é","é":"é"}',
  );
});
