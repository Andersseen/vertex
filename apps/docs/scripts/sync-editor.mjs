import { copyFile, mkdir } from "node:fs/promises";

const sourceDirectory = new URL(
  "../../../packages/frontend/web-editor/dist/",
  import.meta.url,
);
const destinationDirectory = new URL("../public/vendor/", import.meta.url);
const bundles = ["web-editor.min.js", "web-editor-lite.min.js"];

await mkdir(destinationDirectory, { recursive: true });

try {
  await Promise.all(
    bundles.map((bundle) =>
      copyFile(
        new URL(bundle, sourceDirectory),
        new URL(bundle, destinationDirectory),
      ),
    ),
  );
} catch (error) {
  throw new Error(
    "The editor bundles are missing. Run `bun web-editor:build` before starting apps/docs directly.",
    { cause: error },
  );
}

console.log("docs: synced vertex-editor bundles");
