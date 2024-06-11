import { UserRole } from "../models/user/interface";

export const defaultUser = {
  username: "hakhanhne",
  phone: "0938881145",
  email: "hakhanhne@gmail.com",
  password: "Rmit123@",
  fullname: "Khanh Tran",
  role: UserRole.Admin,
  pin: '1234'
};

export const defaultUserCustomer = {
  username: "nhung",
  phone: "0123456789",
  email: "123@gmail.com",
  password: "Rmit123@",
  fullname: "Nhung Tran",
  role: UserRole.Customer,
  pin: '1234'
};