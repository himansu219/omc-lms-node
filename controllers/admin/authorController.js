const catchAsync = require("../../utils/catchAsync");
const AuthorMaster = require("../../models/admin/authorMaster");
const BookMaster = require("../../models/admin/BookMaster");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const Activity = require("../../models/activity/activityLog");
const requestIp = require('request-ip');

let imgData = '';
let userId = '';

exports.store = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.file == undefined) {
        imgData = null;
    } else {
        imgData = "images/author/" + req.file.filename;
    }

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    const nameConcat = req.body.first_name + " " + req.body.middle_name + " " + req.body.last_name;
    const name = nameConcat.replaceAll(' ', '').toLowerCase();

    const authorCount = await AuthorMaster.aggregate([{
        $match: {
            deleted: 0
        },
    }, {
        $project: {
            name: { $concat: ["$first_name", "$middle_name", "$last_name"] }
        }
    }]).sort({ createdAt: -1 });

    let array = new Array();

    for (const iterator of authorCount) {
        let names = iterator.name.replaceAll(' ', '').toLowerCase();
        array.push(names);
    }

    const existingAuthorByName = array.includes(name);

    if (existingAuthorByName) {
        return next(
            new AppError("Author name already exists", 400, { type: "duplicate author name" })
        );
    }

    const newAuthor = await AuthorMaster.create({
        first_name: req.body.first_name,
        middle_name: req.body.middle_name,
        last_name: req.body.last_name,
        profile_image: imgData,
        description: req.body.description,
        created_by: userId
    });

    if (newAuthor) {

        let userType;
        if (req.user.user_role == 1) {
            userType = "Admin"
        } else if (req.user.user_role == 2) {
            userType = "Librarian"
        }

        const clientIp = requestIp.getClientIp(req);

        let author_name;

        if(req.body.middle_name){
            author_name = req.body.first_name+' '+req.body.middle_name+' '+req.body.last_name;
        } else {
            author_name = req.body.first_name+' '+req.body.last_name;
        }

        await Activity.create({
            ipAddress: clientIp,
            pageDetail: "Add Author",
            operationType: `Author Added - <a href="/authors/author-details/${ newAuthor._id }"><b>${author_name}</b></a>`,
            userType: userType,
            created_by: userId
        });

        const data = {
            name: `${newAuthor.first_name} ${newAuthor.middle_name} ${newAuthor.last_name}`,
            _id: newAuthor._id,
        };

        response.createResponse({
            message: "Author successfully added",
            author: data,
        });
    } else {
        return next(new AppError("Something went wrong", 500));
    }
});

exports.authorList = catchAsync(async(req, res, next) => {
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

    const authorDetails = await AuthorMaster.aggregate([{
            $match: {
                deleted: 0
            },
        }, {
            $project: {
                "status": 1,
                name: { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] },
            }
        }]).sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const authorCount = await AuthorMaster.aggregate([{
        $match: {
            deleted: 0
        },
    }, {
        $project: {
            name: { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] }
        }
    }]).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total authors count= ${ authorDetails.length }`,
        authorList: authorDetails,
        authorCount: authorCount.length
    });

});

exports.authorDestroy = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.authorId == "") {
        return next(new AppError("Author details not found", 500));
    }

    try {

        const checkAuthorTransactionData = await BookMaster.find({
            authorID: req.body.authorId,
            deleted: 0
        });

        if (checkAuthorTransactionData && checkAuthorTransactionData.length > 0) {

            return next(
                new AppError(
                    "Unable to delete the data. Transactional data already exist",
                    500, {
                        type: "author_transaction_exist",
                    }
                )
            );
        }

        const deleteAuthor = await AuthorMaster.findByIdAndUpdate(req.body.authorId, {
            deleted: 1,
            updated_by: userId
        });

        if (deleteAuthor) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            let author_name;

            if(deleteAuthor.middle_name){
                author_name = deleteAuthor.first_name+' '+deleteAuthor.middle_name+' '+deleteAuthor.last_name;
            } else {
                author_name = deleteAuthor.first_name+' '+deleteAuthor.last_name;
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Author Listing",
                operationType: `Author Deleteted - ${ author_name }`,
                userType: userType,
                created_by: userId
            });

            const data = {
                id: deleteAuthor._id,
            };

            response.createResponse({
                message: "Author deleted successfully.",
                author: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.authorUpdate = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.authorId == "") {
        return next(new AppError("Author details not found", 500));
    }

    const nameConcat = req.body.first_name + " " + req.body.middle_name + " " + req.body.last_name;
    const name = nameConcat.replaceAll(' ', '').toLowerCase();

    const authorCount = await AuthorMaster.aggregate([{
        $match: {
            deleted: 0,
            $expr: { $ne: ['$_id', { $toObjectId: req.body.authorId }] }
        },
    }, {
        $project: {
            name: { $concat: ["$first_name", "$middle_name", "$last_name"] }
        }
    }]).sort({ createdAt: -1 });

    let array = new Array();

    for (const iterator of authorCount) {
        let names = iterator.name.replaceAll(' ', '').toLowerCase();
        array.push(names);
    }

    const existingAuthorByName = array.includes(name);

    if (existingAuthorByName) {
        return next(
            new AppError("Author name already exists", 400, { type: "duplicate author name" })
        );
    }

    const checkAuthorID = await AuthorMaster.findById(req.body.authorId, {
        deleted: 0
    });

    if (checkAuthorID) {
        try {

            if (req.file == undefined) {
                imgData = null;
            } else {
                imgData = "images/author/" + req.file.filename;
            }

            const updateData = {
                first_name: req.body.first_name,
                middle_name: req.body.middle_name,
                last_name: req.body.last_name,
                description: req.body.description,
                updated_by: userId
            }

            if (imgData) {
                updateData.profile_image = imgData;
            }

            const updateAuthor = await AuthorMaster.findByIdAndUpdate(req.body.authorId, updateData);

            if (updateAuthor) {

                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2) {
                    userType = "Librarian"
                }

                let author_name;
                let activity_data = [];

                if(checkAuthorID.middle_name){
                    author_name = checkAuthorID.first_name+' '+checkAuthorID.middle_name+' '+checkAuthorID.last_name;
                } else {
                    author_name = checkAuthorID.first_name+' '+checkAuthorID.last_name;
                }

                if (checkAuthorID.first_name != req.body.first_name) {
                    activity_data.push(`<b>First Name :</b> "${ checkAuthorID.first_name }" to "${ req.body.first_name }"`);
                }

                if (checkAuthorID.middle_name != req.body.middle_name) {
                    activity_data.push(`<b>Middle Name :</b> "${ checkAuthorID.middle_name }" to "${ req.body.middle_name }"`);
                }

                if (checkAuthorID.last_name != req.body.last_name) {
                    activity_data.push(`<b>Last Name :</b> "${ checkAuthorID.last_name }" to "${ req.body.last_name }"`);
                }

                if (checkAuthorID.description != req.body.description) {
                    activity_data.push(`<b>Description :</b> "${ checkAuthorID.description }" to "${ req.body.description }"`);
                }

                const clientIp = requestIp.getClientIp(req);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Update Author",
                    operationType: `Author Updated - <a href="/authors/author-details/${req.body.authorId}"> <b>${author_name}</b></a> <p>${ activity_data } </p>`,
                    userType: userType,
                    created_by: userId
                });

                const data = {
                    id: updateAuthor._id,
                };

                response.createResponse({
                    message: "Author details updated successfully.",
                    author: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }
    } else {
        return next(new AppError("Author details not found.", 500));
    }
});

exports.findAuthor = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const authorDetails = await AuthorMaster.find({
        _id: req.params.id,
        deleted: 0
    }, {
        'first_name': 1,
        'middle_name': 1,
        'last_name': 1,
        'profile_image': 1,
        'description': 1
    });

    if (authorDetails.length > 0) {
        response.successResponse({
            message: `Author Details`,
            authorData: authorDetails
        });
    } else {
        return next(new AppError("Author details not found.", 500));
    }

});

exports.authorStatusChange = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.authorId) {
        return next(new AppError("Author details not found", 500))
    }

    if (!req.body.status) {
        return next(new AppError("Author status not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await AuthorMaster.find({
            _id: req.body.authorId
        });

        if (checkDetailsMasterDataId.length == 0) {
            return next(
                new AppError(
                    "Author details not found",
                    500, {
                        type: "author_not_found"
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

        const statusChange = await AuthorMaster.findByIdAndUpdate(req.body.authorId, {
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

            let author_name;

            if(statusChange.middle_name){
                author_name = statusChange.first_name+' '+statusChange.middle_name+' '+statusChange.last_name;
            } else {
                author_name = statusChange.first_name+' '+statusChange.last_name;
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Author Status Change",
                operationType: `Author Status Change - <a href="/authors/author-details/${ req.body.authorId }"> ${ author_name }</a> <b>Status: </b> ${ statusBeforeChange } to ${ statusAfterChange }`,
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

exports.authorListByStatus = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;

    const authorDetails = await AuthorMaster.find({
            status: 1,
            deleted: 0
        }, {
            'first_name': 1,
            'middle_name': 1,
            'last_name': 1
        }).sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    response.successResponse({
        message: `Total authors count= ${ authorDetails.length }`,
        authorList: authorDetails
    });

});

exports.authorLists = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const authorDetails = await AuthorMaster.find({
        deleted: 0,
    }, {
        'first_name': 1,
        'middle_name': 1,
        'last_name': 1,
        'profile_image': 1,
        'description': 1,
        'status': 1,
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total authors count= ${ authorDetails.length }`,
        authorList: authorDetails
    });

});

exports.authorFilterList = catchAsync(async(req, res, next) => {
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
        filterObject['name'] = new RegExp(req.body.title, 'i')
    }

    const authorDetails = await AuthorMaster.aggregate([
            { $sort: { "createdAt": -1 } }, {
                $match: {
                    deleted: 0
                },
            }, {
                $project: {
                    "status": 1,
                    name: { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] }
                }
            },
            {
                $match: filterObject
            }
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const authorCount = await AuthorMaster.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                deleted: 0
            },
        }, {
            $project: {
                name: { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] }
            }
        },
        {
            $match: filterObject
        }
    ]);

    response.successResponse({
        message: `Total authors count= ${ authorDetails.length }`,
        authorList: authorDetails,
        authorCount: authorCount.length
    });

});