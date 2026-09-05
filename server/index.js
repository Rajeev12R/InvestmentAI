import "dotenv/config";
import express from "express";
import cors from "cors";
import { testGemini } from "./test-script/geminiTest.js";
import { analyzecontroller } from "./controllers/analyzeController.js";
import { compareController } from "./controllers/compareController.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            "https://investment-ai-gray.vercel.app",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000"
        ];
        if (
            allowedOrigins.includes(origin) ||
            /^http:\/\/localhost(:\d+)?$/.test(origin) ||
            /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
            origin.endsWith(".vercel.app")
        ) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true
}));

app.get('/api/test', testGemini);
app.post('/api/analyze', analyzecontroller);
app.post('/api/compare', compareController);

app.listen(port, () => {
    console.log(`Server Started at port: ${port}`);
});
