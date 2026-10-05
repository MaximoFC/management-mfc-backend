import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['alert', 'reminder'],
    required: true
  },
  message_body: {
    type: String,
    required: true
  },
  bikepart_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BikePart', index: true },
  budget_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Budget' },
  service_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  seen: {
    type: Boolean,
    default: false
  },
  creation_date: {
    type: Date,
    default: Date.now
  }
});

NotificationSchema.index({ creation_date: -1 });

export default mongoose.model('Notification', NotificationSchema);