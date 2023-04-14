const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const bookRequisitionSchema = new Schema({
    employeeID: { // user table id (user.js)
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
    },
    bookName: {
        type: String,
        required: true
    },
    authorName: {
        type: String,
        required: true
    },
    publisherName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: null,
    },
    requisitionStatus: { // 1-> pending, 2-> approve, 3-> cancelled, 4-> add to library
        type: Number,
        required: true,
        default: "1",
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

bookRequisitionSchema.plugin(uniqueValidator);

module.exports = mongoose.model("BookRequisition", bookRequisitionSchema);