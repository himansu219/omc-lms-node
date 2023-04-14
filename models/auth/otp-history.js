const mongoose = require("mongoose");

const otpHistorySchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    otp: {
      type: Number,
      required: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

otpHistorySchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "id name email",
  });

  next();
});
module.exports = mongoose.model("OTPHistory", otpHistorySchema);
