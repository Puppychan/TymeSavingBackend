// 'use client'
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";

/* This is the admin page. It will do the following:
  - Show the current user's information
  - List users in the database based on query parameters:
      + sortUsername (ascending /descending): sort the users by their username
      + sortRole (ascending/descending) separate users by role
      + sortCreation (ascending/descending): order the users by creation date
      + filterRole (customer/admin): only show customer/admin users
  {
    sortUsername=ascending
    &sortRole=ascending
    &sortCreation=ascending
    &filterRole=Admin
}
*/
export const dynamic = 'force-dynamic';

export const GET = async (req: NextRequest) => {
    try {
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams:  { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });
        try {
            await connectMongoDB();
            // User found. Display their information and all users' information.
            // Query options based on query parameters
            var aggregate = User.aggregate();
            // 1) Filter by role
            if(vnpParams.hasOwnProperty('filterRole') && (vnpParams['filterRole'] === 'Customer' || vnpParams['filterRole'] === 'Admin')){
                aggregate.match({ role: vnpParams['filterRole']});
                // console.log(await aggregate.exec());
            }
            // 2) Sort username 
            if (vnpParams.hasOwnProperty('sortUsername') && (vnpParams['sortUsername'] === 'ascending' || vnpParams['sortUsername'] === 'descending')) {
                const sortUsernameParam = vnpParams['sortUsername'] === 'ascending' ? 1:-1;
                aggregate.sort({ username: sortUsernameParam }) ;
            }
            // 3) Group and sort by role
            if (vnpParams.hasOwnProperty('sortRole') && (vnpParams['sortRole'] === 'ascending' || vnpParams['sortRole'] === 'descending')) {
                aggregate.group({ _id: "$role", users: { $push: "$$ROOT" } });
                aggregate.unwind("$users");

                const sortRoleParam = vnpParams['sortRole'] === 'ascending'? 1:-1;
                aggregate.sort({ role: sortRoleParam});
                
            }
            // 5) By creation date. Since MongoDB id embeds creation time, we can sort by id.
            if (vnpParams.hasOwnProperty('sortCreation') && vnpParams['sortCreation'] === 'ascending' || vnpParams['sortCreation'] === 'descending') {
                const sortCreationParam = vnpParams['sortCreation'] === 'ascending'? 1:-1;
                aggregate.sort({ creationDate: sortCreationParam});
            }
            // Output
            aggregate.project({ password: 0 });
            let result = await aggregate.exec();

            return NextResponse.json({ response: result }, { status: 200 });
        } catch (error: any) {
            return NextResponse.json({ response: error.message}, { status: 500 });
        }
    } catch (error){
        console.log(error);
    }
}