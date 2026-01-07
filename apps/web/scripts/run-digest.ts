/**
 * Script to manually run the daily digest
 * Usage: pnpm digest:run
 */

import { runDigestForAllUsers } from "../src/lib/digest";

async function main() {
  console.log("🚀 Starting daily digest run...");

  try {
    const result = await runDigestForAllUsers();
    console.log(`✅ Digest completed:`);
    console.log(`   - Processed: ${result.processed} users`);
    console.log(`   - Errors: ${result.errors}`);
  } catch (error) {
    console.error("❌ Failed to run digest:", error);
    process.exit(1);
  }
}

main();

