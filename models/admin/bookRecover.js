const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const bookRecoverSchema = new Schema({
    bookMasterId: { // book master table id (bookMaster.js)
        type: mongoose.Schema.ObjectId,
        ref: "BookMaster",
        required: true,
    },
    bookdetailsMasterId: { // book details master table id (BookDetailsMaster.js)
        type: mongoose.Schema.ObjectId,
        ref: "BookDetailsMaster",
        required: true,
    },
    bookRefNumber: { // book details master table id (BookDetailsMaster.js)
        type: String,
        required: true,
    },
    itemStatus: {
        type: String,
        default: null,
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

bookRecoverSchema.plugin(uniqueValidator);

module.exports = mongoose.model("BookRecover", bookRecoverSchema);