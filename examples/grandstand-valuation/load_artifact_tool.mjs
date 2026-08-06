import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

function moduleSpecifier(value) {
  if (value.startsWith("file:")) return value;
  if (isAbsolute(value) || value.startsWith(".")) return pathToFileURL(resolve(value)).href;
  return value;
}

export async function loadArtifactTool() {
  const configured = process.env.OFF_ARTIFACT_TOOL_MODULE;
  const specifier = moduleSpecifier(configured ?? "@oai/artifact-tool");
  try {
    return await import(specifier);
  } catch (cause) {
    throw new Error(
      "Unable to resolve @oai/artifact-tool. Install it locally or set OFF_ARTIFACT_TOOL_MODULE to its package specifier, module path, or file URL.",
      { cause },
    );
  }
}
