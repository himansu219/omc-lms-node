const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const maximumBookIssuedHistorySchema = new Schema({
    maximumBookIssued: {
        type: String,
        default: null
    },
    created_by: {
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

maximumBookIssuedHistorySchema.plugin(uniqueValidator);

module.exports = mongoose.model("MaximumBookIssuedHistory", maximumBookIssuedHistorySchema);