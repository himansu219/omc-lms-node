const catchAsync = require("../../utils/catchAsync");
const BookIssue = require("../../models/admin/BookIssue");
const Bookrating = require("../../models/employee/bookRating");
const BookRatingHistory = require("../../models/employee/bookRatingHistory");
const BookMaster = require("../../models/admin/BookMaster");
const BookDetailsMaster = require("../../models/admin/BookDetailsMaster");
const User = require("../../models/auth/user");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const SettingMaster = require("../../models/admin/settingMaster");
const requestIp = require('request-ip');
const Activity = require("../../models/activity/activityLog");

exports.ratingStore = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';
    let bookId;

    if (!req.body.bookId) {
        return next(new AppError("Book details not found", 500))
    } else {
        const checkID = await BookMaster.findById(req.body.bookId, {
            deleted: 0
        });

        if (checkID) {
            bookId = req.body.bookId;
        } else {
            return next(new AppError("Book details not found.", 500));
        }
    }

    if (!req.body.employeeID) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.employeeID, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.employeeID;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    const bookDetailsList = await BookDetailsMaster.find({
        bookID: bookId
    }, {
        "_id": 1
    });

    const bookIssuelist = await BookIssue.find({
        bookID: { $in: bookDetailsList },
        employeeID: userId,
    });

    if (bookIssuelist.length > 0) {

        let issueId = bookIssuelist[0]._id;

        if (!req.body.rating) {
            return next(
                new AppError("Please add rating", 400, { type: "blank_data" })
            );
        }

        const checkratingStatus = await Bookrating.findOne({
            employeeID: userId,
            bookMasterID: bookId,
            deleted: 0,
        });

        let review;

        if (req.body.review) {
            review = req.body.review;
        } else {
            review = null;
        }

        let reviewApproval;

        const existingSettingByDetails = await SettingMaster.findOne({
            status: 1,
            deleted: 0
        }, {
            'reviewApproval': 1
        });

        if (existingSettingByDetails.reviewApproval == 0) {
            reviewApproval = 1;
        } else {
            reviewApproval = 0;
        }

        if (checkratingStatus) {

            const updateReview = await Bookrating.findByIdAndUpdate(checkratingStatus._id, {
                rating: req.body.rating,
                review: review,
                updated_by: userId
            });

            if (updateReview) {

                await BookRatingHistory.create({
                    ratingMasterId: updateReview._id,
                    rating: req.body.rating,
                    review: review,
                    created_by: userId
                });

                const data = {
                    id: updateReview._id,
                };

                response.createResponse({
                    message: "Thank you for your feedback.",
                    setting: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }

        } else {

            const storeRating = await Bookrating.create({
                issueID: issueId,
                employeeID: userId,
                bookMasterID: bookId,
                rating: req.body.rating,
                review: review,
                active: reviewApproval,
                created_by: userId
            });

            await BookRatingHistory.create({
                ratingMasterId: storeRating._id,
                rating: req.body.rating,
                review: review,
                created_by: userId
            });

            const bookrating = await Bookrating.aggregate([{
                    $match: {
                        active: 1
                    }
                },
                {
                    $group: {
                        _id: "$bookMasterID",
                        avgRating: { $avg: "$rating" }
                    }

                }
            ]);

            if (bookrating.length > 0) {

                try {

                    for (const iterator of bookrating) {
                        await BookMaster.findByIdAndUpdate(iterator._id, {
                            rating: iterator.avgRating.toFixed(1)
                        });
                        //console.log("success");
                    }
                } catch (err) {
                    console.log(err);
                }
            }

            if (storeRating) {

                const empName = await User.findById(userId, {
                    deleted: 0
                });

                const bookMaster = await BookMaster.findById(bookId, {
                    deleted: 0
                });

                const clientIp = requestIp.getClientIp(req);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Rating Added",
                    operationType: `Rating/ Reviews Added - Against <a href="/reviews"><b>${ bookMaster.title }</b> by ${empName.name}.</a>`,
                    userType: "Employee",
                    created_by: userId
                });

                const data = {
                    id: storeRating._id,
                };

                response.createResponse({
                    message: "Thank you for your feedback.",
                    setting: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        }

    } else {
        new AppError("Book not issued", 400, { type: "not_yet_issued" })
    }
});

exports.ratingDestroy = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.ratingID) {
        return next(new AppError("Rating details not found", 500));
    }

    try {

        const deleteRating = await Bookrating.findByIdAndUpdate(req.body.ratingID, {
            deleted: 1,
            updated_by: userId
        });

        if (deleteRating) {

            const data = {
                id: deleteRating._id,
            };

            response.createResponse({
                message: "Rating deleted successfully.",
                rating: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.ratingReSubmitted = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);


    if (!req.body.ratingId) {
        return next(new AppError("Rating details not found", 500));
    }

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500));
    }

    if (!req.body.bookId) {
        return next(new AppError("Book details not found", 500));
    }

    try {

        const checkID = await Bookrating.findOne({
            _id: req.body.ratingId,
            status: 1,
            deleted: 0,
            active: 2
        }, {
            "active": 1,
            "rating": 1,
            "review": 1
        });

        if (checkID) {

            response.createResponse({
                ratingData: checkID,
            });
        } else {
            return next(new AppError("Rating details not found", 500));
        }
    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.ratingReSubmittedEdit = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';
    let bookId;

    if (!req.body.bookId) {
        return next(new AppError("Book details not found", 500))
    } else {
        const checkID = await BookMaster.findById(req.body.bookId, {
            deleted: 0
        });

        if (checkID) {
            bookId = req.body.bookId;
        } else {
            return next(new AppError("Book details not found.", 500));
        }
    }

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checksID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checksID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (!req.body.rating) {
        return next(
            new AppError("Please add rating", 400, { type: "blank_data" })
        );
    }

    let review;

    if (req.body.review) {
        review = req.body.review;
    } else {
        review = null;
    }

    const checkratingStatus = await Bookrating.findOne({
        employeeID: userId,
        _id: req.body.ratingId,
        active: 2,
        deleted: 0
    });

    if (checkratingStatus) {
        const updateReview = await Bookrating.findByIdAndUpdate(req.body.ratingId, {
            rating: req.body.rating,
            review: review,
            active: 3,
            updated_by: userId
        });

        if (updateReview) {

            await BookRatingHistory.create({
                ratingMasterId: updateReview._id,
                rating: req.body.rating,
                review: review,
                created_by: userId
            });

            const data = {
                id: updateReview._id,
            };

            response.createResponse({
                message: "Thank you for your feedback.",
                setting: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } else {
        return next(new AppError("Rating details not found", 500));
    }

});

exports.ratingStatus = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId;
    let bookId;

    if (!req.body.bookId) {
        return next(new AppError("Book details not found", 500))
    } else {
        const checkID = await BookMaster.findById(req.body.bookId, {
            deleted: 0
        });

        if (checkID) {
            bookId = req.body.bookId;
        } else {
            return next(new AppError("Book details not found.", 500));
        }
    }

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checksID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checksID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    const checkratingStatus = await Bookrating.findOne({
        employeeID: userId,
        bookMasterID: bookId,
        active: { $in: [0, 2, 3] },
        deleted: 0
    }, {
        'active': 1,
        'employeeID': 1,
        'bookMasterID': 1,
        'rating': 1,
        'review': 1,
        'createdAt': 1,
        'remark': 1,
    });

    let checkBookratings = {};

    let currentTime = new Date().getTime();

    let minuteValue = "";


    if (checkratingStatus) {

        let expireTime = new Date(checkratingStatus.createdAt).getTime();

        let timeLeft = Math.trunc((currentTime - expireTime) / 3600000);

        if (timeLeft >= 24) {

            timeLeft = Math.trunc(timeLeft / 24);

            if (timeLeft == 1) {
                minuteValue = "day";
            } else {
                minuteValue = "days";
            }

        } else {

            if (timeLeft === 1) {
                minuteValue = "hour";
            } else {
                minuteValue = "hours";
            }
        }

        if (timeLeft === 0) {

            timeLeft = Math.trunc(((currentTime - expireTime) / 3600000) * 60);

            if (timeLeft === 1) {
                minuteValue = "minute";
            } else {
                minuteValue = "minutes";
            }
        }

        if (timeLeft === 0) {

            timeLeft = Math.trunc(((currentTime - expireTime) / 3600000) * 60 * 60);

            if (timeLeft === 1) {
                minuteValue = "second";
            } else {
                minuteValue = "seconds";
            }
        }

        checkBookratings['data'] = checkratingStatus;
        checkBookratings['time'] = `${timeLeft} ${minuteValue} ago`;

        response.createResponse({
            response: checkBookratings,
        });

    } else {
        response.createResponse({
            message: "No data found",
            response: checkBookratings
        });
    }

});