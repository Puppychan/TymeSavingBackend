import { ApproveStatuses, IGroupSaving } from "src/models/groupSaving/interface";
import { GroupRole, IGroupSavingParticipation } from "src/models/groupSavingParticipation/interface";
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

export const mockGroupSaving = {
  _id: "07d1be44c0380f3696e83721",
  name: "Group - Test",
  description: "Group - Test",
  amount: 10000000,
  hostedBy: defaultUser._id,
  concurrentAmount: 0,
  defaultApproveStatus: ApproveStatuses.Approved,
  isClosed: false,
  endDate: new Date("2024-12-30"),
  createdDate: new Date(),
} as IGroupSaving;

export const mockGroupSavingParticipation = {
  _id: "07d1be44c0380f3696e83722",
  groupSaving: mockGroupSaving._id,
  user: defaultUser._id,
  joinedDate: new Date(),
  role: GroupRole.Host,
} as IGroupSavingParticipation

export const mockGroupSavingParticipation2 = {
  _id: "07d1be44c0380f3696e83723",
  groupSaving: mockGroupSaving._id,
  user: "07d1be44c0380f3696e83723",
  joinedDate: new Date(),
  role: GroupRole.Member,
} as unknown as IGroupSavingParticipation