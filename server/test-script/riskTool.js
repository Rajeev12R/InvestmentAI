import "dotenv/config";
import { analyzeRisk } from "../tools/risk.tool.js";

const data = await analyzeRisk("Microsoft");
console.log(data);