import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "../../../../../config/connectMongoDB";
import User from "../../../../../models/user/model";

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

// update user information
export const POST = async (req: NextRequest, { params }: { params: { username: string }}) => {
    try {
        const username = params.username;
        try{
            const query_user = await User.findOne({'username': username});
            if(query_user){
                await User.deleteOne({'username': username});
                return NextResponse.json({ response: 'User deleted successfully.' }, { status: 200 });
            }
            else{
                return NextResponse.json({ response: 'No such user.' }, { status: 400 });
            }
        } catch (error){
            console.log(error);
            return NextResponse.json({ response: username + ' could not be deleted.' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ response: 'Error deleting: ' + error }, { status: 500 });
    }
};
