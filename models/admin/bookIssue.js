const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const bookIssueSchema = new Schema({
    libraryID: { // library master table id (libraryMaster.js)
        type: mongoose.Schema.ObjectId,
        ref: "LibraryMaster",
        required: true
    },
    bookID: { // book details master table id (bookDetailsMaster.js)
        type: mongoose.Schema.ObjectId,
        ref: "BookDetailsMaster",
        required: true,
    },
    employeeID: { // user table id (user.js)
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
    },
    issueDate: {
        type: Date,
        required: true,
    },
    returnDate: {
        type: Date,
        required: true,
    },
    bookReturnStatus: { // 0 => issued (not available), 1 => returned (available)
        type: Number,
        required: true,
        default: "0",
    },
    bookStatus: { // 1 => Good Condition, 2 => moderate, 3 => damaged, 4 => lost
        type: Number,
        required: true,
        default: 1,
    },
    remark: {
        type: String,
        default: null,
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

bookIssueSchema.plugin(uniqueValidator);

module.exports = mongoose.model("BookIssue", bookIssueSchema);