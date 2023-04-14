const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const eBookSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    authorID: [{ // authorMaster.js
        type: mongoose.Schema.ObjectId,
        ref: "AuthorMaster",
    }],
    genreID: { // genreMaster.js
        type: mongoose.Schema.ObjectId,
        ref: "GenreMaster",
        required: true,
    },
    edition: {
        type: String,
        required: true,
    },
    pages: {
        type: Number,
        required: true,
    },
    publisherID: [{ // publisherMaster.js
        type: mongoose.Schema.ObjectId,
        ref: "PublisherMaster",
    }],
    publishedYear: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    language: {
        type: String,
        required: true,
    },
    front_image: {
        type: String,
        required: true,
    },
    back_image: {
        type: String
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
    type: {
        type: Number, // 1:- PDF, 2:- Link
        required: true
    },
    downloadURL: {
        type: String,
        required: true
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
});

eBookSchema.plugin(uniqueValidator);

module.exports = mongoose.model("eBook", eBookSchema);