import { createApp } from "./app.js";
import { PORT, RPC_URL, RUNPOD_ENDPOINT_ID, RUNPOD_API_KEY, DATABASE_URL } from "./lib/config.js";

const app = createApp();

app.listen(PORT, "127.0.0.1", () => {
  console.log(`\n🚀 pump.fun Launcher running at http://localhost:${PORT}`);
  console.log(`   RPC: ${RPC_URL}`);
  console.log(`   Database: ${DATABASE_URL ? "configured" : "MISSING DATABASE_URL"}`);
  console.log(
    `   GPU vanity: ${RUNPOD_ENDPOINT_ID && RUNPOD_API_KEY ? `RunPod ${RUNPOD_ENDPOINT_ID}` : "not configured"}\n`
  );
});
