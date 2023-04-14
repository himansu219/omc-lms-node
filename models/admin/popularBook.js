const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const popularBookSchema = new Schema({
    bookMasterID: { // book details master table id (bookDetailsMaster.js)
        type: mongoose.Schema.ObjectId,
        ref: "BookMaster",
        required: true,
    },
    noOfIssue: {
        type: Number,
        required: true,
    },
    noOfRequest: {
        type: Number,
        required: true,
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

popularBookSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Popularbook", popularBookSchema);