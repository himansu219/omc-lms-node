const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const BookJournalMagazineTypeMasterSchema = new Schema({
    typeId: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
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

BookJournalMagazineTypeMasterSchema.plugin(uniqueValidator);

module.exports = mongoose.model("BookJournalMagazineTypeMaster", BookJournalMagazineTypeMasterSchema);