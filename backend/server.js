import express from 'express';
import cors from 'cors';
import { generateAi } from './Chat.js';
const app = express()
const port = 3001


app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(cors())
app.get("/", (req, res) => {
    res.send("hello world")
})


app.post("/chat", async (req, res) => {
    // Guard against missing/undefined body
    const { inputText, id } = req.body ?? {};

    if (!inputText || !id) {
        console.warn('No inputText or id found in request body:', req.body);
        return res.status(400).json({ error: 'Missing inputText or id in request body' });
    }

   const response = await generateAi(inputText, id)
    // TODO: wire this to your AI/backend logic
    res.json({ response });
})
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})