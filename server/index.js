import "dotenv/config";
import express from "express";
import { testGemini } from "./controllers/geminiController.js";

const app = express();
const port = process.env.PORT

app.use(express.json());

app.get('/api/test', testGemini);

app.listen(port, () => {
    console.log(`Server Started at port: ${port}`);
})
