import { getFinancialData } from "../tools/financial.tool.js";

const data = await getFinancialData("MSFT");
console.log(data);