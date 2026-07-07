import { getCompanyProfile } from "../tools/company.tool.js";

const data = await getCompanyProfile("Microsoft");
console.log(data);