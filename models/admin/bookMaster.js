const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const bookSchema = new Schema({
    bookType: {
        type: Number, // 1 -> book, 2-> magazine, 3-> journal
        required: true,
    },
    magazine_type: {
        type: Number,
        default: 0, // 0 -> null, 1 -> Monthly, 2-> Weekly, 3-> Bi-weekly
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
        default: 0,
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
    quantity: {
        type: Number,
        default: null,
    },
    availableQuantity: {
        type: Number,
        default: null,
    },
    assignedQuantity: {
        type: Number,
        default: null,
    },
    damageQuantity: {
        type: Number,
        default: null,
    },
    lostQuantity: {
        type: Number,
        default: null,
    },
    back_image: {
        type: String,
        default: null,
    },
    rating: {
        type: String,
        required: true,
        default: "0",
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
        default: "0",
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

bookSchema.plugin(uniqueValidator);

module.exports = mongoose.model("BookMaster", bookSchema);