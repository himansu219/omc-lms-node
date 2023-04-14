const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const qrCodeDetailsSchema = new Schema({
    qrCodeId: {
        type: mongoose.Schema.ObjectId,
        ref: "QrCode",
        required: true
    },
    qrCodePath: {
        type: String,
        default: null
    },
    isAssigned: {
        type: Number,
        required: true,
        default: "0",
    },
    bookDetailMasterId: {
        type: mongoose.Schema.ObjectId,
        ref: "BookDetailsMaster",
        default: null
    },
    bookReferenceNumber: { // unique incremental number
        type: String,
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

qrCodeDetailsSchema.plugin(uniqueValidator);

module.exports = mongoose.model("qrCodeDetails", qrCodeDetailsSchema);