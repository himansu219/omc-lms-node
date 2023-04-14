const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const bookRatingHistorySchema = new Schema({
    ratingMasterId: {
        type: mongoose.Schema.ObjectId,
        ref: "BookRating",
        required: true
    },
    rating: {
        type: Number,
        default: null
    },
    review: {
        type: String,
        default: null
    },
    active: {
        type: Number,
        required: true,
        default: "0", // 0 => Rating Submitted, 1 => Rating accepted by admin , 2 => Rating rejected by admin, 3 => Rating resubmitted
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

bookRatingHistorySchema.plugin(uniqueValidator);

module.exports = mongoose.model("BookRatingHistory", bookRatingHistorySchema);