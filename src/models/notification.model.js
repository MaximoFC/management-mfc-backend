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
  seen: {
    type: Boolean,
    default: false
  },
  creation_date: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Notification', NotificationSchema);