'use client'

import { NextRequest, NextResponse } from "next/server";
import { useSearchParams } from 'next/navigation';
import { connectMongoDB } from "../../../../../config/connectMongoDB";
import User from "../../../../../models/user/model";

/* The admin page will do the following:
  - Show the current user's information
  - List users in the database based on query parameters:
      + byUsername (ascending/descending): sort the users by their username
      + byRole (true/false) separate users by role
      + byCreation (ascending/descending): order the users by creation date
  Example link: localhost:3000/api/user/admin/vietanh10?byUsername=ascending&byRole=true&byCreation=ascending
*/

export const GET = async (req: NextRequest, { params }: { params: { username: string } }) => {
  const searchParams = useSearchParams();
  // Set default values 
  // var byUsername: string|null = 'ascending'; //default: ascending
  // var byRole: string|null = 'false';
  // var byCreation: string|null = 'ascending';
  // // Assign values from search parameter
  // if(searchParams.has('byUsername') && ((searchParams.get('byUsername') === 'ascending' || searchParams.get('byUsername') === 'descending'))){
  //   byUsername = searchParams.get('byUsername');
  // }
  // if(searchParams.has('byRole') && ((searchParams.get('byRole') === 'true' || searchParams.get('byUsername') === 'false'))){
  //   byRole = searchParams.get('byRole');
  // }
  // if(searchParams.has('byCreation') && ((searchParams.get('byCreation') === 'ascending' || searchParams.get('byCreation') === 'descending'))){
  //   byCreation = searchParams.get('byCreation');
  // }
  try {
    await connectMongoDB();
    const user = await User.findOne({'username': params.username });
    if (!user) {
      return NextResponse.json({ response: 'User not found' }, { status: 404 });
    }
    // User found. Display their information and all users' information.
    // Query options based on query parameters
    // var pipeline = [];
    // // 1) Sort username
    // if (byUsername === 'ascending' || byUsername === 'descending') {
    //   var byUsernameParam = byUsername === 'ascending' ? 1 : -1
    //   pipeline.push(
    //     '{ $sort: { username: ' + byUsernameParam + '} }'
    //   );
    // }
    // // 2) Group by role
    // if (byRole === 'true') {
    //   pipeline.push('{ $group: {  _id: "$role", users: { $push: "$$ROOT" }  } }');
    // }
    // // 3) Unwind
    // pipeline.push('{  $unwind: "$users" }');
    
    // // 4) By creation date. Since MongoDB id embeds creation time, we can sort by id.
    // if (byCreation === 'ascending' || byCreation === 'descending') {
    //   var byCreationParam = byCreation === 'ascending' ? 1 : -1;
    //   pipeline.push(' { $sort: { "users._id": ' + byCreationParam + ' } }');
    // }
    // // Output
    // pipeline.push(' { $project: { username: "$users.username", role: "$users.role", email: "$users.email", fullname: "$users.fullname", phone: "$users.phone"  } }');
    // let result = await User.aggregate({pipeline});
    return NextResponse.json({ response: searchParams }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
}
