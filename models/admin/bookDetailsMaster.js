const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const bookDetailsMasterSchema = new Schema({
    libraryID: { // library master table id (libraryMaster.js)
        type: mongoose.Schema.ObjectId,
        ref: "LibraryMaster",
        required: true
    },
    bookID: { // book master table id (bookMaster.js)
        type: mongoose.Schema.ObjectId,
        ref: "BookMaster",
        required: true,
    },
    bookReferenceNumber: { // unique incremental number
        type: String,
        default: null
    },
    rackManagementID: {
        type: mongoose.Schema.ObjectId,
        ref: "RackManagement",
        default: null
    },
    bookIssueStatus: { // 0 => availble, 1=> already issued to the emp (Not Available)
        type: Number,
        required: true,
    },
    bookStatus: { // 1 => Good Condition, 2 => moderate, 3 => damaged, 4 => lost
        type: Number,
        required: true,
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

bookDetailsMasterSchema.plugin(uniqueValidator);

module.exports = mongoose.model("BookDetailsMaster", bookDetailsMasterSchema);