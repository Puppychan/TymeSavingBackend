import { NextRequest, NextResponse } from "next/server";
import { invitationData } from "src/lib/invitationUtils";
import { connectMongoDB } from "src/config/connectMongoDB";
export const dynamic = 'force-dynamic';

/* 
    Sort: 
        sortGroupId
        sortGroupType
        sortStatus
    Match: 
        getUserFullName
        getGroupId
        getGroupType
        getCode
        getStatus  : Accepted, Cancelled, Pending
    Handle user:
        Admin: getUserId to match User Id
*/
export const GET = async (req: NextRequest) => {
    try {
        await connectMongoDB();
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams: { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });
        var result = await invitationData('', vnpParams);
        return NextResponse.json({ response: result.response }, { status: result.status });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ response: error }, { status: 500 });
    }
}
