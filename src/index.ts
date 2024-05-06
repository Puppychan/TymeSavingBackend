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

// Serve static files from the 'public' directory
app.use(express.static(__dirname+ '/views'));

const port = process.env.PORT;

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));

connectMongoDB();

app.get('/', (req, res) => {
  res.send('Express + TypeScript Server');
});

// Handling sign up i.e. creating user account
app.get('/signup', (req, res) => {
  res.sendFile(__dirname +'/views/user_create.html');
});

app.post('/signup', async (req, res) => {
  console.log(req.body);
  const { username, email, phone, password } = req.body;
  try {
    const [response_code, response_msg] = await function_user.create_user(username, email, phone, password);
    if(response_code == 200){
      res.redirect('/user/' + username);
    }
    res.status(response_code).send(response_msg);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Handling reading account information
app.get('/user/:username', async (req, res) => {
  const username = req.params.username;
  try{
    const [response_code, results] = await function_user.read_user(username);
    res.status(response_code).send(results);
  } catch (error){
    res.status(500).send(error);
  }

});

// Handling updating account information
app.get('/user/:username/update', async (req, res) => {
  // Show form to update user info + delete user account
  res.sendFile(__dirname + '/views/user_update.html');
});

app.post('/user/:username/update', async (req, res) => {
  const { username } = req.params;
  const { newUsername, newEmail, newPhone, newPassword } = req.body;
  console.log(req.body);
  try {
      // Call update_user function with provided parameters
      const [response_code, response_msg] = await function_user.update_user(username, newUsername, newEmail, newPhone, newPassword);
      console.log([response_code, response_msg]);
      // this currently doesnt work
      if(response_code == 200){
        res.redirect('/user/' + username);
      }
      else{
        res.status(response_code).send(response_msg);
      }
  } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).send("Internal Server Error");
  }
});

// Handling deleting account
app.post('/user/:username/delete', async(req, res) => {
  const { username } = req.params;
  try {
      // Call delete_user function with provided username
      const [response_code, response_msg] = await function_user.delete_user(username);
      console.log([response_code, response_msg]);
      res.status(response_code).send(response_msg);
  } catch (error) {
      console.error("Error deleting user account:", error);
      res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});