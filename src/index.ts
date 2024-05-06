// src/index.js
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { json } from 'body-parser';
import { connectMongoDB } from './config/connectMongoDB';
import * as function_user from './functions/function_user';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();
app.use(json());

const port = process.env.PORT;

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));

connectMongoDB();

app.get('/', (req, res) => {
  res.send('Express + TypeScript Server ' + process.env.MONGODB_URI);
  res.send('hello');
});

// Handling sign up
app.get('/signup', (req, res) => {
  res.sendFile(__dirname +'/views/signup.html');
});

// Route handler for user signup
app.post('/signup', async (req, res) => {
  console.log(req.body);
  const { username, email, phone, password } = req.body;
  try {
    const [response_code, response_msg] = await function_user.create_user(username, email, phone, password);
    res.status(response_code).send(response_msg);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Internal Server Error");
  }
});


app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});