const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const relatedInfoSchema = new Schema({
    bookId: { //bookMaster.js
        type: mongoose.Schema.ObjectId,
        ref: "BookMaster",
        required: true
    },
    urlType: {
        type: Number, // 1 -> video, 2-> pdf, 3-> link
        required: true
    },
    title: {
        type: String,
        required: true,
    },
    url: {
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

// relatedInfoSchema.path('url').validate((val) => {
//     urlRegex = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
//     return urlRegex.test(val);
// }, 'Invalid URL.');

relatedInfoSchema.plugin(uniqueValidator);

module.exports = mongoose.model("RelatedInfoMaster", relatedInfoSchema);