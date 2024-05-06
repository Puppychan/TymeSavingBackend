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
async function read_user(username: string): Promise<[number, any]> {
    try{
        const user = await User.findOne({'username': username});
        if (user){
            return [200, [user.username, user.user_phone, user.user_email, user.role, user.bankAccounts, user.user_points]];
        }
        else{
            return [404, null];
        }
    } catch (err){
        return [500, err];
    }
}

// from provided information, update user details
async function update_user(username: string, newUsername?: string, newEmail?: string, newPhone?: string, newPassword?: string): Promise<[number, string, string]>{
    try {
        var return_username = username;
        const user = await User.findOne({ 'username': username });
        if (!user) {
            return [400, 'Cannot fetch this user', username];
        }
        // Check if new username or email already exists
        if (newUsername !== undefined && newUsername !== user.username && await exist_username(newUsername)) {
            return [400, 'Invalid new username', username];
        }
        if (newEmail !== undefined && newEmail !== user.user_email && await exist_email(newEmail)) {
            return [400, 'Invalid new email', username];
        }
        // Update user fields if new values are provided
        if (newUsername !== undefined && newUsername !== '') {
            user.username = newUsername;
            return_username = newUsername;
        }
        if (newEmail !== undefined && newEmail !== '') {
            user.user_email = newEmail;
        }
        if (newPhone !== undefined && newPhone !== '') {
            user.user_phone = newPhone;
        }
        if (newPassword !== undefined && newPassword !== '') {
            user.user_password = newPassword;
        }
        // Save the updated user object to the database
        await user.save();

        return [200, 'User updated successfully.', return_username];
    } catch (error) {
        console.error('Error updating user:', error);
        return [500, 'Internal Server Error', username];
    }
    
}

// remove user with provided username
async function delete_user(username: string): Promise<[number, string]>{
    try{
        const query_user = await User.findOne({'username': username});
        if(query_user){
            await User.deleteOne({'username': username});
            return [200, 'User deleted successfully.'];
        }
        else{
            return [400, 'No such user.'];
        }
    } catch (error){
        console.log(error);
        return [500, 'User could not be deleted.'];
    }
}

// Check if username exists: return false if no such user exists, true otherwise
async function exist_username(username:string): Promise<boolean>{
    try{
        const query_user = await User.findOne({'username': username});
        if(query_user){
            return true;
        }
        else{
            return false;
        }
    } catch (error){
        console.log(error);
        return true;
    }
}

// Check if email exists - we may use phone number in the future
async function exist_email(email:string): Promise<boolean>{
    try{
        const query_user = await User.findOne({'user_email': email});
        if(query_user){
            return true;
        }
        else{
            return false;
        }
    } catch (error){
        console.log(error);
        return true;
    }
}


// TODO: Authentication and Authorization

export {create_user, read_user, update_user, delete_user};