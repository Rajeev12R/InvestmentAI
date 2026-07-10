import "dotenv/config";
import express from "express";
import cors from "cors";
import { testGemini } from "./test-script/geminiTest.js";
import { analyzecontroller } from "./controllers/analyzeController.js";

const app = express();
const port = process.env.PORT

app.use(express.json());

app.use(cors({
    origin: [
        "https://investment-ai-gray.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5174"
    ]
}));



app.get('/api/test', testGemini);
app.post('/api/analyze', analyzecontroller);

app.listen(port, () => {
    console.log(`Server Started at port: ${port}`);
})
