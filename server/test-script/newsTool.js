import "dotenv/config";
import { getCompanyNews } from "../tools/news.tool.js";

const data = await getCompanyNews("Microsoft");
console.log(data);