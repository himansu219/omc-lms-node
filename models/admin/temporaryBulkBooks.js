const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const temporaryBulkBooksSchema = new Schema({
    bookType: {
        type: Number, // 1 -> book, 2-> magazine, 3-> journal
        required: true,
    },
    title: {
        type: String,
        default: null,
    },
    authorID: [{ // authorMaster.js
        type: mongoose.Schema.ObjectId,
        ref: "AuthorMaster",
        default: null,
    }],
    genreID: { // genreMaster.js
        type: mongoose.Schema.ObjectId,
        ref: "GenreMaster",
        default: null,
    },
    edition: {
        type: String,
        default: null,
    },
    pages: {
        type: Number,
        default: null,
    },
    publisherID: [{ // publisherMaster.js
        type: mongoose.Schema.ObjectId,
        ref: "PublisherMaster",
        default: null,
    }],
    publishedYear: {
        type: String,
        default: null,
    },
    description: {
        type: String,
        default: null,
    },
    language: {
        type: String,
        default: null,
    },
    front_image: {
        type: String,
        default: null,
    },
    volume: {
        type: String,
        default: null,
    },
    issue: {
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

temporaryBulkBooksSchema.plugin(uniqueValidator);

module.exports = mongoose.model("TemporaryBulkBooks", temporaryBulkBooksSchema);