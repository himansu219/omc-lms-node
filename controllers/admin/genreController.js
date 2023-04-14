const catchAsync = require("../../utils/catchAsync");
const GenreMaster = require("../../models/admin/genreMaster");
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

    const existingGenreByTitle = await GenreMaster.findOne({
        title: req.body.title,
        //status: 1,
        deleted: 0
    });

    if (existingGenreByTitle) {
        return next(
            new AppError("Category already exists", 400, { type: "duplicate genre" })
        );
    }

    const newGenre = await GenreMaster.create({
        title: req.body.title,
        created_by: userId
    });

    if (newGenre) {

        let userType;
        if (req.user.user_role == 1) {
            userType = "Admin"
        } else if (req.user.user_role == 2) {
            userType = "Librarian"
        }

        const clientIp = requestIp.getClientIp(req);

        await Activity.create({
            ipAddress: clientIp,
            pageDetail: "Add Category",
            operationType: `Category Added - <a href="/category"><b>${ req.body.title }</b></a>`,
            userType: userType,
            created_by: userId
        });

        const data = {
            title: newGenre.title,
            id: newGenre._id,
        };

        response.createResponse({
            message: "Category successfully added",
            genre: data,
        });
    } else {
        return next(new AppError("Something went wrong", 500));
    }
});

exports.genreList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const genreDetails = await GenreMaster.find({
        deleted: 0,
    }, {
        'title': 1,
        'status': 1,
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total genre count= ${ genreDetails.length }`,
        genreList: genreDetails
    });

});

exports.genreUpdate = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.genreID == "") {
        return next(new AppError("Category details not found", 500));
    }

    const checkGenreID = await GenreMaster.findById(req.body.genreID, {
        deleted: 0
    });

    const checkDuplicateGenre = await GenreMaster.find({
        _id: { $ne: req.body.genreID },
        title: req.body.title,
        deleted: 0
    });

    if (checkDuplicateGenre.length > 0) {
        return next(
            new AppError("Category name already exists", 400, { type: "duplicate genre" })
        );
    }

    if (checkGenreID) {
        try {

            const updateGenre = await GenreMaster.findByIdAndUpdate(req.body.genreID, {
                title: req.body.title,
                updated_by: userId
            });

            if (updateGenre) {

                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2) {
                    userType = "Librarian"
                }
                let activity_data = [];

                if (updateGenre.title != req.body.title) {
                    activity_data.push(`<b>Title :</b> "${ updateGenre.title }" to "${ req.body.title }"`);
                }

                const clientIp = requestIp.getClientIp(req);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Update Category",
                    operationType: `Category Updated - <a href="/category"><b>${ updateGenre.title }</b></a> <p>${activity_data}</p>`,
                    userType: userType,
                    created_by: userId
                });

                const data = {
                    id: updateGenre._id,
                };

                response.createResponse({
                    message: "Category details updated successfully.",
                    genre: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }
    } else {
        return next(new AppError("Category details not found.", 500));
    }
});

exports.genreDestroy = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.genreID == "") {
        return next(new AppError("Category details not found", 500));
    }

    try {

        const checkGenreTransactionData = await BookMaster.find({
            genreID: req.body.genreID,
            deleted: 0
        });

        if (checkGenreTransactionData && checkGenreTransactionData.length > 0) {

            return next(
                new AppError(
                    "Unable to delete the data. Transactional data already exist",
                    500, {
                        type: "genre_transaction_exist",
                    }
                )
            );
        }

        const deleteGenre = await GenreMaster.findByIdAndUpdate(req.body.genreID, {
            deleted: 1,
            updated_by: userId
        });

        if (deleteGenre) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Category Delete",
                operationType: `Category Deleted - <a href="/category"><b>${deleteGenre.title} </b></a>`,
                userType: userType,
                created_by: userId
            });

            const data = {
                id: deleteGenre._id,
            };

            response.createResponse({
                message: "Category deleted successfully.",
                genre: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.findGenre = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const genreDetails = await GenreMaster.find({
        _id: req.params.id,
        deleted: 0
    }, {
        'title': 1
    });

    if (genreDetails.length > 0) {
        response.successResponse({
            message: `Genre Details`,
            genreData: genreDetails
        });
    } else {
        return next(new AppError("Category details not found.", 500));
    }

});

exports.genreStatusChange = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.genreId) {
        return next(new AppError("Category details not found", 500))
    }

    if (!req.body.status) {
        return next(new AppError("Category status not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await GenreMaster.find({
            _id: req.body.genreId
        });

        if (checkDetailsMasterDataId.length == 0) {
            return next(
                new AppError(
                    "Category details not found",
                    500, {
                        type: "category_not_found"
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

        const statusChange = await GenreMaster.findByIdAndUpdate(req.body.genreId, {
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
                pageDetail: "Category Status Change",
                operationType: `Category Status Changed  - <a href="/category"><b>${ statusChange.title }</b></a> <b>Status: </b> ${ statusBeforeChange } to ${ statusAfterChange }`,
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

exports.genreListByStatus = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const genreDetails = await GenreMaster.find({
        deleted: 0,
        status: 1
    }, {
        'title': 1
    });

    response.successResponse({
        message: `Total genre count= ${ genreDetails.length }`,
        genreList: genreDetails
    });

});

exports.filterGenreList = catchAsync(async(req, res, next) => {
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

    const genreDetails = await GenreMaster.find(filterObject, {
            'title': 1,
            'status': 1
        }).sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const genreCount = await GenreMaster.find(filterObject, {
        'title': 1,
        'status': 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total publisher count= ${ genreDetails.length }`,
        genreList: genreDetails,
        genreCount: genreCount.length
    });

});