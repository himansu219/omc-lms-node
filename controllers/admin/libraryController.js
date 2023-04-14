const catchAsync = require("../../utils/catchAsync");
const LibraryMaster = require("../../models/admin/libraryMaster");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const Activity = require("../../models/activity/activityLog");

exports.store = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    const existingLibraryByName = await LibraryMaster.findOne({
        libraryName: req.body.library_name,
        status: 1,
        deleted: 0
    });

    if (existingLibraryByName) {
        return next(
            new AppError("Library already exists", 400, { type: "duplicate library name" })
        );
    }

    const newLibrary = await LibraryMaster.create({
        libraryName: req.body.library_name,
        created_by: userId
    });

    if (newLibrary) {

        const data = {
            title: newLibrary.libraryName,
            id: newLibrary._id,
        };

        response.createResponse({
            message: "Library name successfully added",
            library: data,
        });
    } else {
        return next(new AppError("Something went wrong", 500));
    }
});

exports.libraryList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const libraryDetails = await LibraryMaster.find({
        status: 1,
        deleted: 0,
    }, {
        'libraryName': 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total library count= ${ libraryDetails.length }`,
        libraryList: libraryDetails
    });

});