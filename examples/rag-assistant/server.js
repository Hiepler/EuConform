import express from "express";
import { createQueryHandler } from "./routes/query.js";

const app = express();
app.use(express.json());

app.post("/query", createQueryHandler());

app.listen(3100, () => console.log("RAG assistant running on http://localhost:3100"));
