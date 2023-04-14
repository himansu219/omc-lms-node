const catchAsync = require("../../utils/catchAsync");
const RelatedInfoMaster = require("../../models/admin/RelatedInfoMaster");
const BookMaster = require("../../models/admin/BookMaster");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const Activity = require("../../models/activity/activityLog");
const requestIp = require('request-ip');

exports.storeInfo = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (!req.body.bookId) {
        return next(new AppError("Item details not found", 500))
    } else {

        const checkbookID = await BookMaster.findById(req.body.bookId, {
            deleted: 0
        });

        if (checkbookID) {
            try {

                const existingTitleByName = await RelatedInfoMaster.findOne({
                    bookId: req.body.bookId,
                    title: req.body.title,
                    deleted: 0
                });

                if (existingTitleByName) {
                    return next(
                        new AppError("Title already exists", 400, { type: "duplicate title" })
                    );
                }

                const newInfo = await RelatedInfoMaster.create({
                    bookId: req.body.bookId,
                    urlType: req.body.urlType,
                    title: req.body.title,
                    url: req.body.url,
                    created_by: req.user._id
                });

                if (newInfo) {

                    let userType;
                    if (req.user.user_role == 1) {
                        userType = "Admin"
                    } else if (req.user.user_role == 2) {
                        userType = "Librarian"
                    } else {
                        userType = "Other"
                    }

                    const clientIp = requestIp.getClientIp(req);

                    await Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Item Listing",
                        operationType: `Related info - (${req.body.title}) added for item - ${checkbookID.title}`,
                        userType: userType,
                        created_by: req.user._id
                    });

                    response.createResponse({
                        message: "Related info successfully added"
                    });
                } else {
                    return next(new AppError("Something went wrong", 500));
                }

            } catch (err) {
                return next(new AppError(err, 500));
            }
        } else {
            return next(new AppError("Item details not found.", 500));
        }
    }
});

exports.infoUpdate = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (!req.body.infoId) {
        return next(new AppError("Info details not found", 500));
    }

    if (!req.body.bookId) {
        return next(new AppError("Item details not found", 500))
    } else {

        const checkbookID = await BookMaster.findById(req.body.bookId, {
            deleted: 0
        });

        if (checkbookID) {
            try {

                const existingTitleByName = await RelatedInfoMaster.findOne({
                    _id: { $ne: req.body.infoId },
                    bookId: req.body.bookId,
                    title: req.body.title,
                    deleted: 0
                });

                if (existingTitleByName) {
                    return next(
                        new AppError("Title already exists", 400, { type: "duplicate title" })
                    );
                }

                const updateinfo = await RelatedInfoMaster.findByIdAndUpdate(req.body.infoId, {
                    bookId: req.body.bookId,
                    urlType: req.body.urlType,
                    title: req.body.title,
                    url: req.body.url,
                    updated_by: req.user._id
                });

                if (updateinfo) {

                    let userType;
                    if (req.user.user_role == 1) {
                        userType = "Admin"
                    } else if (req.user.user_role == 2) {
                        userType = "Librarian"
                    } else {
                        userType = "Other"
                    }

                    const clientIp = requestIp.getClientIp(req);

                    await Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Item Listing",
                        operationType: `Related info - (${req.body.title}) updated for item - ${checkbookID.title}`,
                        userType: userType,
                        created_by: req.user._id
                    });

                    response.createResponse({
                        message: "Related info updated successfully"
                    });
                } else {
                    return next(new AppError("Something went wrong", 500));
                }

            } catch (err) {
                return next(new AppError(err, 500));
            }
        } else {
            return next(new AppError("Item details not found.", 500));
        }
    }
});

exports.infoStatusChange = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.infoId) {
        return next(new AppError("Info details not found", 500));
    }

    try {

        const checkDetails = await RelatedInfoMaster.find({
            _id: req.body.infoId
        });

        if (checkDetails.length == 0) {
            return next(
                new AppError(
                    "Info details not found",
                    500, {
                        type: "info_not_found"
                    }
                )
            );
        }

        let statusValue;
        let statusBeforeChange;
        let statusAfterChange;

        if (req.body.status == 1) {
            statusValue = 0;
            statusBeforeChange = "Active";
            statusAfterChange = "Inactive";
        } else if (req.body.status == 0) {
            statusValue = 1;
            statusBeforeChange = "Inactive";
            statusAfterChange = "Active";
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

        const statusChange = await RelatedInfoMaster.findByIdAndUpdate(req.body.infoId, {
            status: statusValue,
            updated_by: userId
        });

        if (statusChange) {

            let userType;

            if (req.user.user_role == 1) {

                userType = "Admin"

            } else if (req.user.user_role == 2) {

                userType = "Librarian"
            } else {
                userType = "Other"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Related Info Status Change",
                operationType: `Related Info Status Change For ${statusChange.title} `,
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

exports.infoDestroy = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.infoId) {
        return next(new AppError("Info details not found", 500));
    }

    try {

        const deleteinfo = await RelatedInfoMaster.findByIdAndUpdate(req.body.infoId, {
            deleted: 1,
            updated_by: userId
        });

        if (deleteinfo) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            } else {
                userType = "Other"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Related Info Delete",
                operationType: `Related Info Delete For ${deleteinfo.title}`,
                userType: userType,
                created_by: userId
            });

            response.createResponse({
                message: "Related info deleted successfully."
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.infoList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.bookId) {
        return next(new AppError("Item details not found", 500))
    }

    let pageSize;
    let currentPage;

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 10;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};
    const filterObject1 = {};

    if (req.body.title) {
        filterObject['title'] = { $regex: req.body.title, "$options": "i" }
    }

    if (req.body.title) {
        filterObject1['bookDetails.title'] = { $regex: req.body.title, "$options": "i" }
    }

    const match_filter = { $or: [filterObject, filterObject1] };

    const infoDetails = await RelatedInfoMaster.aggregate([
            { $sort: { "createdAt": -1 } }, {
                $match: {
                    deleted: 0,
                    $expr: { $eq: ['$bookId', { $toObjectId: req.body.bookId }] }
                }
            }, {
                $lookup: {
                    from: "bookmasters",
                    localField: "bookId",
                    foreignField: "_id",
                    as: "bookDetails"
                },
            },
            {
                $match: match_filter
            },
            { $unwind: { path: "$bookDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    "urlType": 1,
                    "title": 1,
                    "url": 1,
                    "status": 1,
                    "bookDetails.title": 1
                }
            },
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const infoCount = await RelatedInfoMaster.aggregate([
        { $sort: { "createdAt": -1 } }, {
            $match: {
                deleted: 0,
                $expr: { $eq: ['$bookId', { $toObjectId: req.body.bookId }] }
            }
        }, {
            $lookup: {
                from: "bookmasters",
                localField: "bookId",
                foreignField: "_id",
                as: "bookDetails"
            },
        },
        {
            $match: match_filter
        },
        { $unwind: { path: "$bookDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "urlType": 1,
                "title": 1,
                "url": 1,
                "status": 1,
                "bookDetails.title": 1
            }
        },
    ]);


    response.successResponse({
        infoList: infoDetails,
        infoCount: infoCount.length
    });

});

exports.bookRelatedInfo = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.bookId) {
        return next(new AppError("Item details not found", 500))
    } else {

        const checkbookID = await BookMaster.findById(req.body.bookId, {
            deleted: 0
        });

        if (checkbookID) {
            try {

                const infoDetails = await RelatedInfoMaster.aggregate([
                    { $sort: { "createdAt": -1 } },
                    {
                        $match: {
                            $expr: { $eq: ['$bookId', { $toObjectId: req.body.bookId }] },
                            status: 1,
                            deleted: 0
                        },
                    },
                    {
                        $lookup: {
                            from: "bookmasters",
                            localField: "bookId",
                            foreignField: "_id",
                            as: "bookDetails"
                        },
                    },
                    { $unwind: { path: "$bookDetails", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            "urlType": 1,
                            "title": 1,
                            "url": 1,
                            "status": 1,
                            "bookDetails.title": 1
                        }
                    },
                ]);

                response.successResponse({
                    infoList: infoDetails
                });


            } catch (err) {
                return next(new AppError(err, 500));
            }
        } else {
            return next(new AppError("Item details not found.", 500));
        }
    }

});

exports.findbookRelatedInfo = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const infoDetails = await RelatedInfoMaster.find({
        _id: req.body.infoId,
        deleted: 0,
    }, {
        "urlType": 1,
        "title": 1,
        "url": 1,

    }).sort({ createdAt: -1 });

    if (infoDetails.length > 0) {

        response.successResponse({
            message: `Info Details`,
            infoData: infoDetails,
        });
    } else {
        return next(new AppError("Info details not found.", 500));
    }

});