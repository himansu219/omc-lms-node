const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;
const authorSchema = new Schema({
    first_name: {
        type: String,
        required: true,
    },
    middle_name: {
        type: String,
        default: null
    },
    last_name: {
        type: String,
        default: null
    },
    profile_image: {
        type: String,
        default: null
    },
    description: {
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

authorSchema.plugin(uniqueValidator);

module.exports = mongoose.model("AuthorMaster", authorSchema);