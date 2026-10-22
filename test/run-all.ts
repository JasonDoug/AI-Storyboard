import { execSync } from "child_process";

interface TestSuite {
  name: string;
  file: string;
  description: string;
}

const suites: TestSuite[] = [
  {
    name: "LLM Parser & Schemas",
    file: "test/unit-parser.ts",
    description: "Code fences, JSON sanitization, schema fallbacks, aliases",
  },
  {
    name: "Providers & Configuration",
    file: "test/unit-providers.ts",
    description: "OpenAI, Gemini, OpenRouter, Ollama clients, Art Styles, Aspect Ratios",
  },
  {
    name: "Storyboard Export Engine",
    file: "test/unit-export.ts",
    description: "Markdown formatting, JSZip packaging, jsPDF production sheet",
  },
  {
    name: "API Route Handlers",
    file: "test/api-routes.ts",
    description: "/api/analyze-beats, /api/generate-image, image disk caching",
  },
  {
    name: "E2E Pipeline Simulation",
    file: "test/e2e-simulation.ts",
    description: "Complete workflow: story -> beats -> visual render -> exports",
  },
];

console.log("\n============================================================");
console.log("       STORY BEAT VISUALIZER — TEST RUNNER & SUITE          ");
console.log("============================================================\n");

let passedCount = 0;
let failedCount = 0;
const results: Array<{ name: string; status: "PASSED" | "FAILED"; durationMs: number }> = [];

const totalStartTime = Date.now();

for (const suite of suites) {
  process.stdout.write(`▶ Running: ${suite.name} (${suite.file})...\n`);
  const start = Date.now();
  try {
    execSync(`npx tsx ${suite.file}`, { stdio: "inherit" });
    const duration = Date.now() - start;
    results.push({ name: suite.name, status: "PASSED", durationMs: duration });
    passedCount++;
  } catch (err: any) {
    const duration = Date.now() - start;
    results.push({ name: suite.name, status: "FAILED", durationMs: duration });
    failedCount++;
    console.error(`❌ FAILED: ${suite.name}`);
  }
}

const totalDuration = ((Date.now() - totalStartTime) / 1000).toFixed(2);

console.log("\n============================================================");
console.log("                   TEST EXECUTION SUMMARY                   ");
console.log("============================================================");

results.forEach((r) => {
  const symbol = r.status === "PASSED" ? "✓" : "✗";
  const statusStr = r.status === "PASSED" ? "\x1b[32mPASSED\x1b[0m" : "\x1b[31mFAILED\x1b[0m";
  console.log(` ${symbol} ${r.name.padEnd(35)} [${statusStr}] (${r.durationMs}ms)`);
});

console.log("------------------------------------------------------------");
console.log(
  `Total Suites: ${suites.length} | Passed: \x1b[32m${passedCount}\x1b[0m | Failed: ${
    failedCount > 0 ? `\x1b[31m${failedCount}\x1b[0m` : "0"
  } | Elapsed: ${totalDuration}s`
);
console.log("============================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
