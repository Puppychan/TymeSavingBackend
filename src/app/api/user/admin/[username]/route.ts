// 'use client'

import { NextRequest, NextResponse } from "next/server";
// import { useSearchParams } from 'next/navigation';
import { connectMongoDB } from "../../../../../config/connectMongoDB";
import User from "../../../../../models/user/model";

/* The admin page will do the following:
  - Show the current user's information
  - List users in the database based on query parameters:
      + byUsername (ascending (1) /descending (-1)): sort the users by their username
      + byRole (true/false) separate users by role
      + byCreation (ascending (1) /descending (-1)): order the users by creation date
  {
    "byUsername": 1,
    "byRole": "true",
    "byCreation": -1
}
*/

export const POST = async (req: NextRequest, { params }: { params: { username: string } }) => {
  // const searchParams = useSearchParams();
  // Set default values 
  // var byUsername: string|null; //default: ascending
  // var byRole: string|null;
  // var byCreation: string|null;
  // Assign values from search parameter
  // const payload: JSON = JSON.parse(await req.json());
  // if(payload.hasOwnProperty('byUsername') && ((payload['byUsername'] === 'ascending' || payload.get('byUsername') === 'descending'))){
  //   byUsername = payload.get('byUsername');
  // }
  // if(payload.hasOwnProperty('byRole') && ((payload.get('byRole') === 'true' || payload.get('byRole') === 'false'))){
  //   byRole = payload.get('byRole');
  // }
  // if(payload.hasOwnProperty('byCreation') && ((payload.('byCreation') === 'ascending' || payload.get('byCreation') === 'descending'))){
  //   byCreation = payload.get('byCreation');
  // }
  var { byUsername= 1, byRole = 'false', byCreation  = 1 } = await req.json();
  try {
    await connectMongoDB();
    const user = await User.findOne({'username': params.username });
    if (!user) {
      return NextResponse.json({ response: 'User not found' }, { status: 404 });
    }
    // User found. Display their information and all users' information.
    // Query options based on query parameters
    var aggregate = User.aggregate();
    // 1) Sort username
    if (byUsername === 1 || byUsername === -1) {
      aggregate.append({ $sort: { username: byUsername } }) ;
    }
    // 2) Group by role
    if (byRole === 'true') {
      aggregate.append({ $group: {  _id: "$role", users: { $push: "$$ROOT" }  } });
    }
    // 3) Unwind
    aggregate.unwind("$users");
    
    // 4) By creation date. Since MongoDB id embeds creation time, we can sort by id.
    if (byCreation === 1 || byCreation === -1) {
      // var byCreationParam:string = byCreation == 'ascending'? 'asc':'desc';
      aggregate.append({ $sort: { "users._id": byCreation } });
    }
    // Output
    aggregate.append({ $project: { username: "$users.username", role: "$users.role", email: "$users.email", fullname: "$users.fullname", phone: "$users.phone"  } });
    let result = await aggregate.exec();

    return NextResponse.json({ response: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
}
