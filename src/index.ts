// src/index.js
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { json } from 'body-parser';
import { connectMongoDB } from './config/connectMongoDB';
import User from './models/user';
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

app.get('/signup', (req, res) => {
  res.sendFile(__dirname +'/views/signup.html');
});

// Route handler for user signup
app.post('/signup', async (req, res) => {
  console.log(req.body);
  const { username, email, phone, password } = req.body;
  console.log(username, email, phone, password);
  try {
      // Check if user with the given username already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
          return res.status(400).send('User already exists');
      }
      // Create a new user document
      const newUser = new User({ 
        username: username, 
        user_phone: phone,
        user_email: email,
        user_password: password
      });
      await newUser.save(); // Save the new user to the database
      res.status(201).send('User created successfully');
  } catch (err) {
      console.error('Error creating user:', err);
      res.status(500).send('Server error');
  }
});


app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});