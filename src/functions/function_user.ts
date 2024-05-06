import mongoose from 'mongoose';
import User from '../models/user';

// from provided information, create customer user
async function create_user(username: string, email:string, phone:string, password:string): Promise<[number, string]>{
    try {
        // Check if user with the given username or email already exists
        const existingUser = await User.findOne({ $or: [{'username': username }, {'user_email': email }] });
        if (existingUser) {
            return [400, 'User already exists'];
        }
        // Create a new user document
        const newUser = new User({ 
          username: username, 
          user_phone: phone,
          user_email: email,
          user_password: password
        });
        await newUser.save(); // Save the new user to the database
        return [200, 'User created successfully.'];
    } catch (err) {
        console.error('Error creating user:', err);
        return [500, 'User creation error.'];
    }
}

// from username, fetch user details
function read_user(){

}

// from provided information, update user details
function update_user(){

}

// remove user with provided username
function delete_user(){

}

// TODO: Authentication and Authorization

export {create_user, read_user, update_user, delete_user};