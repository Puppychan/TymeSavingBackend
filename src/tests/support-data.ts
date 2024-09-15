import { UserRole } from "src/models/user/interface";

export const defaultUser = {
  username: "hakhanhne",
  phone: "0938881145",
  email: "hakhanhne@gmail.com",
  password: "Rmit123@",
  fullname: "Khanh Tran",
  role: UserRole.Admin,
  pin: '1234'
};

// tests/support-data.ts

// Default transaction data
export const defaultTransaction = {
  userId: '567cedea6bd680f6d9fac54a',
  description: 'Test transaction',
  type: 'Expense',
  amount: 100,
  transactionImages: [], 
  payBy: 'Card',
  category: 'Dine out',
  savingGroupId: 'b63f324fe62991060d8cc1e7',
  budgetGroupId: '532e2438f582396ecc77399f',
  approveStatus: 'Pending',
  createdDate: new Date().toISOString(),
  editedDate: new Date().toISOString(),
  isMomo: false
};

// Default group saving data
export const defaultGroupSaving = {
  _id: 'validSavingGroupId',
  hostedBy: 'validObjectId12345',
  defaultApproveStatus: 'Pending', // or 'Approved'
  isClosed: false, // Set to true to test closed groups
};

// Default shared budget data
export const defaultSharedBudget = {
  _id: 'validBudgetGroupId',
  hostedBy: 'validObjectId12345',
  defaultApproveStatus: 'Pending', // or 'Approved'
  isClosed: false, // Set to true to test closed budgets
};
