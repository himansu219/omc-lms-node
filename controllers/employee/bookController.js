const catchAsync = require("../../utils/catchAsync");
const BookIssue = require("../../models/admin/BookIssue");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const QrCodeDetails = require("../../models/admin/qrCodeDetails");
const BookDetailsMaster = require("../../models/admin/BookDetailsMaster");
const PopularBook = require("../../models/admin/popularBook");
const BookMaster = require("../../models/admin/BookMaster");
const GenreMaster = require("../../models/admin/genreMaster");
const Notification = require("../../models/admin/notification");
const BookRequest = require("../../models/employee/BookRequest");
const BookSorting = require("../../models/employee/BookSorting");
const BookRequisition = require("../../models/employee/bookRequisition");
const User = require("../../models/auth/user");
const BookDamage = require("../../models/admin/bookDamage");
const UserRoleMaster = require("../../models/admin/userRoleMaster");
const BookSuggested = require("../../models/admin/bookSuggested");
const Bookrating = require("../../models/employee/bookRating");
const EBookMaster = require("../../models/admin/eBook");
const mongoose = require('mongoose');
const requestIp = require('request-ip');
const Activity = require("../../models/activity/activityLog");

exports.requestBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (!req.body.bookID) {
        return next(new AppError("Details not found", 500));
    }

    try {

        // const bookAvailabilityData = await BookMaster.findById(req.body.bookID, {
        //     deleted: 0
        // });

        // if (bookAvailabilityData && bookAvailabilityData.availableQuantity > 0) {

        const checkRequest = await BookRequest.findOne({
            employeeID: userId,
            bookID: req.body.bookID,
            bookRequestStatus: 1
        });

        if (!checkRequest) {
            const requestBook = await BookRequest.create({
                bookID: req.body.bookID,
                employeeID: userId,
                bookRequestStatus: 1,
                created_by: userId
            });

            if (requestBook) {

                const getUser = await User.findById(userId, {
                    deleted: 0
                }, {
                    "name": 1
                });

                const bookname = await BookMaster.findById(req.body.bookID, {
                    deleted: 0
                }, {
                    "title": 1
                });

                const getUserIdFromRole = await User.find({
                    user_role: { $in: [1, 2, 4] },
                    deleted: 0
                }, {
                    "_id": 1
                });

                for (const iterator of getUserIdFromRole) {
                    await Notification.create({
                        user_id: userId,
                        notification_for: iterator,
                        notificationRole: 1,
                        notification_type: "Request",
                        message: `${getUser.name} has requested for ${bookname.title}`,
                        created_by: userId
                    });
                }

                const clientIp = requestIp.getClientIp(req);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Suggested Book Added",
                    operationType: `<a href="/item-requested">${getUser.name} has requested for ${bookname.title}</a>.`,
                    userType: "Employee",
                    created_by: userId
                });

                const data = {
                    id: requestBook._id,
                };

                response.createResponse({
                    message: "Requested successfully.",
                    book: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }

        } else {
            return next(new AppError("Already requested", 500));
        }

        // } else {

        //     return next(
        //         new AppError(
        //             "Book not available",
        //             500, {
        //                 type: "book_not_available",
        //             }
        //         )
        //     );
        // }

    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.returnBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';
    let bookStatus = req.body.bookStatus;
    let remark = req.body.bookStatus;

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    try {

        if (bookStatus) {
            if (bookStatus == 3 || bookStatus == 4) {
                if (remark) {
                    bookStatus = bookStatus;
                    remark = remark;
                } else {
                    return next(new AppError("Please enter remark.", 500));
                }
            }
        } else {
            return next(new AppError("Please select item status", 500));
        }

        const getqrCodeDetails = await QrCodeDetails.findById(req.body.qrCodeID, {
            deleted: 0
        });

        if (getqrCodeDetails && getqrCodeDetails.isAssigned == 1) {

            const getDetailsBookId = await BookDetailsMaster.findById(getqrCodeDetails.bookDetailMasterId, {
                deleted: 0
            });

            if (getDetailsBookId && getDetailsBookId.bookStatus == 4) {
                return next(new AppError("This book is reported as lost", 500));
            }


            if (getDetailsBookId && getDetailsBookId.bookIssueStatus == 1) {

                const checkIssue = await BookIssue.findOne({
                    bookID: getDetailsBookId._id,
                    bookReturnStatus: 0,
                    deleted: 0
                });

                if (checkIssue && checkIssue.bookReturnStatus == 0) {
                    const updateIssue = await BookIssue.findByIdAndUpdate(checkIssue._id, {
                        bookReturnStatus: 1,
                        bookStatus: req.body.bookStatus,
                        remark: req.body.remark,
                        updated_by: userId
                    });

                    const updateAndFindMasterBookId = await BookDetailsMaster.findByIdAndUpdate(checkIssue.bookID, {
                        bookIssueStatus: 0,
                        bookStatus: req.body.bookStatus,
                        remark: req.body.remark,
                        updated_by: userId
                    });

                    const checkQuantity = await BookMaster.findById(updateAndFindMasterBookId.bookID, {
                        deleted: 0
                    });

                    if (bookStatus != 4) {
                        const updateBook = await BookMaster.findByIdAndUpdate(checkQuantity.id, {
                            availableQuantity: (+checkQuantity.availableQuantity) + 1,
                            updated_by: userId
                        });
                    }

                    if (bookStatus == 3) {

                        const checkBookDamage = await BookDamage.findOne({
                            bookMasterId: updateAndFindMasterBookId.bookID,
                            bookdetailsMasterId: checkIssue.bookID,
                            itemStatus: bookStatus,
                            status: 1,
                            deleted: 0
                        });

                        if (!checkBookDamage) {
                            await BookDamage.create({
                                bookMasterId: updateAndFindMasterBookId.bookID,
                                bookdetailsMasterId: checkIssue.bookID,
                                itemStatus: bookStatus,
                                remark: req.body.remark,
                                created_by: userId
                            });

                            let qty;

                            if (!checkQuantity.damageQuantity) {
                                qty = 1;
                            } else {
                                qty = +checkQuantity.damageQuantity + 1;
                            }

                            await BookMaster.findByIdAndUpdate(checkQuantity.id, {
                                damageQuantity: qty,
                                updated_by: userId
                            });

                        }

                    }

                    if (bookStatus == 4) {

                        const checkBookDamage = await BookDamage.findOne({
                            bookMasterId: updateAndFindMasterBookId.bookID,
                            bookdetailsMasterId: checkIssue.bookID,
                            itemStatus: bookStatus,
                            status: 1,
                            deleted: 0
                        });

                        if (!checkBookDamage) {
                            await BookDamage.create({
                                bookMasterId: updateAndFindMasterBookId.bookID,
                                bookdetailsMasterId: checkIssue.bookID,
                                itemStatus: bookStatus,
                                remark: req.body.remark,
                                created_by: userId
                            });

                            let qtyLost;

                            if (!checkQuantity.lostQuantity) {
                                qtyLost = 1;
                            } else {
                                qtyLost = +checkQuantity.lostQuantity + 1;
                            }

                            await BookMaster.findByIdAndUpdate(checkQuantity.id, {
                                lostQuantity: qtyLost,
                                updated_by: userId
                            });

                        }

                    }

                    const getUserIdFromRole = await User.find({
                        user_role: { $in: [1, 2, 4] },
                        deleted: 0
                    }, {
                        "_id": 1
                    });

                    const empName = await User.findById(updateIssue.employeeID, {
                        deleted: 0
                    });

                    const clientIp = requestIp.getClientIp(req);

                    let userType;
                    if (req.user.user_role == 1) {
                        userType = "Admin"
                    } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                        userType = "Librarian"
                    }

                    await Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Item Returned",
                        operationType: `Item Returned - <a href="/item-returned"><b>${ checkQuantity.title }</b></a> has been returned to ${ empName.name }`,
                        userType: userType,
                        created_by: userId
                    });

                    await Notification.create({
                        user_id: userId,
                        notification_for: updateIssue.employeeID,
                        notificationRole: 2,
                        notification_type: "Book Return",
                        message: `${checkQuantity.title} has been successfully returned.`,
                        created_by: userId
                    });

                    const data = {
                        issueID: checkIssue._id,
                    };

                    response.createResponse({
                        message: "Item returned successfully",
                        issue: data,
                    });

                } else {
                    return next(new AppError("Issue details not found.", 500));
                }

            } else {
                return next(new AppError("Item not issued.", 500));
            }

        } else {
            return next(new AppError("Issue details not found.", 500));
        }

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.recentlyAddedBooks = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    const books = await BookMaster.find({
            bookType: 1,
            status: 1,
            deleted: 0,
        }, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .sort({ createdAt: -1 })
        .limit(4);

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck,
        });
    }

    response.successResponse({
        message: `Total books count= ${ arr.length }`,
        bookList: arr
    });

});

exports.searchBookByName = catchAsync(async(req, res, next) => {

    const filterObject = {};

    if (req.body.title) {
        filterObject['title'] = { $regex: req.body.title, "$options": "i" }
    }

    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const response = new AppSuccess(res);

    const bookFilter = await BookMaster.find(filterObject, {
        "title": 1,
        "edition": 1,
        "pages": 1,
        "publishedYear": 1,
        "description": 1,
        "front_image": 1,
        "back_image": 1,
        "quantity": 1,
        "availableQuantity": 1,
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name', 'profile_image', 'description']
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).populate({
        path: 'genreID',
        select: ['title']
    }).sort({ createdAt: -1 });

    if (bookFilter.length > 0) {
        response.successResponse({
            totalData: bookFilter.length,
            bookFilter: bookFilter
        });
    } else {
        response.successResponse({
            totalData: bookFilter.length,
            bookFilter: []
        });
    }

});

exports.filterBook = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);
    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    let authorID = req.body.authorID;
    let publisherID = req.body.publisherID;
    let categoryID = req.body.categoryID;
    let language = req.body.language;

    let authorIDArray = new Array();
    let publisherIDArray = new Array();
    let categoryIDArray = new Array();
    let languageArray = new Array();

    authorIDArray = authorID.split(",");
    publisherIDArray = publisherID.split(",");
    categoryIDArray = categoryID.split(",");
    languageArray = language.split(",");

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    // if (req.body.title) {
    //     filterObject['title'] = { $regex: req.body.title, "$options": "i" }
    // }

    if (req.body.authorID) {
        filterObject["authorID"] = { $in: authorIDArray }
    }

    if (req.body.publisherID) {
        filterObject["publisherID"] = { $in: publisherIDArray }
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = { $in: categoryIDArray }
    }

    if (req.body.language) {
        filterObject['language'] = { $in: languageArray }
    }

    filterObject["bookType"] = 1;
    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const books = await BookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck
        });
    }

    const bookCount = await BookMaster.find(filterObject);

    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.addBookRequisition = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);
    let userId;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        userId = req.body.userId;
    }


    const existingRequestByOtherDetails = await BookRequisition.findOne({
        employeeID: userId,
        bookName: req.body.bookName,
        authorName: req.body.authorName,
        publisherName: req.body.publisherName,
        status: 1,
        deleted: 0
    });

    if (existingRequestByOtherDetails) {
        return next(
            new AppError("Item already suggested", 400, { type: "duplicate_request" })
        );
    }

    try {

        const storeBookRequisition = await BookRequisition.create({
            employeeID: userId,
            bookName: req.body.bookName,
            authorName: req.body.authorName,
            publisherName: req.body.publisherName,
            description: req.body.description,
            created_by: userId
        });

        if (storeBookRequisition) {

            const getUser = await User.findById(userId, {
                deleted: 0
            }, {
                "name": 1
            });

            const getUserIdFromRole = await User.find({
                user_role: { $in: [1, 2, 4] },
                deleted: 0
            }, {
                "_id": 1
            });

            for (const iterator of getUserIdFromRole) {
                await Notification.create({
                    user_id: userId,
                    notification_for: iterator,
                    notificationRole: 1,
                    notification_type: "Suggested Book",
                    message: `${getUser.name} has suggested for ${req.body.bookName}`,
                    created_by: userId
                });
            }

            const data = {
                id: storeBookRequisition._id,
            };

            response.createResponse({
                message: "Requested Successfully",
                request: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        return next(new AppError(err, 500));
    }

});

exports.bookRequisitionList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let pageSize;
    let currentPage;

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const requisitionDetails = await BookRequisition.aggregate([
            { $sort: { "createdAt": -1 } }, {
                $match: {
                    status: 1,
                    deleted: 0,
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "employeeID",
                    foreignField: "_id",
                    as: "employeeID"
                },
            },
            { $unwind: { path: "$employeeID", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    "bookName": 1,
                    "authorName": 1,
                    "publisherName": 1,
                    "createdAt": 1,
                    "requisitionStatus": 1,
                    "updatedAt": 1,
                    "employeeID.name": 1,
                    "employeeID.email": 1,
                    "employeeID.mobile": 1,
                    "employeeID.employee_id": 1
                }
            }
        ]).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookRequisition.find({
        status: 1,
        deleted: 0,
    });

    const pending = await BookRequisition.find({
        requisitionStatus: 1,
        status: 1,
        deleted: 0,
    });

    const cancelled = await BookRequisition.find({
        requisitionStatus: 3,
        status: 1,
        deleted: 0,
    });

    const addToLib = await BookRequisition.find({
        requisitionStatus: 4,
        status: 1,
        deleted: 0,
    });


    response.successResponse({
        message: `Total suggested count= ${ requisitionDetails.length }`,
        requisitionList: requisitionDetails,
        bookCount: bookCount.length,
        pending: pending.length,
        addToLib: addToLib.length,
        cancelled: cancelled.length,
    });

});

exports.bookRequisitionempFind = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const requisitionDetails = await BookRequisition.find({
        _id: req.body.requisitionId,
        deleted: 0,
    }, {
        "bookName": 1,
        "authorName": 1,
        "publisherName": 1,
        "description": 1,

    });

    if (requisitionDetails.length > 0) {

        response.successResponse({
            message: `requisition Details`,
            requisitionData: requisitionDetails,
        });
    } else {
        return next(new AppError("requisition details not found.", 500));
    }

});

exports.updateBookRequisition = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);
    let userId;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        userId = req.body.userId;
    }


    const existingRequestByOtherDetails = await BookRequisition.findOne({
        employeeID: userId,
        bookName: req.body.bookName,
        authorName: req.body.authorName,
        publisherName: req.body.publisherName,
        status: 1,
        deleted: 0
    });

    if (existingRequestByOtherDetails) {
        return next(
            new AppError("Item already suggested", 400, { type: "duplicate_request" })
        );
    }

    const checkRequsitionID = await BookRequisition.findById(req.body.requistionId, {
        deleted: 0
    });

    if (checkRequsitionID) {
        try {

            const updateData = {
                employeeID: userId,
                bookName: req.body.bookName,
                authorName: req.body.authorName,
                publisherName: req.body.publisherName,
                description: req.body.description,
                created_by: userId
            };

            const updateRequsition = await BookRequisition.findByIdAndUpdate(req.body.requistionId, updateData);

            if (updateRequsition) {

                const getUser = await User.findById(userId, {
                    deleted: 0
                }, {
                    "name": 1
                });

                const getUserIdFromRole = await User.find({
                    user_role: { $in: [1, 2, 4] },
                    deleted: 0
                }, {
                    "_id": 1
                });

                for (const iterator of getUserIdFromRole) {
                    await Notification.create({
                        user_id: userId,
                        notification_for: iterator,
                        notificationRole: 1,
                        notification_type: "Suggested Book",
                        message: `${getUser.name} has updated the suggestion for ${checkRequsitionID.bookName}`,
                        created_by: userId
                    });
                }

                const data = {
                    id: updateRequsition._id,
                };

                response.createResponse({
                    message: "Updated Successfully",
                    request: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } catch (err) {
            return next(new AppError("Something went wrong", 500));
        }
    } else {

        return next(new AppError("suggested id not found", 500));
    }

});

exports.destroyBookRequisition = catchAsync(async(req, res, next) =>{

    const response = new AppSuccess(res);

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        userId = req.body.userId;
    }

    if (req.body.deleteId == "") {
        return next(new AppError("Requisition Id not found", 500));
    }

    try {

        const checkRequisitionStatus = await BookRequisition.find({
            _id: req.body.deleteId,
            requisitionStatus: 1
        });

        if(checkRequisitionStatus.length > 0){

            const deleteRequisiton = await BookRequisition.findByIdAndUpdate(req.body.deleteId, {
                deleted: 1,
                updated_by: userId
            });
    
            if (deleteRequisiton) {
    
                const clientIp = requestIp.getClientIp(req);

                const empName = await User.findById(checkRequisitionStatus[0].employeeID, {
                    deleted: 0
                });

                console.log(checkRequisitionStatus);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Suggestion Deleted",
                    operationType: `Suggestion Deleted - ${ checkRequisitionStatus[0].bookName } by ${ empName.name }`,
                    userType: 'Employee',
                    created_by: userId
                });
    
                const data = {
                    id: deleteRequisiton._id,
                };
    
                response.createResponse({
                    message: "Suggested data deleted successfully.",
                    author: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }

        } else {
            return next(new AppError("Invalid data", 500));
        }
        
    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.bookRequestListing = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId;
    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    let pageSize;
    let currentPage;

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const books = await BookRequest.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $match: {
                    $expr: { $eq: ['$employeeID', { $toObjectId: userId }] },
                    bookRequestStatus: { $in: [1, 3] },
                    status: 1,
                    deleted: 0
                },
            },
            {
                $lookup: {
                    from: "bookmasters",
                    localField: "bookID",
                    foreignField: "_id",
                    as: "bookID"
                },
            },
            {
                $lookup: {
                    from: "authormasters",
                    localField: "bookID.authorID",
                    foreignField: "_id",
                    as: "authorDetails"
                },
            },
            {
                $lookup: {
                    from: "publishermasters",
                    localField: "bookID.publisherID",
                    foreignField: "_id",
                    as: "publisherDetails"
                },
            },
            {
                $lookup: {
                    from: "bookjournalmagazinetypemasters",
                    localField: "bookID.bookType",
                    foreignField: "typeId",
                    as: "type"
                },
            },
            { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$bookID", preserveNullAndEmptyArrays: true } },
            // {
            //     $match: filterObject
            // },
            {
                $project: {
                    "createdAt": 1,
                    "notifyStatus": 1,
                    "bookRequestStatus": 1,
                    "remark": 1,
                    "bookID.title": 1,
                    "bookID.bookType": 1,
                    "bookID._id": 1,
                    "bookID.description": 1,
                    "bookID.availableQuantity": 1,
                    "bookID.publishedYear": 1,
                    "authorDetails.first_name": 1,
                    "authorDetails.middle_name": 1,
                    "authorDetails.last_name": 1,
                    "publisherDetails.title": 1,
                    "type.name": 1
                }
            }
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookRequest.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                $expr: { $eq: ['$employeeID', { $toObjectId: userId }] },
                bookRequestStatus: 1,
                status: 1,
                deleted: 0
            },
        },
        {
            $lookup: {
                from: "bookmasters",
                localField: "bookID",
                foreignField: "_id",
                as: "bookID"
            },
        },
        {
            $lookup: {
                from: "authormasters",
                localField: "bookID.authorID",
                foreignField: "_id",
                as: "authorDetails"
            },
        },
        {
            $lookup: {
                from: "publishermasters",
                localField: "bookID.publisherID",
                foreignField: "_id",
                as: "publisherDetails"
            },
        },
        {
            $lookup: {
                from: "bookjournalmagazinetypemasters",
                localField: "bookID.bookType",
                foreignField: "typeId",
                as: "type"
            },
        },
        { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$bookID", preserveNullAndEmptyArrays: true } },
        // {
        //     $match: filterObject
        // },
        {
            $project: {
                "createdAt": 1,
                "notifyStatus": 1,
                "bookID.title": 1,
                "bookID.bookType": 1,
                "bookID.description": 1,
                "bookID.availableQuantity": 1,
                "bookID.publishedYear": 1,
                "authorDetails.first_name": 1,
                "authorDetails.middle_name": 1,
                "authorDetails.last_name": 1,
                "publisherDetails.title": 1,
                "type.name": 1
            }
        }
    ]);

    response.successResponse({
        message: `Total request count= ${ books.length }`,
        requestList: books,
        bookCount: bookCount.length
    });

});

exports.bookReturnListing = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);
    let userId;
    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    const returnDetails = await BookIssue.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                bookReturnStatus: 1,
                $expr: { $eq: ['$employeeID', { $toObjectId: userId }] },
                status: 1,
                deleted: 0
            },
        },
        {
            $lookup: {
                from: "bookdetailsmasters",
                localField: "bookID",
                foreignField: "_id",
                as: "bookDetails"
            },
        },
        {
            $lookup: {
                from: "bookmasters",
                localField: "bookDetails.bookID",
                foreignField: "_id",
                as: "bookMasterDetails"
            },
        },
        {
            $project: {
                "issueDate": 1,
                "returnDate": 1,
                "updatedAt": 1,
                "bookDetails.bookReferenceNumber": 1,
                "bookMasterDetails.title": 1
            }
        }
    ]);


    if (returnDetails.length > 0) {
        response.successResponse({
            totalReturn: returnDetails.length,
            returnDetails: returnDetails
        });
    } else {
        return next(new AppError("Return details not found.", 500));
    }

});

exports.myRecords = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    const records = await BookIssue.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                $expr: { $eq: ['$employeeID', { $toObjectId: userId }] },
                status: 1,
                deleted: 0
            },
        },
        {
            $lookup: {
                from: "bookdetailsmasters",
                localField: "bookID",
                foreignField: "_id",
                as: "bookDetails"
            },
        },
        {
            $lookup: {
                from: "bookmasters",
                localField: "bookDetails.bookID",
                foreignField: "_id",
                as: "bookMasterDetails"
            },
        },
        {
            $lookup: {
                from: "authormasters",
                localField: "bookMasterDetails.authorID",
                foreignField: "_id",
                as: "authorDetails"
            },
        },
        {
            $lookup: {
                from: "genremasters",
                localField: "bookMasterDetails.genreID",
                foreignField: "_id",
                as: "genreDetails"
            },
        },
        {
            $lookup: {
                from: "bookjournalmagazinetypemasters",
                localField: "bookMasterDetails.bookType",
                foreignField: "typeId",
                as: "type"
            },
        },
        { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$genreDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "issueDate": 1,
                "returnDate": 1,
                "bookReturnStatus": 1,
                "updatedAt": 1,
                "bookDetails.bookReferenceNumber": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails._id": 1,
                "bookMasterDetails.front_image": 1,
                "bookMasterDetails.bookType": 1,
                "authorDetails.first_name": 1,
                "authorDetails.middle_name": 1,
                "authorDetails.last_name": 1,
                "genreDetails.title": 1,
                "type.name": 1
            }
        }
    ]);

    response.successResponse({
        totalRecords: records.length,
        records: records
    });

});

exports.sortRecentlyAddedBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const sortBooks = await BookSorting.find({
        status: 1,
        deleted: 0,
    }, {
        "name": 1,
        "isDefault": 1
    });

    let defaultSort = "6396ffb0d158366ed02d2f46";

    let list = {};
    let arr = new Array();

    for (const iterator of sortBooks) {

        let myObjectIdString = iterator._id.toString()

        if (myObjectIdString == defaultSort) {

            arr.push({
                id: iterator._id,
                type: iterator.name,
                isDefault: true
            });

        } else {
            arr.push({
                id: iterator._id,
                type: iterator.name,
                isDefault: false
            });
        }
    }

    response.successResponse({
        message: `Total count= ${ arr.length }`,
        sortingType: arr
    });
});

exports.recentlyAddedBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.sortId) {
        sortId = req.body.sortId;
    } else {
        sortId = "6396ffb0d158366ed02d2f46";
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    if (sortId == "6396ffb0d158366ed02d2f46") {
        filterObject["createdAt"] = -1;
    }

    if (sortId == "6396ffd5505ac22d983d91c8") {
        filterObject["title"] = 1;
    }

    if (sortId == "6396ffd5505ac22d983d91cb") {
        filterObject["title"] = -1;
    }

    const books = await BookMaster.find({
            bookType: 1,
            status: 1,
            deleted: 0,
        }, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .sort(filterObject)
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find({
        bookType: 1,
        status: 1,
        deleted: 0,
    });

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBooks = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBooks) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck
        });
    }


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.browseCategoryDetails = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.body.sortId) {
        sortId = req.body.sortId;
    } else {
        sortId = "6396ffb0d158366ed02d2f46";
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    if (sortId == "6396ffb0d158366ed02d2f46") {
        filterObject["createdAt"] = -1;
    }

    if (sortId == "6396ffd5505ac22d983d91c8") {
        filterObject["title"] = 1;
    }

    if (sortId == "6396ffd5505ac22d983d91cb") {
        filterObject["title"] = -1;
    }

    const genreDetails = await GenreMaster.find({
            deleted: 0,
            status: 1
        }, {
            'title': 1
        }).collation({ locale: "en" })
        .sort(filterObject)
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    let arr = new Array();

    for (const iterator of genreDetails) {

        const bookDetailsCount = await BookMaster.find({
            genreID: iterator._id,
            status: 1,
            deleted: 0
        }, {
            "_id": 1
        });

        arr.push({
            title: iterator.title,
            genreId: iterator._id,
            bookCount: bookDetailsCount.length,
        });
    }

    const genreCount = await GenreMaster.find({
        status: 1,
        deleted: 0,
    });


    response.successResponse({
        message: `Total genre count= ${ genreDetails.length }`,
        genreList: arr,
        genreCount: genreCount.length
    });

});

exports.browseCategory = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const genreDetails = await GenreMaster.find({
            deleted: 0,
            status: 1
        }, {
            'title': 1
        }).collation({ locale: "en" })
        .limit(4);

    let arr = new Array();

    for (const iterator of genreDetails) {

        const bookDetailsCount = await BookMaster.find({
            genreID: iterator._id,
            status: 1,
            deleted: 0
        }, {
            "_id": 1
        });

        arr.push({
            title: iterator.title,
            genreId: iterator._id,
            bookCount: bookDetailsCount.length,
        });
    }

    response.successResponse({
        message: `Total genre count= ${ genreDetails.length }`,
        genreList: arr
    });

});

exports.featuredBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    const books = await BookMaster.find({
            bookType: 1,
            status: 1,
            deleted: 0,
        }, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .sort({ createdAt: 1 })
        .limit(4);

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck
        });
    }

    response.successResponse({
        message: `Total books count= ${ arr.length }`,
        bookList: arr
    });

});

exports.featuredBookList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    let authorID = req.body.authorID;
    let publisherID = req.body.publisherID;
    let categoryID = req.body.categoryID;
    let language = req.body.language;

    let authorIDArray = new Array();
    let publisherIDArray = new Array();
    let categoryIDArray = new Array();
    let languageArray = new Array();


    authorIDArray = authorID.split(",");
    publisherIDArray = publisherID.split(",");
    categoryIDArray = categoryID.split(",");
    languageArray = language.split(",");

    if (req.body.sortId) {
        sortId = req.body.sortId;
    } else {
        sortId = "1";
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const sortObject = {};
    const filterObject = {};

    if (sortId == "1") {
        sortObject["createdAt"] = 1;
    }

    if (sortId == "6396ffb0d158366ed02d2f46") {
        sortObject["createdAt"] = -1;
    }

    if (sortId == "6396ffd5505ac22d983d91c8") {
        sortObject["title"] = 1;
    }

    if (sortId == "6396ffd5505ac22d983d91cb") {
        sortObject["title"] = -1;
    }
    // Condition for data filtering
    if (req.body.title) {
        filterObject['title'] = { $regex: req.body.title, "$options": "i" }
    }
    if (req.body.authorID) {
        filterObject["authorID"] = { $in: authorIDArray }
    }

    if (req.body.publisherID) {
        filterObject["publisherID"] = { $in: publisherIDArray }
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = { $in: categoryIDArray }
    }

    if (req.body.language) {
        filterObject['language'] = { $in: languageArray }
    }
    filterObject["bookType"] = 1;
    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const books = await BookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .sort(sortObject)
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1,
        "rating": 1,
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name']
    }).populate({
        path: 'publisherID',
        select: ['title']
    });

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const reqBooks = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBooks) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck
        });
    }


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.topRatedBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    const filterObject = {};
    const filterObject1 = {};

    filterObject['bookMasterDetails.bookType'] = { $eq: 1 };
    filterObject['bookMasterDetails.rating'] = { $gte: '3' };
    filterObject1["bookMasterDetails.rating"] = -1;
    const popularBook = await PopularBook.aggregate([{
                $match: {
                    status: 1,
                    deleted: 0,
                }
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
                    from: "genremasters",
                    localField: "bookMasterDetails.genreID",
                    foreignField: "_id",
                    as: "genreMasterDetails"
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
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$genreMasterDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$authorMasterDetails", preserveNullAndEmptyArrays: true } },
            {
                $match: filterObject
            },
            {
                $project: {
                    "bookMasterID": 1,
                    "genreMasterDetails.title": 1,
                    "authorMasterDetails.first_name": 1,
                    "authorMasterDetails.middle_name": 1,
                    "authorMasterDetails.last_name": 1,
                    "bookMasterDetails.rating": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.front_image": 1,
                    "authorName": { $concat: ["$authorMasterDetails.first_name", " ", "$authorMasterDetails.middle_name", " ", "$authorMasterDetails.last_name"] }
                }
            }
        ])
        .sort(filterObject1)
        .collation({ locale: "en_US", numericOrdering: true })
        .limit(4);

    let arr = new Array();

    for (const iterator of popularBook) {
        const reqBook = await BookRequest.find({
            bookID: iterator.bookMasterID,
            deleted: 0,
            bookRequestStatus: 1
        });

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator.bookMasterID
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBooks = await BookRequest.findOne({
            bookID: iterator.bookMasterID,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBooks) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        var popularBookList = {};
        popularBookList['data'] = iterator;
        popularBookList['requestCount'] = reqBook.length;
        popularBookList['issueCount'] = bookIssuelist.length;
        popularBookList['reqCheck'] = reqCheck;
        arr.push(popularBookList);
    }

    // let byIssue = arr.slice(0);
    // byIssue.sort(function(a, b) {
    //     return b.issueCount - a.issueCount;
    // });

    response.successResponse({
        message: `Total books count= ${ arr.length }`,
        bookList: arr
    });

});

exports.recomendedBook = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    const bookDetails = await BookSuggested.aggregate([
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
                localField: "bookmasterId",
                foreignField: "_id",
                as: "bookMasterDetails"
            },
        },
        {
            $lookup: {
                from: "authormasters",
                localField: "bookMasterDetails.authorID",
                foreignField: "_id",
                as: "authorDetails"
            },
        },
        {
            $lookup: {
                from: "publishermasters",
                localField: "bookMasterDetails.publisherID",
                foreignField: "_id",
                as: "publisherDetails"
            },
        },
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "createdAt": 1,
                "bookmasterId": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.front_image": 1,
                "bookMasterDetails.description": 1,
                "authorDetails.first_name": 1,
                "authorDetails.middle_name": 1,
                "authorDetails.last_name": 1,
                "publisherDetails.title": 1
            }
        }
    ]).limit(2);

    response.successResponse({
        totalBookDetails: bookDetails.length,
        bookDetails: bookDetails
    });

});

exports.topRatedBooksList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);


    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    const filterObject12 = {};

    filterObject12['bookMasterDetails.rating'] = { $gte: '3' };
    filterObject12['bookMasterDetails.bookType'] = { $eq: 1 };

    if (req.body.sortId) {
        sortId = req.body.sortId;
    } else {
        sortId = "1";
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    if (sortId == "1") {
        filterObject["bookMasterDetails.rating"] = -1;
    }

    if (sortId == "6396ffb0d158366ed02d2f46") {
        filterObject["bookMasterDetails.rating"] = -1;
    }

    if (sortId == "6396ffd5505ac22d983d91c8") {
        filterObject["bookMasterDetails.title"] = 1;
    }

    if (sortId == "6396ffd5505ac22d983d91cb") {
        filterObject["bookMasterDetails.title"] = -1;
    }

    const popularBook = await PopularBook.aggregate([{
                $match: {
                    status: 1,
                    deleted: 0,
                }
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
                    from: "genremasters",
                    localField: "bookMasterDetails.genreID",
                    foreignField: "_id",
                    as: "genreMasterDetails"
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
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$genreMasterDetails", preserveNullAndEmptyArrays: true } },
            {
                $match: filterObject12
            },
            {
                $project: {
                    "bookMasterID": 1,
                    "genreMasterDetails.title": 1,
                    "authorMasterDetails.first_name": 1,
                    "authorMasterDetails.middle_name": 1,
                    "authorMasterDetails.last_name": 1,
                    "bookMasterDetails.rating": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.front_image": 1,
                }
            }
        ]).collation({ locale: "en" })
        .sort(filterObject)
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);


    let arr = new Array();

    for (const iterator of popularBook) {
        const reqBook = await BookRequest.find({
            bookID: iterator.bookMasterID,
            deleted: 0,
            bookRequestStatus: 1
        });

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator.bookMasterID
        }, {
            "_id": 1
        });

        const reqBooks = await BookRequest.findOne({
            bookID: iterator.bookMasterID,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBooks) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        var popularBookList = {};
        popularBookList['data'] = iterator;
        popularBookList['requestCount'] = reqBook.length;
        popularBookList['issueCount'] = bookIssuelist.length;
        popularBookList['reqCheck'] = reqCheck;
        arr.push(popularBookList);
    }

    // let byIssue;
    // if (sortId == "1") {
    //     byIssue = arr;
    // } else {
    //     byIssue = arr.slice(0);
    //     byIssue.sort(function(a, b) {
    //         return b.issueCount - a.issueCount;
    //     });
    // }

    const bookCount = await PopularBook.aggregate([{
            $match: {
                status: 1,
                deleted: 0,
            }
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
                from: "genremasters",
                localField: "bookMasterDetails.genreID",
                foreignField: "_id",
                as: "genreMasterDetails"
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
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$genreMasterDetails", preserveNullAndEmptyArrays: true } },
        {
            $match: filterObject12
        },
        {
            $project: {
                "bookMasterID": 1,
                "genreMasterDetails.title": 1,
                "authorMasterDetails.first_name": 1,
                "authorMasterDetails.middle_name": 1,
                "authorMasterDetails.last_name": 1,
                "bookMasterDetails.rating": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.front_image": 1,
            }
        }
    ]);

    response.successResponse({
        message: `Total books count= ${ arr.length }`,
        bookList: arr,
        bookCount: bookCount.length
    });

});

exports.bookDetails = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let bookId;
    let userId;
    let eligible;
    let ratingId = null;
    let reqCheck;

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
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    const bookDetails = await BookMaster.findOne({
        _id: bookId,
        deleted: 0,
    }, {
        "title": 1,
        "edition": 1,
        "pages": 1,
        "publishedYear": 1,
        "description": 1,
        "front_image": 1,
        "back_image": 1,
        "language": 1,
        "issue": 1,
        "volume": 1,
        "rating": 1,
        "bookType": 1,
        "availableQuantity": 1,
        "assignedQuantity": 1
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name']
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).populate({
        path: 'genreID',
        select: ['title']
    }).sort({ createdAt: -1 });

    if (bookDetails) {

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

            const checkratingStatus = await Bookrating.findOne({
                employeeID: userId,
                bookMasterID: bookId,
                deleted: 0,
            });

            if (checkratingStatus) {

                if (checkratingStatus.active == 1) {
                    eligible = false;
                } else if (checkratingStatus.active == 2) {
                    ratingId = checkratingStatus._id;
                    eligible = true;
                } else if (checkratingStatus.active == 3) {
                    eligible = false;
                } else if (checkratingStatus.active == 0) {
                    eligible = false;
                }
            } else {
                eligible = true;
            }
        } else {
            eligible = false;
        }

        const checkBookrating = await Bookrating.find({
            bookMasterID: bookId,
            active: 1,
            status: 1,
            deleted: 0
        }, {
            "rating": 1,
            "review": 1,
            "createdAt": 1,
            "remark": 1
        }).populate({
            path: 'employeeID',
            select: ['name']
        });

        let arr = new Array();

        let currentTime = new Date().getTime();

        for (const iterator of checkBookrating) {

            let expireTime = new Date(iterator.createdAt).getTime();

            let minuteValue = "";

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

            let checkBookratings = {};
            checkBookratings['data'] = iterator;
            checkBookratings['time'] = `${timeLeft} ${minuteValue} ago`;
            arr.push(checkBookratings);
        }


        const reqBook = await BookRequest.findOne({
            bookID: bookId,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        const checkBookreview = await Bookrating.find({
            bookMasterID: bookId,
            review: { $ne: null },
            active: 1,
            status: 1,
            deleted: 0
        });

        const oneStar = await Bookrating.find({
            bookMasterID: bookId,
            rating: 1,
            active: 1,
            status: 1,
            deleted: 0
        });

        const twoStar = await Bookrating.find({
            bookMasterID: bookId,
            rating: 2,
            active: 1,
            status: 1,
            deleted: 0
        });

        const fiveStar = await Bookrating.find({
            bookMasterID: bookId,
            rating: 5,
            active: 1,
            status: 1,
            deleted: 0
        });

        const threeStar = await Bookrating.find({
            bookMasterID: bookId,
            rating: 3,
            active: 1,
            status: 1,
            deleted: 0
        });

        const fourStar = await Bookrating.find({
            bookMasterID: bookId,
            rating: 4,
            active: 1,
            status: 1,
            deleted: 0
        });

        const totalRatingCount = oneStar.length + twoStar.length + threeStar.length + fourStar.length + fiveStar.length;

        const oneStarPercentage = (oneStar.length / totalRatingCount) * 100;
        const twoStarPercentage = (twoStar.length / totalRatingCount) * 100;
        const threeStarPercentage = (threeStar.length / totalRatingCount) * 100;
        const fourStarPercentage = (fourStar.length / totalRatingCount) * 100;
        const fiveStarPercentage = (fiveStar.length / totalRatingCount) * 100;

        response.successResponse({
            message: `Book Details`,
            bookData: bookDetails,
            ratingCount: checkBookrating.length,
            reviewCount: checkBookreview.length,
            oneStar: oneStar.length,
            twoStar: twoStar.length,
            threeStar: threeStar.length,
            fourStar: fourStar.length,
            fiveStar: fiveStar.length,
            ratingArray: arr,
            eligible: eligible,
            oneStarPercentage: oneStarPercentage,
            twoStarPercentage: twoStarPercentage,
            threeStarPercentage: threeStarPercentage,
            fourStarPercentage: fourStarPercentage,
            fiveStarPercentage: fiveStarPercentage,
            ratingId: ratingId,
            reqCheck: reqCheck
        });
    } else {
        return next(new AppError("Book details not found.", 500));
    }

});

exports.recommendedBookList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.sortId) {
        sortId = req.body.sortId;
    } else {
        sortId = "1";
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    if (sortId == "1") {
        filterObject["createdAt"] = 1;
    }

    if (sortId == "6396ffb0d158366ed02d2f46") {
        filterObject["createdAt"] = -1;
    }

    if (sortId == "6396ffd5505ac22d983d91c8") {
        filterObject["bookMasterDetails.title"] = 1;
    }

    if (sortId == "6396ffd5505ac22d983d91cb") {
        filterObject["bookMasterDetails.title"] = -1;
    }

    const bookDetails = await BookSuggested.aggregate([
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
                    localField: "bookmasterId",
                    foreignField: "_id",
                    as: "bookMasterDetails"
                },
            },
            {
                $lookup: {
                    from: "authormasters",
                    localField: "bookMasterDetails.authorID",
                    foreignField: "_id",
                    as: "authorDetails"
                },
            },
            {
                $lookup: {
                    from: "publishermasters",
                    localField: "bookMasterDetails.publisherID",
                    foreignField: "_id",
                    as: "publisherDetails"
                },
            },
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    "createdAt": 1,
                    "bookmasterId": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.front_image": 1,
                    "bookMasterDetails.description": 1,
                    "bookMasterDetails.rating": 1,
                    "authorDetails.first_name": 1,
                    "authorDetails.middle_name": 1,
                    "authorDetails.last_name": 1,
                    "publisherDetails.title": 1
                }
            }
        ]).collation({ locale: "en" })
        .sort(filterObject)
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    let arr = new Array();

    for (const iterator of bookDetails) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator.bookmasterId
        }, {
            "_id": 1
        });

        const reqBook = await BookRequest.findOne({
            bookID: iterator.bookmasterId,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        var bookList = {};
        bookList['data'] = iterator;
        bookList['issueCount'] = bookIssuelist.length;
        bookList['reqCheck'] = reqCheck;
        arr.push(bookList);
    }

    const bookCount = await BookSuggested.find({
        status: 1,
        deleted: 0,
    });

    response.successResponse({
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.bookRequisitionempList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;

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

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }


    try {
        const requisitionDetails = await BookRequisition.find({
                employeeID: userId,
                deleted: 0,
            }, {
                "bookName": 1,
                "authorName": 1,
                "remark": 1,
                "publisherName": 1,
                "description": 1,
                "requisitionStatus": 1,
                "createdAt": 1,
            }).sort({ createdAt: -1 })
            .skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        const bookCount = await BookRequisition.find({
            employeeID: userId,
            deleted: 0,
        });


        response.successResponse({
            message: `Total request count= ${ requisitionDetails.length }`,
            requisitionList: requisitionDetails,
            bookCount: bookCount.length
        });
    } catch (err) {
        return next(new AppError(err, 500));
    }

});

exports.eBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.body.sortId) {
        sortId = req.body.sortId;
    } else {
        sortId = "6396ffb0d158366ed02d2f46";
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    if (sortId == "6396ffb0d158366ed02d2f46") {
        filterObject["createdAt"] = -1;
    }

    if (sortId == "6396ffd5505ac22d983d91c8") {
        filterObject["title"] = 1;
    }

    if (sortId == "6396ffd5505ac22d983d91cb") {
        filterObject["title"] = -1;
    }

    const books = await EBookMaster.find({
            deleted: 0,
            status: 1
        }, {
            "title": 1,
            "front_image": 1
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name', 'profile_image', 'description']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).populate({
            path: 'genreID',
            select: ['title']
        }).collation({ locale: "en" })
        .sort(filterObject)
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await EBookMaster.find({
        bookType: 1,
        status: 1,
        deleted: 0,
    });

    response.successResponse({
        bookCount: bookCount.length,
        bookList: books
    });

});

exports.eBookDetails = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let bookId;

    if (!req.body.bookId) {
        return next(new AppError("E-Book details not found", 500))
    } else {
        const checkID = await EBookMaster.findById(req.body.bookId, {
            deleted: 0
        });

        if (checkID) {
            bookId = req.body.bookId;
        } else {
            return next(new AppError("E-Book details not found.", 500));
        }
    }

    const bookDetails = await EBookMaster.findOne({
        _id: bookId,
        deleted: 0,
    }, {
        "title": 1,
        "edition": 1,
        "pages": 1,
        "publishedYear": 1,
        "description": 1,
        "front_image": 1,
        "back_image": 1,
        "language": 1,
        "downloadURL": 1
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name']
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).populate({
        path: 'genreID',
        select: ['title']
    }).sort({ createdAt: -1 });

    if (bookDetails) {

        response.successResponse({
            message: `E-Book Details`,
            bookData: bookDetails
        });
    } else {
        return next(new AppError("Book details not found.", 500));
    }

});

exports.myRecordsDetails = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    }

    if (!req.body.recordId) {
        return next(new AppError("Details not found", 500))
    }

    // await UserRoleMaster.create({
    //     name: "Admin",
    //     userRoleId: 1,
    //     created_by: req.body.userId
    // });

    // await UserRoleMaster.create({
    //     name: "Librarian",
    //     userRoleId: 2,
    //     created_by: req.body.userId
    // });

    // await UserRoleMaster.create({
    //     name: "Employee",
    //     userRoleId: 3,
    //     created_by: req.body.userId
    // });

    // await UserRoleMaster.create({
    //     name: "Other",
    //     userRoleId: 4,
    //     created_by: req.body.userId
    // });

    const issueDetails = await BookIssue.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                $expr: { $eq: ['$_id', { $toObjectId: req.body.recordId }] },
                status: 1,
                deleted: 0
            },
        },
        {
            $lookup: {
                from: "bookdetailsmasters",
                localField: "bookID",
                foreignField: "_id",
                as: "bookDetails"
            },
        },
        {
            $lookup: {
                from: "bookmasters",
                localField: "bookDetails.bookID",
                foreignField: "_id",
                as: "bookMasterDetails"
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
                from: "bookjournalmagazinetypemasters",
                localField: "bookMasterDetails.bookType",
                foreignField: "typeId",
                as: "type"
            },
        },
        { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$bookDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "issueDate": 1,
                "returnDate": 1,
                "bookReturnStatus": 1,
                "updatedAt": 1,
                "bookDetails.bookReferenceNumber": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.edition": 1,
                "bookMasterDetails.bookType": 1,
                "bookMasterDetails._id": 1,
                "publishermastersDetails.title": 1,
                "type.name": 1
            }
        }
    ]);


    if (issueDetails.length > 0) {

        const books = await BookRequest.find({
            bookRequestStatus: 1,
            bookID: issueDetails[0].bookMasterDetails._id,
            employeeID: { $ne: req.body.userId },
            status: 1,
            deleted: 0,
        }, {
            "createdAt": 1,
        }).populate({
            path: 'employeeID',
            select: ['name', 'email', 'mobile']
        }).sort({ createdAt: -1 });

        let diffDays;

        if (issueDetails[0].bookReturnStatus == 0) {

            const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
            const firstDate = new Date(issueDetails[0].returnDate);
            const secondDate = new Date();

            if (firstDate < secondDate) {
                diffDays = Math.round(Math.abs((firstDate - secondDate) / oneDay));
            } else {
                diffDays = 0;
            }
        } else {
            diffDays = 0;
        }

        response.successResponse({
            todayDate: new Date(),
            recordDetails: issueDetails[0],
            requestCount: books.length,
            requestDetails: books,
            overDueDays: diffDays
        });
    } else {
        return next(new AppError("Request details not found.", 500));
    }

});

exports.empMagazine = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.sortId) {
        sortId = req.body.sortId;
    } else {
        sortId = "6396ffb0d158366ed02d2f46";
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    if (sortId == "6396ffb0d158366ed02d2f46") {
        filterObject["createdAt"] = -1;
    }

    if (sortId == "6396ffd5505ac22d983d91c8") {
        filterObject["title"] = 1;
    }

    if (sortId == "6396ffd5505ac22d983d91cb") {
        filterObject["title"] = -1;
    }

    const books = await BookMaster.find({
            bookType: 2,
            status: 1,
            deleted: 0,
        }, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .sort(filterObject)
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find({
        bookType: 2,
        status: 1,
        deleted: 0,
    });

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck
        });
    }

    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.empJournal = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.sortId) {
        sortId = req.body.sortId;
    } else {
        sortId = "6396ffb0d158366ed02d2f46";
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    if (sortId == "6396ffb0d158366ed02d2f46") {
        filterObject["createdAt"] = -1;
    }

    if (sortId == "6396ffd5505ac22d983d91c8") {
        filterObject["title"] = 1;
    }

    if (sortId == "6396ffd5505ac22d983d91cb") {
        filterObject["title"] = -1;
    }

    const books = await BookMaster.find({
            bookType: 3,
            status: 1,
            deleted: 0,
        }, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .sort(filterObject)
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find({
        bookType: 3,
        status: 1,
        deleted: 0,
    });

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck
        });
    }


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.filterBookName = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
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

    filterObject["bookType"] = 1;
    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const books = await BookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .sort({ createdAt: 1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .sort({ createdAt: 1 });

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck,
        });
    }

    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.bookRequestFilter = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    const filterObject = {};

    if (req.body.title) {
        filterObject['bookID.title'] = { $regex: req.body.title, "$options": "i" }
    }

    let startDate = new Date(req.body.toDate);

    // seconds * minutes * hours * milliseconds = 1 day 
    let day = 60 * 60 * 24 * 1000;

    let endDate = new Date(startDate.getTime() + day);


    if (req.body.fromDate && req.body.toDate) {
        filterObject['createdAt'] = { $gte: new Date(req.body.fromDate), $lte: endDate }
    }

    if (req.body.fromDate && !req.body.toDate) {
        filterObject['createdAt'] = { $gte: new Date(req.body.fromDate), $lte: new Date(new Date()) }
    }

    const books = await BookRequest.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                $expr: { $eq: ['$employeeID', { $toObjectId: userId }] },
                bookRequestStatus: 1,
                status: 1,
                deleted: 0
            },
        },
        {
            $lookup: {
                from: "bookmasters",
                localField: "bookID",
                foreignField: "_id",
                as: "bookID"
            },
        },
        { $unwind: { path: "$bookID", preserveNullAndEmptyArrays: true } },
        {
            $match: filterObject
        },
        {
            $project: {
                "createdAt": 1,
                "bookID.title": 1,
                "bookID.bookType": 1,
                "bookID.description": 1,
            }
        }
    ]);

    response.successResponse({
        message: `Total request count= ${ books.length }`,
        requestList: books
    });

});

exports.filterBookNameTopRated = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject12 = {};

    filterObject12['bookMasterDetails.rating'] = { $gte: '3' };

    const filterObject = {};

    if (req.body.title) {
        filterObject['bookMasterDetails.title'] = { $regex: req.body.title, "$options": "i" }
    }

    const popularBook = await PopularBook.aggregate([{
                $match: {
                    status: 1,
                    deleted: 0,
                }
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
                    from: "genremasters",
                    localField: "bookMasterDetails.genreID",
                    foreignField: "_id",
                    as: "genreMasterDetails"
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
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$genreMasterDetails", preserveNullAndEmptyArrays: true } },
            {
                $match: filterObject
            },
            {
                $match: filterObject12
            },
            {
                $project: {
                    "bookMasterID": 1,
                    "genreMasterDetails.title": 1,
                    "authorMasterDetails.first_name": 1,
                    "authorMasterDetails.middle_name": 1,
                    "authorMasterDetails.last_name": 1,
                    "bookMasterDetails.rating": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.front_image": 1,
                }
            }
        ]).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);


    let arr = new Array();

    for (const iterator of popularBook) {
        const reqBook = await BookRequest.find({
            bookID: iterator.bookMasterID,
            deleted: 0,
            bookRequestStatus: 1
        });

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator.bookMasterID
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBooks = await BookRequest.findOne({
            bookID: iterator.bookMasterID,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBooks) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        var popularBookList = {};
        popularBookList['data'] = iterator;
        popularBookList['requestCount'] = reqBook.length;
        popularBookList['issueCount'] = bookIssuelist.length;
        popularBookList['reqCheck'] = reqCheck;
        arr.push(popularBookList);
    }

    const bookCount = await PopularBook.aggregate([{
            $match: {
                status: 1,
                deleted: 0,
            }
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
                from: "genremasters",
                localField: "bookMasterDetails.genreID",
                foreignField: "_id",
                as: "genreMasterDetails"
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
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$genreMasterDetails", preserveNullAndEmptyArrays: true } },
        {
            $match: filterObject
        },
        {
            $match: filterObject12
        },
        {
            $project: {
                "bookMasterID": 1,
                "genreMasterDetails.title": 1,
                "authorMasterDetails.first_name": 1,
                "authorMasterDetails.middle_name": 1,
                "authorMasterDetails.last_name": 1,
                "bookMasterDetails.rating": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.front_image": 1,
            }
        }
    ]);

    response.successResponse({
        message: `Total books count= ${ arr.length }`,
        bookList: arr,
        bookCount: bookCount.length
    });

});

exports.filterBookTopRated = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    if (req.body.authorID) {

        let authorID = req.body.authorID;
        let authorIDArray = new Array();
        authorIDArray = authorID.split(",");
        let objectIdAuthorArray = authorIDArray.map(s => mongoose.Types.ObjectId(s));
        filterObject["bookMasterDetails.authorID"] = { $in: objectIdAuthorArray }

    }

    if (req.body.publisherID) {

        let publisherID = req.body.publisherID;
        let publisherIDArray = new Array();
        publisherIDArray = publisherID.split(",");
        let objectIdPubArray = publisherIDArray.map(s => mongoose.Types.ObjectId(s));
        filterObject["bookMasterDetails.publisherID"] = { $in: objectIdPubArray }

    }

    if (req.body.categoryID) {

        let categoryID = req.body.categoryID;
        let categoryIDArray = new Array();
        categoryIDArray = categoryID.split(",");
        let objectIdCatArray = categoryIDArray.map(s => mongoose.Types.ObjectId(s));
        filterObject["bookMasterDetails.genreID"] = { $in: objectIdCatArray }

    }

    if (req.body.language) {

        let language = req.body.language;
        let languageArray = new Array();
        languageArray = language.split(",");
        filterObject['bookMasterDetails.language'] = { $in: languageArray }

    }

    const filterObject12 = {};

    filterObject12['bookMasterDetails.rating'] = { $gte: '3' };

    const popularBook = await PopularBook.aggregate([{
                $match: {
                    status: 1,
                    deleted: 0,
                }
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
                    from: "genremasters",
                    localField: "bookMasterDetails.genreID",
                    foreignField: "_id",
                    as: "genreMasterDetails"
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
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$genreMasterDetails", preserveNullAndEmptyArrays: true } },
            {
                $match: filterObject
            },
            {
                $match: filterObject12
            },
            {
                $project: {
                    "bookMasterID": 1,
                    "genreMasterDetails.title": 1,
                    "authorMasterDetails.first_name": 1,
                    "authorMasterDetails.middle_name": 1,
                    "authorMasterDetails.last_name": 1,
                    "bookMasterDetails.rating": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.front_image": 1,
                }
            }
        ]).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);


    let arr = new Array();

    for (const iterator of popularBook) {
        const reqBook = await BookRequest.find({
            bookID: iterator.bookMasterID,
            deleted: 0,
            bookRequestStatus: 1
        });

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator.bookMasterID
        }, {
            "_id": 1
        });

        const reqBooks = await BookRequest.findOne({
            bookID: iterator.bookMasterID,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBooks) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        var popularBookList = {};
        popularBookList['data'] = iterator;
        popularBookList['requestCount'] = reqBook.length;
        popularBookList['issueCount'] = bookIssuelist.length;
        popularBookList['reqCheck'] = reqCheck;
        arr.push(popularBookList);
    }

    const popularBookCount = await PopularBook.aggregate([{
            $match: {
                status: 1,
                deleted: 0,
            }
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
                from: "genremasters",
                localField: "bookMasterDetails.genreID",
                foreignField: "_id",
                as: "genreMasterDetails"
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
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$genreMasterDetails", preserveNullAndEmptyArrays: true } },
        {
            $match: filterObject
        },
        {
            $match: filterObject12
        },
        {
            $project: {
                "bookMasterID": 1,
                "genreMasterDetails.title": 1,
                "authorMasterDetails.first_name": 1,
                "authorMasterDetails.middle_name": 1,
                "authorMasterDetails.last_name": 1,
                "bookMasterDetails.rating": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.front_image": 1,
            }
        }
    ]);

    response.successResponse({
        message: `Total books count= ${ arr.length }`,
        bookList: arr,
        bookCount: popularBookCount.length
    });

});

exports.filterGenreName = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
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

    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const genreDetails = await GenreMaster.find(filterObject, {
            'title': 1
        }).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const genreCount = await GenreMaster.find(filterObject);


    let arr = new Array();

    for (const iterator of genreDetails) {

        const bookDetailsCount = await BookMaster.find({
            genreID: iterator._id,
            status: 1,
            deleted: 0
        }, {
            "_id": 1
        });

        arr.push({
            title: iterator.title,
            genreId: iterator._id,
            bookCount: bookDetailsCount.length,
        });
    }

    response.successResponse({
        message: `Total books count= ${ arr.length }`,
        bookList: arr,
        genreCount: genreCount.length
    });

});

exports.categoryWiseBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    let categoryId;

    if (req.body.sortId) {
        sortId = req.body.sortId;
    } else {
        sortId = "6396ffb0d158366ed02d2f46";
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    if (sortId == "6396ffb0d158366ed02d2f46") {
        filterObject["createdAt"] = -1;
    }

    if (sortId == "6396ffd5505ac22d983d91c8") {
        filterObject["title"] = 1;
    }

    if (sortId == "6396ffd5505ac22d983d91cb") {
        filterObject["title"] = -1;
    }

    if (!req.body.categoryId) {
        return next(new AppError("Category details not found", 500))
    } else {
        const checkID = await GenreMaster.findById(req.body.categoryId, {
            deleted: 0
        });

        if (checkID) {
            categoryId = req.body.categoryId;
        } else {
            return next(new AppError("Category details not found.", 500));
        }
    }

    const books = await BookMaster.find({
            genreID: categoryId,
            status: 1,
            deleted: 0,
        }, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
            "bookType": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .sort(filterObject)
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find({
        genreID: categoryId,
        status: 1,
        deleted: 0,
    });

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookType: iterator.bookType,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck
        });
    }


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.filterBookNameRecentlyAdded = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
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

    filterObject['bookType'] = 1;
    filterObject['status'] = 1;
    filterObject['deleted'] = 0;

    const books = await BookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .sort({ createdAt: -1 })
        .limit(pageSize);

    const bookCount = await BookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1,
        "rating": 1,
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name']
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).collation({ locale: "en" });

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck
        });
    }


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.filterBookRecentlyAdded = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let authorID = req.body.authorID;
    let publisherID = req.body.publisherID;
    let categoryID = req.body.categoryID;
    let language = req.body.language;

    let authorIDArray = new Array();
    let publisherIDArray = new Array();
    let categoryIDArray = new Array();
    let languageArray = new Array();


    authorIDArray = authorID.split(",");
    publisherIDArray = publisherID.split(",");
    categoryIDArray = categoryID.split(",");
    languageArray = language.split(",");

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};


    if (req.body.authorID) {
        filterObject["authorID"] = { $in: authorIDArray }
    }

    if (req.body.publisherID) {
        filterObject["publisherID"] = { $in: publisherIDArray }
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = { $in: categoryIDArray }
    }

    if (req.body.language) {
        filterObject['language'] = { $in: languageArray }
    }

    filterObject["bookType"] = 1;
    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const books = await BookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find(filterObject);

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBooks = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBooks) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck,
        });
    }


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.filterBookNameRecommendedBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    if (req.body.title) {
        filterObject['bookMasterDetails.title'] = { $regex: req.body.title, "$options": "i" }
    }

    const bookDetails = await BookSuggested.aggregate([
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
                    localField: "bookmasterId",
                    foreignField: "_id",
                    as: "bookMasterDetails"
                },
            },
            {
                $lookup: {
                    from: "authormasters",
                    localField: "bookMasterDetails.authorID",
                    foreignField: "_id",
                    as: "authorDetails"
                },
            },
            {
                $lookup: {
                    from: "publishermasters",
                    localField: "bookMasterDetails.publisherID",
                    foreignField: "_id",
                    as: "publisherDetails"
                },
            },
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            {
                $match: filterObject
            },
            {
                $project: {
                    "createdAt": 1,
                    "bookmasterId": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.front_image": 1,
                    "bookMasterDetails.description": 1,
                    "bookMasterDetails.rating": 1,
                    "authorDetails.first_name": 1,
                    "authorDetails.middle_name": 1,
                    "authorDetails.last_name": 1,
                    "publisherDetails.title": 1
                }
            }
        ]).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    let arr = new Array();

    for (const iterator of bookDetails) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator.bookmasterId
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBooks = await BookRequest.findOne({
            bookID: iterator.bookmasterId,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBooks) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        var bookList = {};
        bookList['data'] = iterator;
        bookList['issueCount'] = bookIssuelist.length;
        bookList['reqCheck'] = reqCheck;
        arr.push(bookList);
    }

    const bookCount = await BookSuggested.aggregate([
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
                    localField: "bookmasterId",
                    foreignField: "_id",
                    as: "bookMasterDetails"
                },
            },
            {
                $lookup: {
                    from: "authormasters",
                    localField: "bookMasterDetails.authorID",
                    foreignField: "_id",
                    as: "authorDetails"
                },
            },
            {
                $lookup: {
                    from: "publishermasters",
                    localField: "bookMasterDetails.publisherID",
                    foreignField: "_id",
                    as: "publisherDetails"
                },
            },
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            {
                $match: filterObject
            },
            {
                $project: {
                    "createdAt": 1,
                    "bookmasterId": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.front_image": 1,
                    "bookMasterDetails.description": 1,
                    "bookMasterDetails.rating": 1,
                    "authorDetails.first_name": 1,
                    "authorDetails.middle_name": 1,
                    "authorDetails.last_name": 1,
                    "publisherDetails.title": 1
                }
            }
        ]).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    response.successResponse({
        bookCount: arr.length,
        bookList: arr,
        bookCount: bookCount.length
    });

});

exports.filterRecommendedBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    if (req.body.authorID) {

        let authorID = req.body.authorID;
        let authorIDArray = new Array();
        authorIDArray = authorID.split(",");
        let objectIdAuthorArray = authorIDArray.map(s => mongoose.Types.ObjectId(s));
        filterObject["bookMasterDetails.authorID"] = { $in: objectIdAuthorArray }

    }

    if (req.body.publisherID) {

        let publisherID = req.body.publisherID;
        let publisherIDArray = new Array();
        publisherIDArray = publisherID.split(",");
        let objectIdPubArray = publisherIDArray.map(s => mongoose.Types.ObjectId(s));
        filterObject["bookMasterDetails.publisherID"] = { $in: objectIdPubArray }

    }

    if (req.body.categoryID) {

        let categoryID = req.body.categoryID;
        let categoryIDArray = new Array();
        categoryIDArray = categoryID.split(",");
        let objectIdCatArray = categoryIDArray.map(s => mongoose.Types.ObjectId(s));
        filterObject["bookMasterDetails.genreID"] = { $in: objectIdCatArray }

    }

    if (req.body.language) {

        let language = req.body.language;
        let languageArray = new Array();
        languageArray = language.split(",");
        filterObject['bookMasterDetails.language'] = { $in: languageArray }

    }

    const bookDetails = await BookSuggested.aggregate([
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
                    localField: "bookmasterId",
                    foreignField: "_id",
                    as: "bookMasterDetails"
                },
            },
            {
                $lookup: {
                    from: "authormasters",
                    localField: "bookMasterDetails.authorID",
                    foreignField: "_id",
                    as: "authorDetails"
                },
            },
            {
                $lookup: {
                    from: "publishermasters",
                    localField: "bookMasterDetails.publisherID",
                    foreignField: "_id",
                    as: "publisherDetails"
                },
            },
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            {
                $match: filterObject
            },
            {
                $project: {
                    "createdAt": 1,
                    "bookmasterId": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.front_image": 1,
                    "bookMasterDetails.description": 1,
                    "bookMasterDetails.rating": 1,
                    "authorDetails.first_name": 1,
                    "authorDetails.middle_name": 1,
                    "authorDetails.last_name": 1,
                    "publisherDetails.title": 1
                }
            }
        ]).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    let arr = new Array();

    for (const iterator of bookDetails) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator.bookmasterId
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBooks = await BookRequest.findOne({
            bookID: iterator.bookmasterId,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBooks) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        var bookList = {};
        bookList['data'] = iterator;
        bookList['issueCount'] = bookIssuelist.length;
        bookList['reqCheck'] = reqCheck;
        arr.push(bookList);
    }

    const bookCount = await BookSuggested.aggregate([
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
                localField: "bookmasterId",
                foreignField: "_id",
                as: "bookMasterDetails"
            },
        },
        {
            $lookup: {
                from: "authormasters",
                localField: "bookMasterDetails.authorID",
                foreignField: "_id",
                as: "authorDetails"
            },
        },
        {
            $lookup: {
                from: "publishermasters",
                localField: "bookMasterDetails.publisherID",
                foreignField: "_id",
                as: "publisherDetails"
            },
        },
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        {
            $match: filterObject
        },
        {
            $project: {
                "createdAt": 1,
                "bookmasterId": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.front_image": 1,
                "bookMasterDetails.description": 1,
                "bookMasterDetails.rating": 1,
                "authorDetails.first_name": 1,
                "authorDetails.middle_name": 1,
                "authorDetails.last_name": 1,
                "publisherDetails.title": 1
            }
        }
    ]);

    response.successResponse({
        bookCount: bookCount.length,
        bookList: arr
    });


});

exports.filterMagazineName = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
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

    filterObject['bookType'] = 2;
    filterObject['status'] = 1;
    filterObject['deleted'] = 0;

    const books = await BookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize)
        .sort({ createdAt: -1 });

    const bookCount = await BookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1,
        "rating": 1,
    }).populate({
        path: 'publisherID',
        select: ['title']
    });

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck
        });
    }


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.filterMagazine = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    let publisherID = req.body.publisherID;
    let categoryID = req.body.categoryID;
    let language = req.body.language;

    let publisherIDArray = new Array();
    let categoryIDArray = new Array();
    let languageArray = new Array();

    publisherIDArray = publisherID.split(",");
    categoryIDArray = categoryID.split(",");
    languageArray = language.split(",");

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    if (req.body.publisherID) {
        filterObject["publisherID"] = { $in: publisherIDArray }
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = { $in: categoryIDArray }
    }

    if (req.body.language) {
        filterObject['language'] = { $in: languageArray }
    }

    filterObject["bookType"] = 2;
    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const books = await BookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find(filterObject);

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck
        });
    }


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.filterJournal = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    let publisherID = req.body.publisherID;
    let categoryID = req.body.categoryID;

    let publisherIDArray = new Array();
    let categoryIDArray = new Array();

    publisherIDArray = publisherID.split(",");
    categoryIDArray = categoryID.split(",");

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    const filterObject = {};

    if (req.body.publisherID) {
        filterObject["publisherID"] = { $in: publisherIDArray }
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = { $in: categoryIDArray }
    }

    filterObject["bookType"] = 3;
    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const books = await BookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1,
        "rating": 1,
    }).populate({
        path: 'publisherID',
        select: ['title']
    });

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck
        });
    }


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.filterJournalName = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
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

    filterObject['bookType'] = 3;
    filterObject['status'] = 1;
    filterObject['deleted'] = 0;

    const books = await BookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize)
        .sort({ createdAt: -1 });

    const bookCount = await BookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1,
        "rating": 1,
    }).populate({
        path: 'publisherID',
        select: ['title']
    });


    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck,
        });
    }


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.categoryWiseBookFilterName = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    let categoryId;

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    if (!req.body.categoryId) {
        return next(new AppError("Category details not found", 500))
    } else {
        const checkID = await GenreMaster.findById(req.body.categoryId, {
            deleted: 0
        });

        if (checkID) {
            categoryId = req.body.categoryId;
        } else {
            return next(new AppError("Category details not found.", 500));
        }
    }

    const filterObject = {};

    if (req.body.title) {
        filterObject['title'] = { $regex: req.body.title, "$options": "i" }
    }

    filterObject['genreID'] = categoryId;
    filterObject['status'] = 1;
    filterObject['deleted'] = 0;

    const books = await BookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
            "bookType": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1,
        "rating": 1,
        "bookType": 1,
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name']
    }).populate({
        path: 'publisherID',
        select: ['title']
    });

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        arr.push({
            id: iterator._id,
            bookType: iterator.bookType,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck
        });
    }


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.categoryWiseBookFilter = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let categoryId;

    let userId;
    let reqCheck;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            userId = req.body.userId;
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    if (!req.body.categoryId) {
        return next(new AppError("Category details not found", 500))
    } else {
        const checkID = await GenreMaster.findById(req.body.categoryId, {
            deleted: 0
        });

        if (checkID) {
            categoryId = req.body.categoryId;
        } else {
            return next(new AppError("Category details not found.", 500));
        }
    }

    let authorID = req.body.authorID;
    let publisherID = req.body.publisherID;
    let language = req.body.language;

    let authorIDArray = new Array();
    let publisherIDArray = new Array();
    let languageArray = new Array();


    authorIDArray = authorID.split(",");
    publisherIDArray = publisherID.split(",");
    languageArray = language.split(",")

    const filterObject = {};


    if (req.body.authorID) {
        filterObject["authorID"] = { $in: authorIDArray }
    }

    if (req.body.publisherID) {
        filterObject["publisherID"] = { $in: publisherIDArray }
    }

    if (req.body.language) {
        filterObject['language'] = { $in: languageArray }
    }

    filterObject['genreID'] = categoryId;
    filterObject['status'] = 1;
    filterObject['deleted'] = 0;

    const books = await BookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1,
            "rating": 1,
            "bookType": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1,
        "rating": 1,
        "bookType": 1,
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name']
    }).populate({
        path: 'publisherID',
        select: ['title']
    });

    let arr = new Array();

    for (const iterator of books) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const reqBook = await BookRequest.findOne({
            bookID: iterator._id,
            employeeID: userId,
            deleted: 0,
            bookRequestStatus: 1
        });

        if (reqBook) {
            reqCheck = 'Already Requested';
        } else {
            reqCheck = 'Request Book';
        }

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        arr.push({
            id: iterator._id,
            bookType: iterator.bookType,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length,
            reqCheck: reqCheck,
        });
    }


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookCount: bookCount.length,
        bookList: arr
    });

});

exports.eBookTitleSearch = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
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

    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const books = await EBookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name', 'profile_image', 'description']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).populate({
            path: 'genreID',
            select: ['title']
        }).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize)
        .sort({ createdAt: -1 });

    const bookCount = await EBookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name', 'profile_image', 'description']
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).populate({
        path: 'genreID',
        select: ['title']
    });

    response.successResponse({
        bookCount: bookCount.length,
        bookList: books
    });

});

exports.eBookFilter = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.body.pageSize) {
        pageSize = +req.body.pageSize;
    } else {
        pageSize = 12;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    let authorID = req.body.authorID;
    let publisherID = req.body.publisherID;
    let categoryID = req.body.categoryID;
    let language = req.body.language;

    let authorIDArray = new Array();
    let publisherIDArray = new Array();
    let categoryIDArray = new Array();
    let languageArray = new Array();


    authorIDArray = authorID.split(",");
    publisherIDArray = publisherID.split(",");
    categoryIDArray = categoryID.split(",");
    languageArray = language.split(",");

    const filterObject = {};

    if (req.body.authorID) {
        filterObject["authorID"] = { $in: authorIDArray }
    }

    if (req.body.publisherID) {
        filterObject["publisherID"] = { $in: publisherIDArray }
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = { $in: categoryIDArray }
    }

    if (req.body.language) {
        filterObject['language'] = { $in: languageArray }
    }

    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const books = await EBookMaster.find(filterObject, {
            "title": 1,
            "front_image": 1
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name', 'profile_image', 'description']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).populate({
            path: 'genreID',
            select: ['title']
        }).collation({ locale: "en" })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await EBookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name', 'profile_image', 'description']
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).populate({
        path: 'genreID',
        select: ['title']
    });

    response.successResponse({
        bookCount: bookCount.length,
        bookList: books
    });

});

exports.filterBookRecentlyAddedCount = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let authorID = req.body.authorID;
    let publisherID = req.body.publisherID;
    let categoryID = req.body.categoryID;
    let language = req.body.language;

    let authorIDArray = new Array();
    let publisherIDArray = new Array();
    let categoryIDArray = new Array();
    let languageArray = new Array();


    authorIDArray = authorID.split(",");
    publisherIDArray = publisherID.split(",");
    categoryIDArray = categoryID.split(",");
    languageArray = language.split(",");

    const filterObject = {};


    if (req.body.authorID) {
        filterObject["authorID"] = { $in: authorIDArray }
    }

    if (req.body.publisherID) {
        filterObject["publisherID"] = { $in: publisherIDArray }
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = { $in: categoryIDArray }
    }

    if (req.body.language) {
        filterObject['language'] = { $in: languageArray }
    }

    filterObject["bookType"] = 1;
    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const books = await BookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1,
        "rating": 1,
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name']
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).collation({ locale: "en" });

    response.successResponse({
        bookCount: books.length
    });

});

exports.filterRecommendedBookCount = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const filterObject = {};

    if (req.body.authorID) {

        let authorID = req.body.authorID;
        let authorIDArray = new Array();
        authorIDArray = authorID.split(",");
        let objectIdAuthorArray = authorIDArray.map(s => mongoose.Types.ObjectId(s));
        filterObject["bookMasterDetails.authorID"] = { $in: objectIdAuthorArray }

    }

    if (req.body.publisherID) {

        let publisherID = req.body.publisherID;
        let publisherIDArray = new Array();
        publisherIDArray = publisherID.split(",");
        let objectIdPubArray = publisherIDArray.map(s => mongoose.Types.ObjectId(s));
        filterObject["bookMasterDetails.publisherID"] = { $in: objectIdPubArray }

    }

    if (req.body.categoryID) {

        let categoryID = req.body.categoryID;
        let categoryIDArray = new Array();
        categoryIDArray = categoryID.split(",");
        let objectIdCatArray = categoryIDArray.map(s => mongoose.Types.ObjectId(s));
        filterObject["bookMasterDetails.genreID"] = { $in: objectIdCatArray }

    }

    if (req.body.language) {

        let language = req.body.language;
        let languageArray = new Array();
        languageArray = language.split(",");
        filterObject['bookMasterDetails.language'] = { $in: languageArray }

    }

    const bookDetails = await BookSuggested.aggregate([
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
                localField: "bookmasterId",
                foreignField: "_id",
                as: "bookMasterDetails"
            },
        },
        {
            $lookup: {
                from: "authormasters",
                localField: "bookMasterDetails.authorID",
                foreignField: "_id",
                as: "authorDetails"
            },
        },
        {
            $lookup: {
                from: "publishermasters",
                localField: "bookMasterDetails.publisherID",
                foreignField: "_id",
                as: "publisherDetails"
            },
        },
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        {
            $match: filterObject
        },
        {
            $project: {
                "createdAt": 1,
                "bookmasterId": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.front_image": 1,
                "bookMasterDetails.description": 1,
                "bookMasterDetails.rating": 1,
                "authorDetails.first_name": 1,
                "authorDetails.middle_name": 1,
                "authorDetails.last_name": 1,
                "publisherDetails.title": 1
            }
        }
    ]).collation({ locale: "en" });

    response.successResponse({
        bookCount: bookDetails.length
    });
});

exports.filterBookCount = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    let authorID = req.body.authorID;
    let publisherID = req.body.publisherID;
    let categoryID = req.body.categoryID;
    let language = req.body.language;

    let authorIDArray = new Array();
    let publisherIDArray = new Array();
    let categoryIDArray = new Array();
    let languageArray = new Array();


    authorIDArray = authorID.split(",");
    publisherIDArray = publisherID.split(",");
    categoryIDArray = categoryID.split(",");
    languageArray = language.split(",");

    const filterObject = {};

    if (req.body.authorID) {
        filterObject["authorID"] = { $in: authorIDArray }
    }

    if (req.body.publisherID) {
        filterObject["publisherID"] = { $in: publisherIDArray }
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = { $in: categoryIDArray }
    }

    if (req.body.language) {
        filterObject['language'] = { $in: languageArray }
    }

    filterObject["bookType"] = 1;
    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const books = await BookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1,
        "rating": 1,
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name']
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).collation({ locale: "en" });

    response.successResponse({
        bookCount: books.length
    });

});

exports.filterBookTopRatedCount = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const filterObject = {};

    if (req.body.authorID) {

        let authorID = req.body.authorID;
        let authorIDArray = new Array();
        authorIDArray = authorID.split(",");
        let objectIdAuthorArray = authorIDArray.map(s => mongoose.Types.ObjectId(s));
        filterObject["bookMasterDetails.authorID"] = { $in: objectIdAuthorArray }

    }

    if (req.body.publisherID) {

        let publisherID = req.body.publisherID;
        let publisherIDArray = new Array();
        publisherIDArray = publisherID.split(",");
        let objectIdPubArray = publisherIDArray.map(s => mongoose.Types.ObjectId(s));
        filterObject["bookMasterDetails.publisherID"] = { $in: objectIdPubArray }

    }

    filterObject['bookMasterDetails.rating'] = { $gte: '3' };

    if (req.body.categoryID) {

        let categoryID = req.body.categoryID;
        let categoryIDArray = new Array();
        categoryIDArray = categoryID.split(",");
        let objectIdCatArray = categoryIDArray.map(s => mongoose.Types.ObjectId(s));
        filterObject["bookMasterDetails.genreID"] = { $in: objectIdCatArray }

    }

    if (req.body.language) {

        let language = req.body.language;
        let languageArray = new Array();
        languageArray = language.split(",");
        filterObject['bookMasterDetails.language'] = { $in: languageArray }

    }

    const popularBook = await PopularBook.aggregate([{
            $match: {
                status: 1,
                deleted: 0,
            }
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
                from: "genremasters",
                localField: "bookMasterDetails.genreID",
                foreignField: "_id",
                as: "genreMasterDetails"
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
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$genreMasterDetails", preserveNullAndEmptyArrays: true } },
        {
            $match: filterObject
        },
        {
            $project: {
                "bookMasterID": 1,
                "genreMasterDetails.title": 1,
                "authorMasterDetails.first_name": 1,
                "authorMasterDetails.middle_name": 1,
                "authorMasterDetails.last_name": 1,
                "bookMasterDetails.rating": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.front_image": 1,
            }
        }
    ]).collation({ locale: "en" });


    response.successResponse({
        bookCount: popularBook.length
    });
});

exports.categoryWiseBookFilterCount = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let categoryId;

    if (!req.body.categoryId) {
        return next(new AppError("Category details not found", 500))
    } else {
        const checkID = await GenreMaster.findById(req.body.categoryId, {
            deleted: 0
        });

        if (checkID) {
            categoryId = req.body.categoryId;
        } else {
            return next(new AppError("Category details not found.", 500));
        }
    }

    let authorID = req.body.authorID;
    let publisherID = req.body.publisherID;
    let language = req.body.language;

    let authorIDArray = new Array();
    let publisherIDArray = new Array();
    let languageArray = new Array();


    authorIDArray = authorID.split(",");
    publisherIDArray = publisherID.split(",");
    languageArray = language.split(",")

    const filterObject = {};


    if (req.body.authorID) {
        filterObject["authorID"] = { $in: authorIDArray }
    }

    if (req.body.publisherID) {
        filterObject["publisherID"] = { $in: publisherIDArray }
    }

    if (req.body.language) {
        filterObject['language'] = { $in: languageArray }
    }

    filterObject['genreID'] = categoryId;
    filterObject['status'] = 1;
    filterObject['deleted'] = 0;

    const books = await BookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1,
        "rating": 1,
        "bookType": 1,
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name']
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).collation({ locale: "en" });

    response.successResponse({
        bookCount: books.length,
    });

});

exports.filterMagazineCount = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let publisherID = req.body.publisherID;
    let categoryID = req.body.categoryID;
    let language = req.body.language;

    let publisherIDArray = new Array();
    let categoryIDArray = new Array();
    let languageArray = new Array();

    publisherIDArray = publisherID.split(",");
    categoryIDArray = categoryID.split(",");
    languageArray = language.split(",");

    const filterObject = {};

    if (req.body.publisherID) {
        filterObject["publisherID"] = { $in: publisherIDArray }
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = { $in: categoryIDArray }
    }

    if (req.body.language) {
        filterObject['language'] = { $in: languageArray }
    }

    filterObject["bookType"] = 2;
    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const books = await BookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1,
        "rating": 1,
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).collation({ locale: "en" });

    response.successResponse({
        bookCount: books.length,
    });

});

exports.filterJournalCount = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let publisherID = req.body.publisherID;
    let categoryID = req.body.categoryID;

    let publisherIDArray = new Array();
    let categoryIDArray = new Array();

    publisherIDArray = publisherID.split(",");
    categoryIDArray = categoryID.split(",");

    const filterObject = {};

    if (req.body.publisherID) {
        filterObject["publisherID"] = { $in: publisherIDArray }
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = { $in: categoryIDArray }
    }

    filterObject["bookType"] = 3;
    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const books = await BookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1,
        "rating": 1,
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).collation({ locale: "en" });

    response.successResponse({
        bookCount: books.length
    });

});

exports.eBookFilterCount = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let authorID = req.body.authorID;
    let publisherID = req.body.publisherID;
    let categoryID = req.body.categoryID;
    let language = req.body.language;

    let authorIDArray = new Array();
    let publisherIDArray = new Array();
    let categoryIDArray = new Array();
    let languageArray = new Array();


    authorIDArray = authorID.split(",");
    publisherIDArray = publisherID.split(",");
    categoryIDArray = categoryID.split(",");
    languageArray = language.split(",");

    const filterObject = {};

    if (req.body.authorID) {
        filterObject["authorID"] = { $in: authorIDArray }
    }

    if (req.body.publisherID) {
        filterObject["publisherID"] = { $in: publisherIDArray }
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = { $in: categoryIDArray }
    }

    if (req.body.language) {
        filterObject['language'] = { $in: languageArray }
    }

    filterObject["status"] = 1;
    filterObject["deleted"] = 0;

    const books = await EBookMaster.find(filterObject, {
        "title": 1,
        "front_image": 1
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name', 'profile_image', 'description']
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).populate({
        path: 'genreID',
        select: ['title']
    }).collation({ locale: "en" });

    response.successResponse({
        bookCount: books.length
    });

});