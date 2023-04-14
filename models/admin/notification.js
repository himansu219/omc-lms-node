const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    user_id: {
        type: String,
        required: true,
    },
    notification_for: { // user.js
        type: mongoose.Schema.ObjectId,
        ref: "User",
    },
    notification_type: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    is_read: {
        type: Number,
        required: true,
        default: 0
    },
    notificationRole: {
        type: Number,
        required: true,
        default: 0 // 1-> admin,lib/other  2->emp        
    },
    created_by: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        default: null
    },
    updated_by: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        default: null
    },
    status: {
        type: Number,
        required: true,
        default: "1",
    },
    deleted: {
        type: Number,
        required: true,
        default: "0",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
});

notificationSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Notification", notificationSchema);