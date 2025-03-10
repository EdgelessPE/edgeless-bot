import path from "path";
import Piscina from "piscina";
import { getEnv } from "./utils/env";

export const piscina = new Piscina({
  filename: path.resolve(__dirname, "worker.js"),
  env: getEnv(),
});
