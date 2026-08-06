import protocolCatalogDocument from "../protocol/catalog-0.1.json" with { type: "json" };
import schemaCatalogDocument from "../schemas/catalog-0.1.json" with { type: "json" };
import { cloneAndDeepFreezeJson } from "./immutable.ts";

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export type ProtocolProfile = DeepReadonly<
  (typeof protocolCatalogDocument.profiles)[number]
>;
export type ProtocolResource = DeepReadonly<
  (typeof protocolCatalogDocument.resources)[number]
>;
export type ProtocolCatalog = DeepReadonly<typeof protocolCatalogDocument>;
export type SchemaCatalog = DeepReadonly<typeof schemaCatalogDocument>;

export type ProtocolExplanation =
  | Readonly<{ kind: "profile"; profile: ProtocolProfile }>
  | Readonly<{ kind: "resource"; resource: ProtocolResource }>
  | Readonly<{
      kind: "json-schema";
      identifier: string;
      path: string;
    }>;

const protocolCatalog = cloneAndDeepFreezeJson(
  protocolCatalogDocument,
) as ProtocolCatalog;
const schemaCatalog = cloneAndDeepFreezeJson(
  schemaCatalogDocument,
) as SchemaCatalog;

export function getProtocolCatalog(): ProtocolCatalog {
  return protocolCatalog;
}

export function listProtocolResources(): ProtocolCatalog {
  return protocolCatalog;
}

export function getSchemaCatalog(): SchemaCatalog {
  return schemaCatalog;
}

export function explainProtocolResource(
  identifier: string,
): ProtocolExplanation | undefined {
  const profile = protocolCatalog.profiles.find(
    (candidate) =>
      candidate.identifier === identifier ||
      candidate.uri === identifier ||
      candidate.specification === identifier ||
      candidate.schema === identifier,
  );
  if (profile !== undefined) {
    return cloneAndDeepFreezeJson({ kind: "profile", profile });
  }

  const resource = protocolCatalog.resources.find(
    (candidate) =>
      candidate.identifier === identifier || candidate.path === identifier,
  );
  if (resource !== undefined) {
    return cloneAndDeepFreezeJson({ kind: "resource", resource });
  }

  const schema = Object.entries(schemaCatalog.schemas).find(
    ([schemaIdentifier, path]) =>
      schemaIdentifier === identifier || path === identifier,
  );
  return schema === undefined
    ? undefined
    : cloneAndDeepFreezeJson({
        kind: "json-schema",
        identifier: schema[0],
        path: schema[1],
      });
}
