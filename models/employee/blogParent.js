const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const blogParentSchema = new Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true
    },
    bookId: {
        type: mongoose.Schema.ObjectId,
        ref: "BookMaster",
        default: null
    },
    bookRefNum: {
        type: String,
        default: null
    },
    description: {
        type: String,
        required: true
    },
    img: {
        type: String,
        default: null
    },
    relation: {
        type: mongoose.Schema.ObjectId,
        ref: "UserRelationMaster",
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

blogParentSchema.plugin(uniqueValidator);

module.exports = mongoose.model("BlogParent", blogParentSchema);