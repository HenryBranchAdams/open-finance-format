export interface JcsVector {
  readonly name: string;
  readonly value: unknown;
  readonly expected: string;
}

export interface JcsNumberVector {
  readonly ieee754: string;
  readonly expected: string | null;
}

// RFC 8785 sections 3.2.2 and 3.2.3.
export const officialJcsVectors: readonly JcsVector[] = [
  {
    name: "primitive serialization and recursive property ordering",
    value: {
      numbers: [333333333.33333329, 1e30, 4.5, 2e-3, 1e-27],
      string: "€$\u000f\nA'B\"\\\\\"/",
      literals: [null, true, false],
    },
    expected:
      "{\"literals\":[null,true,false],\"numbers\":[333333333.3333333,1e+30,4.5,0.002,1e-27],\"string\":\"€$\\u000f\\nA'B\\\"\\\\\\\\\\\"/\"}",
  },
  {
    name: "UTF-16 property ordering",
    value: {
      "€": "Euro Sign",
      "\r": "Carriage Return",
      "דּ": "Hebrew Letter Dalet With Dagesh",
      "1": "One",
      "😀": "Emoji: Grinning Face",
      "\u0080": "Control",
      "ö": "Latin Small Letter O With Diaeresis",
    },
    expected:
      "{\"\\r\":\"Carriage Return\",\"1\":\"One\",\"\":\"Control\",\"ö\":\"Latin Small Letter O With Diaeresis\",\"€\":\"Euro Sign\",\"😀\":\"Emoji: Grinning Face\",\"דּ\":\"Hebrew Letter Dalet With Dagesh\"}",
  },
];

// RFC 8785 Appendix B. A null expectation denotes a prohibited non-finite value.
export const officialJcsNumberVectors: readonly JcsNumberVector[] = [
  { ieee754: "0000000000000000", expected: "0" },
  { ieee754: "8000000000000000", expected: "0" },
  { ieee754: "0000000000000001", expected: "5e-324" },
  { ieee754: "8000000000000001", expected: "-5e-324" },
  { ieee754: "7fefffffffffffff", expected: "1.7976931348623157e+308" },
  { ieee754: "ffefffffffffffff", expected: "-1.7976931348623157e+308" },
  { ieee754: "4340000000000000", expected: "9007199254740992" },
  { ieee754: "c340000000000000", expected: "-9007199254740992" },
  { ieee754: "4430000000000000", expected: "295147905179352830000" },
  { ieee754: "7fffffffffffffff", expected: null },
  { ieee754: "7ff0000000000000", expected: null },
  { ieee754: "44b52d02c7e14af5", expected: "9.999999999999997e+22" },
  { ieee754: "44b52d02c7e14af6", expected: "1e+23" },
  { ieee754: "44b52d02c7e14af7", expected: "1.0000000000000001e+23" },
  { ieee754: "444b1ae4d6e2ef4e", expected: "999999999999999700000" },
  { ieee754: "444b1ae4d6e2ef4f", expected: "999999999999999900000" },
  { ieee754: "444b1ae4d6e2ef50", expected: "1e+21" },
  { ieee754: "3eb0c6f7a0b5ed8c", expected: "9.999999999999997e-7" },
  { ieee754: "3eb0c6f7a0b5ed8d", expected: "0.000001" },
  { ieee754: "41b3de4355555553", expected: "333333333.3333332" },
  { ieee754: "41b3de4355555554", expected: "333333333.33333325" },
  { ieee754: "41b3de4355555555", expected: "333333333.3333333" },
  { ieee754: "41b3de4355555556", expected: "333333333.3333334" },
  { ieee754: "41b3de4355555557", expected: "333333333.33333343" },
  { ieee754: "becbf647612f3696", expected: "-0.0000033333333333333333" },
  { ieee754: "43143ff3c1cb0959", expected: "1424953923781206.2" },
];
