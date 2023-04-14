const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const itemSettingsSchema = new Schema({
    itemType: {
        type: Number, // 1 -> book, 2-> magazine, 3-> journal
        required: true,
    },
    itemTypeType: {
        type: Number, // if magazine 1 -> monthly, 2-> weekly, 3-> bi-weekly
        default: null
    },
    returnPeriod: {
        type: Number, 
        required: true,
    },
    itemIssue: {
        type: Number, 
        required: true,
    },
    alertOne: {
        type: Number, 
        required: true,
    },
    itemTwo: {
        type: Number, 
        required: true,
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
        default: "0",
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

itemSettingsSchema.plugin(uniqueValidator);

module.exports = mongoose.model("ItemSettingsMaster", itemSettingsSchema);