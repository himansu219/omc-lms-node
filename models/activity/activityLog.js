const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const activitySchema = new Schema({
    ipAddress: {
        type: String,
        required: true,
    },
    pageDetail: {
        type: String,
        required: true,
    },
    operationType: {
        type: String,
        required: true,
    },
    userType: {
        type: String,
        required: null,
    },
    created_by: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        default: null
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
});

activitySchema.plugin(uniqueValidator);

module.exports = mongoose.model("Activity", activitySchema);