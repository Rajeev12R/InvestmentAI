import "dotenv/config";
import { getCompetitors } from "../tools/competitor.tool.js";

const data = await getCompetitors("Microsoft");
console.log(data);