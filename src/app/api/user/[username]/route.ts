import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyUser } from "src/lib/authentication";
import User from "src/models/user/model";

// GET: Read the user information
export const GET = async (
  req: NextRequest,
  { params }: { params: { username: string } }
) => {
  try {
    await connectMongoDB();
    // Can comment out the verification below to test - it works
    const verification = await verifyUser(req.headers, params.username)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const user = await User.findOne({ username: params.username }).select("-password")
    if (!user) {
      return NextResponse.json({ response: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ response: user }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message }, { status: 500 });
  }
};


// DELETE: Delete a user from their username.
export const DELETE = async (
  req: NextRequest,
  { params }: { params: { username: string } }
) => {
  const username = params.username;
  try {
    await connectMongoDB();
    const verification = await verifyUser(req.headers, params.username)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const query_user = await User.findOne({ username: username });
    if (query_user) {
      await User.deleteOne({ username: username });
      return NextResponse.json(
        { response: "User deleted successfully." },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ response: "No such user." }, { status: 400 });
    }
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { response: username + " could not be deleted." },
      { status: 500 }
    );
  }
};


// // PUT: update user information
// export const PUT = async (
//   req: NextRequest,
//   { params }: { params: { username: string } }
// ) => {
//   try {
//     const payload = await req.json();
//     const username = params.username;
//     const { newUsername, newPassword, newEmail, newFullname, newPhone } =
//       payload;
//     // const user = await User.findOne({'username': username });
//     try {
//       await connectMongoDB();
//       var return_username = username;
//       const user = await User.findOne({ username: username });
//       if (!user) {
//         return NextResponse.json(
//           { response: "User not found" },
//           { status: 404 }
//         );
//       }
//       // Check if new username or email already exists
//       if (
//         newUsername !== undefined &&
//         newUsername !== user.username &&
//         (await exist_username(newUsername))
//       ) {
//         return [400, "Invalid new username", newUsername];
//       }
//       if (
//         newEmail !== undefined &&
//         newEmail !== user.email &&
//         (await exist_email(newEmail))
//       ) {
//         return [400, "Invalid new email", newEmail];
//       }
//       // Update user fields if new values are provided
//       if (newUsername !== undefined && newUsername !== "") {
//         user.username = newUsername;
//         return_username = newUsername;
//       }
//       if (newEmail !== undefined && newEmail !== "") {
//         user.email = newEmail;
//       }
//       if (newFullname !== undefined && newFullname !== "") {
//         user.fullname = newFullname;
//       }
//       if (newPhone !== undefined && newPhone !== "") {
//         user.phone = newPhone;
//       }
//       if (newPassword !== undefined && newPassword !== "") {
//         user.password = newPassword;
//       }
//       // Save the updated user object to the database
//       await user.save();
//       // Fetch the data again, omit the password
//       const safeUser = await User.findOne(user._id).select("-password");
//       // console.log(user);
//       return NextResponse.json({ response: safeUser }, { status: 200 });
//     } catch (error) {
//       console.error("Error updating user:", error);
//       return NextResponse.json(
//         { response: "Cannot update user " + username },
//         { status: 500 }
//       );
//     }
//   } catch (error: any) {
//     return NextResponse.json({ response: error.message }, { status: 500 });
//   }
// };
