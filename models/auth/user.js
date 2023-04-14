const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Schema = mongoose.Schema
const userSchema = new Schema({
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        default: null,
        //   select: false,
    },
    notification_type: {
        type: Number,
        default: 0, // 0 - Email, 1 - SMS
    },
    authorization_type: {
        type: Number,
        default: 0, // 0 - Restricted, 1 - Non-restricted
    },
    name: {
        type: String,
        required: true,
    },
    mobile: {
        type: String,
        required: true,
    },
    department: {
        type: mongoose.Schema.ObjectId,
        ref: "DepartmentMaster",
        default: null,
    },
    designation: {
        type: mongoose.Schema.ObjectId,
        ref: "DesignationMaster",
        default: null,
    },
    employee_id: {
        type: String,
        default: null,
    },
    gender: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    created_by: {
        type: String,
    },
    updated_by: {
        type: String,
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
    otp_value: {
        type: Number,
        default: null,
    },
    otp_created_time: {
        type: Date,
        default: null,
    },
    block_expiry_time: {
        type: Date,
        default: null,
    },
    api_block_time: {
        type: Date,
        default: null,
    },
    block_status: {
        type: Number,
        required: true,
        default: "0",
    },
    verified: {
        type: Boolean,
        default: false,
    },
    user_role: {
        type: Number, // admin=> 1, librarian=> 2 , employee=> 3, other=> 4
        required: true,
    },
    token: {
        type: String,
        default: null
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
});

userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
});


module.exports = mongoose.model("User", userSchema);