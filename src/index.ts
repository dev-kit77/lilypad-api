import { app } from "./app";
import { log } from "../lib/log";

const PORT = process.env.PORT || 3000;

app.listen(PORT);

log.out(`Lilypad API is running at ${app.server?.hostname}:${PORT}`, "core");

while (true) {
  await new Promise((resolve) => setTimeout(resolve, 240000));
  log.out(`Lilypad API Uptime: ${await log.uptime()}`, "core");
}
