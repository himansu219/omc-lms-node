const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const bookRatingSchema = new Schema({
    issueID: {
        type: mongoose.Schema.ObjectId,
        ref: "BookIssue",
        required: true
    },
    employeeID: { // user table id (user.js)
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
    },
    bookMasterID: {
        type: mongoose.Schema.ObjectId,
        ref: "BookMaster",
        required: true
    },
    rating: {
        type: Number,
        required: true,
    },
    review: {
        type: String,
        default: null
    },
    active: {
        type: Number,
        required: true,
        default: "0", // 0 => Rating Submitted, 1 => Rating accepted by admin , 2 => Rating rejected by admin, 3 => Rating resubmitted
    },
    remark: {
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
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
});

bookRatingSchema.plugin(uniqueValidator);

module.exports = mongoose.model("BookRating", bookRatingSchema);