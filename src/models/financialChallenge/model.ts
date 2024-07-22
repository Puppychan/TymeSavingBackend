import mongoose, {Schema} from 'mongoose';
import { ChallengeCategory, ChallengeScope, IFinancialChallenge } from './interface';

const financialChallengeSchema: Schema = new Schema({
  name: {type: String, required: true},
  description: {type: String},
  category: {
    type: String, 
    enum: Object.values(ChallengeCategory),
    required: true
  },
  checkpoints: {
    type: [Schema.Types.ObjectId],
    ref: 'ChallengeCheckpoint',
    default: []
  },

  members: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  memberProgress: {
    type: [Schema.Types.ObjectId],
    ref: 'ChallengeProgress',
    default: []
  },
  
  scope: {
    type: String,
    enum: Object.values(ChallengeScope),
    required: true
  },
  savingGroupId: {
    type: mongoose.Types.ObjectId,
    ref: 'GroupSaving'
  },
  budgetGroupId: {
    type: mongoose.Types.ObjectId,
    ref: 'SharedBudget'
  },
  
  createdDate: {type: Date, default: Date.now()},
  startDate: {type: Date},
  endDate: {type: Date},

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const FinancialChallenge = mongoose.models.FinancialChallenge || mongoose.model<IFinancialChallenge>('FinancialChallenge', financialChallengeSchema);

export default FinancialChallenge;
