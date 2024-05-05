// src/index.js
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { json } from 'body-parser';

dotenv.config();

const app = express();
app.use(json());

const port = process.env.PORT;

app.get('/', (req, res) => {
  res.send('Express + TypeScript Server');
});


app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});