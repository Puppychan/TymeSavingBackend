import { IUser, TymeRewardLevel, UserRole } from "src/models/user/interface";

export const defaultUser = {
  _id: "567cedea6bd680f6d9fac54a",
  username: "hakhanhne",
  phone: "0938881145",
  email: "hakhanhne@gmail.com",
  password: "Rmit123@",
  fullname: "Khanh Tran",
  role: UserRole.Admin,
  pin: '1234',
  userPoints: 0,
  avatar: "",
  tymeReward: TymeRewardLevel.Classic,
} as IUser;