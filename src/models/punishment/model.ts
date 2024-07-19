import mongoose, {Schema} from 'mongoose';
import { IPunishment, PunishmentCategory } from './interface';

const punishmentPriceSchema: Schema = new Schema({
  category: {
    type: String,
    enum: Object.values(PunishmentCategory),
    required: true
  },
  value: {type: Schema.Types.Mixed, required: true}
});


// Define the schema for the user
const punishmentSchema: Schema = new Schema({
  name: {type: String, required: true},
  description: {type: String},
  price: {
    type: [punishmentPriceSchema], 
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const Punishment = mongoose.models.Punishment || mongoose.model<IPunishment>('Punishment', punishmentSchema);

export default Punishment;
