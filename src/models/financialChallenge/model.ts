import mongoose, {Schema} from 'mongoose';
import { ChallengeCategory, IFinancialChallenge } from './interface';

// Define the schema for the user
const financialChallengeSchema: Schema = new Schema({
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {type: String, required: true},
  description: {type: String},
  category: {
    type: String, 
    enum: Object.values(ChallengeCategory),
  },
  checkPoint: {type: Number, default: 0, required: true},
  createdDate: {type: Date, default: Date.now()},
  startDate: {type: Date, required: true},
  endDate: {type: Date, required: true},
});

const FinancialChallenge = mongoose.models.FinancialChallenge || mongoose.model<IFinancialChallenge>('FinancialChallenge', financialChallengeSchema);

export default FinancialChallenge;
