import Transaction from 'src/models/transaction/model';
import mongoose from 'mongoose';

/* Call functions based on the parameters. Functions are:
--- The functions below generate responses for the report page of SharedBudget and GroupSaving
8) groupReportCategories(groupType, groupId): show categories and % that made up the group's amount
9) groupReportUsers(groupType, groupId): show users and % that made up the group's amount
10) groupReportTransactions(groupType, groupId, filter): show some transactions that match the filter
(Only allow one filter out of the four below)
- filter = latest/earliest: show the last or first transactions made to the group
- filter = highest/lowest: show the transactions with the highest or lowest amount
*/

export async function groupReportCategories(groupType, groupId) {
  try {
    // Determine the correct group field based on the groupType
    let matchGroup = {};
    if(groupType === 'budgetGroup'){
        matchGroup = { budgetGroupId: new mongoose.Types.ObjectId(groupId)};
    }
    else if (groupType === 'savingGroup'){
        matchGroup = { savingGroupId: new mongoose.Types.ObjectId(groupId)};
    } else {
        throw "GroupReport: Invalid group type: budgetGroup or savingGroup only."
    }
    // Group total
    const totalResult = await Transaction.aggregate([
        { $match: matchGroup},
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
          }
        }
    ]);
  
    const totalAmount = totalResult.length > 0 ? totalResult[0].totalAmount : 0;
    if(totalAmount == 0) return [];

    const topCategories = await Transaction.aggregate([
        { $match: matchGroup },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' }
          }
        },
        // Get top 4 categories with highest totalAmount
        { $sort: { totalAmount: -1 } }, 
        { $limit: 4 }, 
        // Show category + percentage + totalAmount
        {
          $project: {
            _id: 0,
            category: '$_id',
            totalAmount: 1,
            percentage: {
              $round: [{ $multiply: [{ $divide: ['$totalAmount', totalAmount] }, 100] }, 2]
            }
          }
        }
      ]);

    // Percentage of 'Others': 100 - the sum of the percentages for the top 4 categories
    const sumTopPercentages = topCategories.reduce((sum, cat) => sum + cat.percentage, 0);
    const sumTopAmount = topCategories.reduce((sum, cat) => sum + cat.totalAmount, 0);
    const othersPercentage = +(100 - sumTopPercentages).toFixed(2);

    // Check if 'Others' percentage > 0. If yes, add "Others" to the report
    if (othersPercentage > 0) {
      topCategories.push({
        category: 'Others',
        totalAmount: totalAmount - sumTopAmount,
        percentage: othersPercentage
      });
    }

    return topCategories;
  } catch (error) {
    console.error('Error generating category report:', error);
    throw error;
  }
}

export async function groupReportUsers(groupType, groupId) {
    try {
      // Determine the correct group field based on the groupType - groupId is checked by the caller (route)
      let matchGroup = {};
      if(groupType === 'budgetGroup'){
          matchGroup = { budgetGroupId: new mongoose.Types.ObjectId(groupId)};
      }
      else if (groupType === 'savingGroup'){
          matchGroup = { savingGroupId: new mongoose.Types.ObjectId(groupId)};
      } else {
          throw "GroupReport-User: Invalid group type: budgetGroup or savingGroup only."
      }
      // Group total
      const totalResult = await Transaction.aggregate([
          { $match: matchGroup},
          {
            $group: {
                _id: null,
                totalAmount: { $sum: '$amount' }
            }
          }
      ]);
    
      const totalAmount = totalResult.length > 0 ? totalResult[0].totalAmount : 0;
      if(totalAmount == 0) return [];
  
      const topUsers = await Transaction.aggregate([
          { $match: matchGroup },
          {
            $group: {
                _id: '$userId',
                totalAmount: { $sum: '$amount' }
            }
          },
          {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
          },
          { $unwind: '$user' },
          // Get top 4 users with highest totalAmount
          { $sort: { totalAmount: -1 } }, 
          { $limit: 4 }, 
          // Show users + percentage + totalAmount
          {
            $project: {
                _id: 0,
                user: '$user.fullname', // full name or username?
                totalAmount: 1,
                percentage: {
                    $round: [{ $multiply: [{ $divide: ['$totalAmount', totalAmount] }, 100] }, 2]
                }
            }
          }
        ]);
  
      // Percentage of 'Others': 100 - the sum of the percentages for the top 4 categories
      const sumTopPercentages = topUsers.reduce((sum, cat) => sum + cat.percentage, 0);
      const sumTopAmount = topUsers.reduce((sum, cat) => sum + cat.totalAmount, 0);
      const othersPercentage = +(100 - sumTopPercentages).toFixed(2);
  
      // Check if 'Others' percentage > 0. If yes, add "Others" to the report
      if (othersPercentage > 0) {
        topUsers.push({
          user: 'Others',
          totalAmount: totalAmount - sumTopAmount,
          percentage: othersPercentage
        });
      }
  
      return topUsers;
    } catch (error) {
      console.error('Error generating users report:', error);
      throw error;
    }
}

export async function groupReportTransactions(groupType, groupId, filter) {
  try {
    // Determine the correct group field based on the groupType
    let matchGroup = {};
    if(groupType === 'budgetGroup'){
        matchGroup = { budgetGroupId: new mongoose.Types.ObjectId(groupId)};
    }
    else if (groupType === 'savingGroup'){
        matchGroup = { savingGroupId: new mongoose.Types.ObjectId(groupId)};
    } else {
        throw "GroupReport-User: Invalid group type: budgetGroup or savingGroup only."
    }

    let sortCondition = {};

    switch (filter) {
      case 'latest':
        sortCondition = { createdDate: -1 };
        break;
      case 'earliest':
        sortCondition = { createdDate: 1 };
        break;
      case 'highest':
        sortCondition = { amount: -1 };
        break;
      case 'lowest':
        sortCondition = { amount: 1 };
        break;
      default:
        throw new Error('Invalid filter');
    }

    // Fetch transactions with the specified filter
    const transactions = await Transaction.find(matchGroup)
      .sort(sortCondition);

    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}