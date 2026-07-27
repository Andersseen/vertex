import { copyFile } from "node:fs/promises";

const source = new URL("../src/index.d.ts", import.meta.url);
const destination = new URL("../dist/index.d.ts", import.meta.url);

await copyFile(source, destination);
console.log("vertex-editor: copied public TypeScript declarations");
