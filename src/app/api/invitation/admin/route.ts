import { NextRequest, NextResponse } from "next/server";
import { invitationData } from "src/lib/fetchInvitation";
import { connectMongoDB } from "src/config/connectMongoDB";
export const dynamic = 'force-dynamic';


/* See all invitations, with the following Sorts/Filters:
    Sort: 
        groupId
        group type
        invitation status
    Match: 
        groupId
        group type
        code
        invitation status: accepted, cancelled, pending
        userId
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
