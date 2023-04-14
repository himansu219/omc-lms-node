const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const bookRequestSchema = new Schema({
    bookID: { // book master table id (bookMaster.js)
        type: mongoose.Schema.ObjectId,
        ref: "BookMaster",
        required: true,
    },
    employeeID: { // user table id (user.js)
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
    },
    bookRequestStatus: { // 1 => requested , 2=> issued , 3 => denied
        type: Number,
        required: true,
    },
    bookIssueId: {
        type: mongoose.Schema.ObjectId,
        ref: "BookIssue",
        default: null
    },
    notifyStatus: {
        type: Number,
        required: true,
        default: "0",
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

bookRequestSchema.plugin(uniqueValidator);

module.exports = mongoose.model("BookRequest", bookRequestSchema);