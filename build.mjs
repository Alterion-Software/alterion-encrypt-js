import { execSync } from "child_process";
import { writeFileSync, rmSync } from "fs";

rmSync("./dist", { recursive: true, force: true });

execSync("tsc --project tsconfig.esm.json", { stdio: "inherit" });
writeFileSync("./dist/esm/package.json", JSON.stringify({ type: "module" }));

execSync("tsc --project tsconfig.cjs.json", { stdio: "inherit" });
writeFileSync("./dist/commonjs/package.json", JSON.stringify({ type: "commonjs" }));
