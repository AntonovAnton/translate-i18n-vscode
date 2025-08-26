import * as path from "path";
import Mocha from "mocha";
import * as fs from "fs";

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
  });

  const testsRoot = path.resolve(__dirname, ".");

  return new Promise((c, e) => {
    try {
      // Find all test files
      const files = fs.readdirSync(testsRoot);
      const testFiles = files.filter((f) => f.endsWith(".test.js"));

      // Add test files to mocha
      testFiles.forEach((f) => {
        mocha.addFile(path.resolve(testsRoot, f));
      });

      // Run the mocha test
      mocha.run((failures) => {
        if (failures > 0) {
          e(new Error(`${failures} tests failed.`));
        } else {
          c();
        }
      });
    } catch (err) {
      console.error(err);
      e(err);
    }
  });
}
