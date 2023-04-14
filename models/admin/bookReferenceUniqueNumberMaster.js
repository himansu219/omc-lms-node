const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const bookRefNumSchema = new Schema({
    bookRefNumber: {
        type: Number,
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

bookRefNumSchema.plugin(uniqueValidator);

module.exports = mongoose.model("BookReferenceUniqueNumberMaster", bookRefNumSchema);