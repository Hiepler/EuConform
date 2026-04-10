import express from "express";
import { createChatHandler } from "./routes/chat.js";

const app = express();
app.use(express.json());

app.post("/chat", createChatHandler());

app.listen(3000, () => console.log("Chatbot running on http://localhost:3000"));
