import { app } from './app'
import { log } from "../lib/log";

const PORT = process.env.PORT || 3000;

app.listen(PORT)

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${PORT}`)

while (true) {
  await new Promise((resolve) => setTimeout(resolve, 240000));
  log.out(`⏱️  Uptime: ${await log.uptime()}`, "core");
}
