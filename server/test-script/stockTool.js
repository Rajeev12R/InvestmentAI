import { getStockData } from "../tools/stock.tool.js";

const data = await getStockData("MSFT");
console.log(data);