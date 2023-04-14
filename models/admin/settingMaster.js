const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const settingSchema = new Schema({
    bookReturnDays: {
        type: String,
        default: null
    },
    maximumBookIssued: {
        type: String,
        default: null
    },
    reminderOne: {
        type: String,
        default: null
    },
    reminderTwo: {
        type: String,
        default: null
    },
    host: {
        type: String,
        default: null
    },
    port: {
        type: String,
        default: null
    },
    service: {
        type: String,
        default: null
    },
    username: {
        type: String,
        default: null
    },
    password: {
        type: String,
        default: null
    },
    protocol: {
        type: String,
        default: null
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
    reviewApproval: {
        type: Number,
        required: true,
        default: "0",
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
});

settingSchema.plugin(uniqueValidator);

module.exports = mongoose.model("SettingMaster", settingSchema);