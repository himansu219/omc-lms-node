const catchAsync = require("../../utils/catchAsync");
const PublisherMaster = require("../../models/admin/publisherMaster");
const BookMaster = require("../../models/admin/BookMaster");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const Activity = require("../../models/activity/activityLog");
const requestIp = require('request-ip');

exports.store = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    const existingPublisherByTitle = await PublisherMaster.findOne({
        title: req.body.title,
        //status: 1,
        deleted: 0
    });

    if (existingPublisherByTitle) {
        return next(
            new AppError("Publisher name already exists", 400, { type: "duplicate publisher" })
        );
    }

    const newPublisher = await PublisherMaster.create({
        title: req.body.title,
        created_by: userId
    });

    if (newPublisher) {

        let userType;
        if (req.user.user_role == 1) {
            userType = "Admin"
        } else if (req.user.user_role == 2) {
            userType = "Librarian"
        }

        const clientIp = requestIp.getClientIp(req);

        await Activity.create({
            ipAddress: clientIp,
            pageDetail: "Add Publisher",
            operationType: `Publisher Added - <a href="/publishers"><b>${ req.body.title }</b></a>`,
            userType: userType,
            created_by: userId
        });

        const data = {
            title: newPublisher.title,
            id: newPublisher._id,
        };

        response.createResponse({
            message: "Publisher successfully added",
            publisher: data,
        });
    } else {
        return next(new AppError("Something went wrong", 500));
    }
});

exports.publisherList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

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

    filterObject["deleted"] = 0;

    const publisherDetails = await PublisherMaster.find(filterObject, {
            'title': 1,
            'status': 1
        }).sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const publisherCount = await PublisherMaster.find({
        deleted: 0
    }, {
        'title': 1,
        'status': 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total publisher count= ${ publisherDetails.length }`,
        publisherList: publisherDetails,
        publisherCount: publisherCount.length
    });

});

exports.publisherDestroy = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.publisherId == "") {
        return next(new AppError("Publisher details not found", 500));
    }

    try {

        const checkPublisherTransactionData = await BookMaster.find({
            publisherID: req.body.publisherId,
            deleted: 0
        });

        if (checkPublisherTransactionData && checkPublisherTransactionData.length > 0) {

            return next(
                new AppError(
                    "Unable to delete the data. Transactional data already exist",
                    500, {
                        type: "publisher_transaction_exist",
                    }
                )
            );
        }

        const deletePublisher = await PublisherMaster.findByIdAndUpdate(req.body.publisherId, {
            deleted: 1,
            updated_by: userId
        });

        if (deletePublisher) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Publisher Delete",
                operationType: `Publisher Deleted - <a href="/publishers"><b>${ deletePublisher.title }</b></a>`,
                userType: userType,
                created_by: userId
            });

            const data = {
                id: deletePublisher._id,
            };

            response.createResponse({
                message: "Publisher deleted successfully.",
                publisher: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.publisherUpdate = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.publisherID == "") {
        return next(new AppError("Publisher details not found", 500));
    }

    const checkPublisherID = await PublisherMaster.findById(req.body.publisherID, {
        deleted: 0
    });

    const checkDuplicatePublisher = await PublisherMaster.find({
        _id: { $ne: req.body.publisherID },
        title: req.body.title,
        deleted: 0
    });

    if (checkDuplicatePublisher.length > 0) {
        return next(
            new AppError("Publisher name already exists", 400, { type: "duplicate_publisher" })
        );
    }

    if (checkPublisherID) {
        try {

            const updatePublisher = await PublisherMaster.findByIdAndUpdate(req.body.publisherID, {
                title: req.body.title,
                updated_by: userId
            });

            if (updatePublisher) {

                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2) {
                    userType = "Librarian"
                }

                const clientIp = requestIp.getClientIp(req);

                let activity_data = [];

                if (updatePublisher.title != req.body.title) {
                    activity_data.push(`<b>Title :</b> "${ updatePublisher.title }" to "${ req.body.title }"`);
                }

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Update Publisher",
                    operationType: `Publisher Updated - <a href="/publishers"><b>${ updatePublisher.title }</b></a> <p>${activity_data}</p>`,
                    userType: userType,
                    created_by: userId
                });

                const data = {
                    id: updatePublisher._id,
                };

                response.createResponse({
                    message: "Publisher details updated successfully.",
                    publisher: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }
    } else {
        return next(new AppError("Publisher details not found.", 500));
    }
});

exports.findPublisher = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const publisherDetails = await PublisherMaster.find({
        _id: req.params.id,
        deleted: 0
    }, {
        'title': 1
    });

    if (publisherDetails.length > 0) {
        response.successResponse({
            message: `Publisher Details`,
            publisherData: publisherDetails
        });
    } else {
        return next(new AppError("Publisher details not found.", 500));
    }

});

exports.publisherStatusChange = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.publisherId) {
        return next(new AppError("Publisher details not found", 500))
    }

    if (!req.body.status) {
        return next(new AppError("Publisher status not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await PublisherMaster.find({
            _id: req.body.publisherId
        });

        if (checkDetailsMasterDataId.length == 0) {
            return next(
                new AppError(
                    "Publisher details not found",
                    500, {
                        type: "publisher_not_found"
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

        const statusChange = await PublisherMaster.findByIdAndUpdate(req.body.publisherId, {
            status: statusValue,
            updated_by: userId
        });

        if (statusChange) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Publisher Status Change",
                operationType: `Publisher Status Change - <a href="/publishers"><b>${ statusChange.title }</b></a> <b>Status: </b> ${ statusBeforeChange } to ${ statusAfterChange }`,
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
        return next(new AppError("Something went wrong", 500));
    }

});

exports.publisherListByStatus = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const publisherDetails = await PublisherMaster.find({
        deleted: 0,
        status: 1
    }, {
        'title': 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total publisher count= ${ publisherDetails.length }`,
        publisherList: publisherDetails
    });

});

exports.publisherLists = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const publisherDetails = await PublisherMaster.find({
        deleted: 0,
    }, {
        'status': 1,
        'title': 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total publisher count= ${ publisherDetails.length }`,
        publisherList: publisherDetails
    });

});


exports.filterPublisherList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

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

    if (req.body.title) {
        filterObject['title'] = { $regex: req.body.title, "$options": "i" }
    }

    filterObject["deleted"] = 0;

    const publisherDetails = await PublisherMaster.find(filterObject, {
            'title': 1,
            'status': 1
        }).sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const publisherCount = await PublisherMaster.find(filterObject, {
        'title': 1,
        'status': 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total publisher count= ${ publisherDetails.length }`,
        publisherList: publisherDetails,
        publisherCount: publisherCount.length
    });

});