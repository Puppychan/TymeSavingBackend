// 'use client'

import { NextRequest, NextResponse } from "next/server";
// import { useSearchParams } from 'next/navigation';
import { connectMongoDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";

/* This is the admin page. It will do the following:
  - Show the current user's information
  - List users in the database based on query parameters:
      + sortUsername (ascending /descending): sort the users by their username
      + sortRole (true/false) separate users by role
      + sortCreation (ascending/descending): order the users by creation date
      + filterRole (customer/admin): only show customer/admin users
  {
    "sortUsername": "ascending",
    "sortRole": "true",
    "sortCreation": "ascending",
    "filterRole": "admin"
}
*/

export const POST = async (req: NextRequest) => {
  // const searchParams = useSearchParams();
  // Set default values 
  // var sortUsername: string|null; //default: ascending
  // var sortRole: string|null;
  // var sortCreation: string|null;
  // Assign values from search parameter
  // const payload: JSON = JSON.parse(await req.json());
  // if(payload.hasOwnProperty('sortUsername') && ((payload['sortUsername'] === 'ascending' || payload.get('sortUsername') === 'descending'))){
  //   sortUsername = payload.get('sortUsername');
  // }
  // if(payload.hasOwnProperty('sortRole') && ((payload.get('sortRole') === 'true' || payload.get('sortRole') === 'false'))){
  //   sortRole = payload.get('sortRole');
  // }
  // if(payload.hasOwnProperty('sortCreation') && ((payload.('sortCreation') === 'ascending' || payload.get('sortCreation') === 'descending'))){
  //   sortCreation = payload.get('sortCreation');
  // }
  var { sortUsername = 'ascending', sortRole = 'false', sortCreation = 'descending', filterRole = 'Customer' } = await req.json();
  try {
    await connectMongoDB();
    // User found. Display their information and all users' information.
    // Query options based on query parameters
    var aggregate = User.aggregate();
    // 1) Filter by role
    if(filterRole === 'Customer' || filterRole === 'Admin'){
        aggregate.append({$match: { role: filterRole}});
    }
    // 2) Sort username 
    if (sortUsername === 'ascending' || sortUsername === 'descending') {
        const sortUsernameParam = sortUsername === 'ascending' ? 1:-1;
        aggregate.append({ $sort: { username: sortUsernameParam } }) ;
    }
    // 3) Group by role
    if (sortRole === 'true') {
      aggregate.append({ $group: {  _id: "$role", users: { $push: "$$ROOT" }  } });
    }
    // 4) Unwind
    aggregate.unwind("$users");
    
    // 5) By creation date. Since MongoDB id embeds creation time, we can sort by id.
    if (sortCreation === 'ascending' || sortCreation === 'descending') {
      const sortCreationParam = sortCreation === 'ascending'? 1:-1;
      aggregate.append({ $sort: { "users._id": sortCreationParam} });
    }
    // Output
    aggregate.append({ $project: { username: "$users.username", role: "$users.role", email: "$users.email", fullname: "$users.fullname", phone: "$users.phone"  } });
    let result = await aggregate.exec();

    return NextResponse.json({ response: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
}
