const mongoose = require("mongoose");

const authAttemptSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
    },
    ipAddress: {
        type: String,
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
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
});

authAttemptSchema.pre(/^find/, function(next) {
    this.populate({
        path: "user",
        select: "id name email",
    });

    next();
});
module.exports = mongoose.model("AuthAttempt", authAttemptSchema);