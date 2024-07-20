import mongoose, {Schema} from 'mongoose';
import { ChallengeCategory, IFinancialChallenge } from './interface';

const memberProgressSchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentProgress: {type: Number, required: true, default: 0},
  lastUpdate: {type: Date, required: true, default: Date.now()},
  checkpointPassed: {
    type: [Schema.Types.ObjectId],
    ref: 'ChallengeCheckpoint',
    default: []
  },
});

const financialChallengeSchema: Schema = new Schema({
  name: {type: String, required: true},
  description: {type: String},
  category: {
    type: String, 
    enum: Object.values(ChallengeCategory),
    required: true
  },
  challengeCheckpoint: {
    type: [Schema.Types.ObjectId],
    ref: 'ChallengeCheckpoint',
    required: true,
    default: []
  },

  progress: {
    type: [memberProgressSchema], 
    default: []
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
