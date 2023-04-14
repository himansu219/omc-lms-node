const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const designationSchema = new Schema({
    designationName: {
        type: String,
        required: true,
    },
    departmentID: { //departmentMaster.js
        type: mongoose.Schema.ObjectId,
        ref: "DepartmentMaster",
        required: true
    },
    referenceNumber: {
        type: Number, // unique incremental number
        required: true,
        unique: true,
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

designationSchema.plugin(uniqueValidator);

module.exports = mongoose.model("DesignationMaster", designationSchema);