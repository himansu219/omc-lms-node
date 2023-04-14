const catchAsync = require("../../utils/catchAsync");
const Bookrating = require("../../models/employee/bookRating");
const BookRatingHistory = require("../../models/employee/bookRatingHistory");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const Activity = require("../../models/activity/activityLog");
const requestIp = require('request-ip');
const Notification = require("../../models/admin/notification");
const User = require("../../models/auth/user");
const BookMaster = require("../../models/admin/BookMaster");

exports.changeRating = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    
    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.ratingID) {
        return next(new AppError("Rating details not found", 500));
    }

    if (!req.body.ratingStatus) {
        return next(new AppError("Rating status not found", 500));
    }

    try {

        let status;
        let statusUpdated;

        if (req.body.ratingStatus == 1) {
            status = 1;
            statusUpdated = "Accepted";
        } else {
            status = 2;
            statusUpdated = "Rejected";
        }

        const changeRating = await Bookrating.findByIdAndUpdate(req.body.ratingID, {
            active: status,
            remark: req.body.remark,
            updated_by: userId
        });

        const empName = await User.findById(changeRating.employeeID, {
            deleted: 0
        });

        const bookName = await BookMaster.findById(changeRating.bookMasterID, {
            deleted: 0
        });

        if (changeRating) {

            await Notification.create({
                user_id: userId,
                notification_for: changeRating.employeeID,
                notificationRole: 2,
                notification_type: "Rating",
                message: `Review status updated successfully.`,
                created_by: userId
            });

            await BookRatingHistory.create({
                ratingMasterId: changeRating._id,
                rating: changeRating.rating,
                review: changeRating.review,
                active: status,
                created_by: userId
            });

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Review Updated",
                operationType: `Review Upadted - <a href="/reviews">Given by <b>${empName.name}</b> on <b>${bookName.title}</b> has been <b>${statusUpdated}</b></a>`,
                userType: userType,
                created_by: userId
            });

            const data = {
                id: changeRating._id,
            };

            response.createResponse({
                message: "Review status updated successfully.",
                rating: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.reviewList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    try {

        const reviewDetails = await Bookrating.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $match: {
                    status: 1,
                    deleted: 0
                },
            },
            {
                $lookup: {
                    from: "bookmasters",
                    localField: "bookMasterID",
                    foreignField: "_id",
                    as: "bookMasterDetails"
                },
            },
            {
                $lookup: {
                    from: "authormasters",
                    localField: "bookMasterDetails.authorID",
                    foreignField: "_id",
                    as: "authorMasterDetails"
                },
            },
            {
                $lookup: {
                    from: "publishermasters",
                    localField: "bookMasterDetails.publisherID",
                    foreignField: "_id",
                    as: "publishermastersDetails"
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "employeeID",
                    foreignField: "_id",
                    as: "employeeDetails"
                },
            },
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$employeeDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    "rating": 1,
                    "review": 1,
                    "active": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails._id": 1,
                    "bookMasterDetails.edition": 1,
                    "bookMasterDetails.front_image": 1,
                    "employeeDetails.email": 1,
                    "employeeDetails.name": 1,
                    "employeeDetails.mobile": 1,
                    "employeeDetails.employee_id": 1,
                    "authorMasterDetails.first_name": 1,
                    "authorMasterDetails.middle_name": 1,
                    "authorMasterDetails.last_name": 1,
                    "publishermastersDetails.title": 1
                }
            }
        ]);

        response.successResponse({
            message: `Total review count= ${ reviewDetails.length }`,
            reviewDetails: reviewDetails
        });

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.reviewDetails = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const reviewDetails = await Bookrating.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                $expr: { $eq: ['$_id', { $toObjectId: req.params.id }] },
                deleted: 0
            },
        },
        {
            $lookup: {
                from: "bookmasters",
                localField: "bookMasterID",
                foreignField: "_id",
                as: "bookMasterDetails"
            },
        },
        {
            $lookup: {
                from: "authormasters",
                localField: "bookMasterDetails.authorID",
                foreignField: "_id",
                as: "authorMasterDetails"
            },
        },
        {
            $lookup: {
                from: "publishermasters",
                localField: "bookMasterDetails.publisherID",
                foreignField: "_id",
                as: "publishermastersDetails"
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "employeeID",
                foreignField: "_id",
                as: "employeeDetails"
            },
        },
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$employeeDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "rating": 1,
                "review": 1,
                "active": 1,
                "remark": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.edition": 1,
                "bookMasterDetails.front_image": 1,
                "employeeDetails.email": 1,
                "employeeDetails.name": 1,
                "employeeDetails.mobile": 1,
                "employeeDetails.employee_id": 1,
                "authorMasterDetails.first_name": 1,
                "authorMasterDetails.middle_name": 1,
                "authorMasterDetails.last_name": 1,
                "publishermastersDetails.title": 1
            }
        }
    ]);

    if (reviewDetails.length > 0) {
        response.successResponse({
            message: `Review Details`,
            reviewData: reviewDetails[0]
        });
    } else {
        return next(new AppError("Review details not found.", 500));
    }

});

exports.reviewHistoryList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.params.id) {
        return next(new AppError("Review details not found", 500))
    }

    const checkReviewID = await BookRatingHistory.find({
        ratingMasterId: req.params.id,
        status: 1,
        deleted: 0
    });

    if (checkReviewID.length > 0) {

        try {

            const reviewDetails = await BookRatingHistory.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $match: {
                        status: 1,
                        deleted: 0,
                        $expr: { $eq: ['$ratingMasterId', { $toObjectId: req.params.id }] }
                    },
                },
                {
                    $lookup: {
                        from: "bookratings",
                        localField: "ratingMasterId",
                        foreignField: "_id",
                        as: "bookRatingDetails"
                    },
                },
                {
                    $lookup: {
                        from: "bookmasters",
                        localField: "bookRatingDetails.bookMasterID",
                        foreignField: "_id",
                        as: "bookMasterDetails"
                    },
                },
                {
                    $lookup: {
                        from: "authormasters",
                        localField: "bookMasterDetails.authorID",
                        foreignField: "_id",
                        as: "authorMasterDetails"
                    },
                },
                {
                    $lookup: {
                        from: "publishermasters",
                        localField: "bookMasterDetails.publisherID",
                        foreignField: "_id",
                        as: "publishermastersDetails"
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "bookRatingDetails.employeeID",
                        foreignField: "_id",
                        as: "employeeDetails"
                    },
                },
                { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$employeeDetails", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        "rating": 1,
                        "review": 1,
                        "active": 1,
                        "createdAt": 1,
                        "bookMasterDetails.title": 1,
                        "bookMasterDetails.edition": 1,
                        "employeeDetails.email": 1,
                        "employeeDetails.name": 1,
                        "employeeDetails.mobile": 1,
                        "employeeDetails.employee_id": 1,
                        "authorMasterDetails.first_name": 1,
                        "authorMasterDetails.middle_name": 1,
                        "authorMasterDetails.last_name": 1,
                        "publishermastersDetails.title": 1
                    }
                }
            ]);

            response.successResponse({
                message: `Total review count= ${ reviewDetails.length }`,
                reviewDetails: reviewDetails
            });

        } catch (err) {
            return next(new AppError(err, 500));
        }

    } else {

        return next(new AppError("Review details not found", 500));
    }


});

exports.ratingStatusChange = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.reviewId) {
        return next(new AppError("Review details not found", 500))
    }

    if (!req.body.status) {
        return next(new AppError("Review status not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await Bookrating.find({
            _id: req.body.reviewId
        });

        if (checkDetailsMasterDataId.length == 0) {
            return next(
                new AppError(
                    "Review details not found",
                    500, {
                        type: "review_not_found"
                    }
                )
            );
        }

        let statusValue;

        if (req.body.status == 1) {
            statusValue = 0;
        } else if (req.body.status == 0) {
            statusValue = 1;
        } else {
            return next(
                new AppError(
                    "Undefined status value",
                    500, {
                        type: "undefined_status_value"
                    }
                )
            );
        }

        const statusChange = await Bookrating.findByIdAndUpdate(req.body.reviewId, {
            status: statusValue,
            updated_by: userId
        });

        if (statusChange) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Review Status Change",
                operationType: "Review Status Change",
                userType: userType,
                created_by: userId
            });

            response.createResponse({
                message: "Status changed successfully."
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }

    } catch (err) {
        return next(new AppError(err, 500));
    }

});