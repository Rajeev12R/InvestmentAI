import "dotenv/config";
import express from "express";
import { testGemini } from "./test-script/geminiTest.js";
import { analyzecontroller } from "./controllers/analyzeController.js";

const app = express();
const port = process.env.PORT

app.use(express.json());

app.get('/api/test', testGemini);
app.post('/api/analyze', analyzecontroller);

app.listen(port, () => {
    console.log(`Server Started at port: ${port}`);
})
