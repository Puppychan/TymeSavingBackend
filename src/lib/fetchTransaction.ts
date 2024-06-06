// total expense/income of current month: From the 1st to the current date
// return amount + month
export const currentMonthTotal = async(type: "Income" | "Expense") =>{
    // mongoDB query
}


// total expense of past month: from the 1st to the end of that month
// return amount + month
export const pastMonthTotal = async(type: "Income" | "Expense", monthPast: number) =>{
    
}



// Total income and expense for this month. Compare them to the last month
// return: total income for this month, percentage compared to the last month
// return: total expense for this month, percentage compared to the last month
export const compareToPastMonth = async() => {

}

// Group category for this month
// Top 3 categories + Group the others as "Other"
// return: {category, total amount, percentage}
export const topCategoriesExpense = async() => {

}
