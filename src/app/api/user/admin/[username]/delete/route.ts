import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "../../../../../../config/connectMongoDB";
import User from "../../../../../../models/user/model";

// update user information
export const POST = async (req: NextRequest, { params }: { params: { username: string }}) => {
    try {
        const username = params.username;
        try{
            await connectMongoDB();
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
