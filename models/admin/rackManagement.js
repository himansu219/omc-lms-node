const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const rackManagementSchema = new Schema({
    rackID: { // library master table id (libraryMaster.js)
        type: mongoose.Schema.ObjectId,
        ref: "LibraryMaster",
        required: true
    },
    bookID: { // book master table id (bookMaster.js)
        type: mongoose.Schema.ObjectId,
        ref: "BookMaster",
        default: null
    },
    bookType: { // book master table id (bookMaster.js)
        type: Number,
        required: true,
        default: null
    },
    rackID: { // library master table id (libraryMaster.js)
        type: mongoose.Schema.ObjectId,
        ref: "LibraryMaster",
        required: true
    },
    shelfID: { // book master table id (bookMaster.js)
        type: mongoose.Schema.ObjectId,
        ref: "BookMaster",
        required: true,
    },
    qrCodeID: { // qr code Details table id (qrCodeDetails.js)
        type: mongoose.Schema.ObjectId,
        ref: "BookMaster",
        required: true,
    },
    bookRefNo: { // book details master table book ref no
        type: Number,
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

rackManagementSchema.plugin(uniqueValidator);

module.exports = mongoose.model("RackManagement", rackManagementSchema);