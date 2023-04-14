const catchAsync = require("../../utils/catchAsync");
const BookMaster = require("../../models/admin/BookMaster");
const BookDetailsMaster = require("../../models/admin/BookDetailsMaster");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const BookIssue = require("../../models/admin/BookIssue");
const PopularBook = require("../../models/admin/popularBook");
const BookRequest = require("../../models/employee/BookRequest");
const Activity = require("../../models/activity/activityLog");
const Bookrating = require("../../models/employee/bookRating");
const ItemStatusMaster = require("../../models/admin/itemStatusMaster");
const BookRequisitionStatusMaster = require("../../models/admin/bookRequisitionStatusMaster");

exports.cardDetails = catchAsync(async(req, res, next) => {

    // await BookRequisitionStatusMaster.create({
    //     typeId: 1,
    //     name: "Pending",
    //     created_by: req.user._id
    // });

    // await BookRequisitionStatusMaster.create({
    //     typeId: 2,
    //     name: "Approve",
    //     created_by: req.user._id
    // });

    // await BookRequisitionStatusMaster.create({
    //     typeId: 3,
    //     name: "Cancel",
    //     created_by: req.user._id
    // });

    // await BookRequisitionStatusMaster.create({
    //     typeId: 4,
    //     name: "Add to Library",
    //     created_by: req.user._id
    // });

    const response = new AppSuccess(res);
    let sumCopies = 0;
    let issueCount = 0;
    let returnCount = 0;

    const books = await BookMaster.countDocuments({
        deleted: 0,
        bookType: 1
    });

    const copies = await BookMaster.aggregate([{
            $match: {
                deleted: 0,
                bookType: 1
            }
        },
        { $group: { _id: "null", copies: { $sum: "$assignedQuantity" } } }
    ]);

    if (copies.length > 0) {
        sumCopies = copies[0].copies;
    } else {
        sumCopies = sumCopies;
    }

    const issueBook = await BookIssue.find({
        status: 1,
        deleted: 0,
        bookReturnStatus: 0
    });

    if (issueBook.length > 0) {
        issueCount = issueBook.length;
    } else {
        issueCount = issueCount;
    }

    const returnBook = await BookIssue.find({
        status: 1,
        deleted: 0,
        bookReturnStatus: 1
    });

    if (returnBook.length > 0) {
        returnCount = returnBook.length;
    } else {
        returnCount = returnCount;
    }

    const lastIssueBook = await BookIssue.aggregate([{
            $match: {
                status: 1,
                deleted: 0,
                bookReturnStatus: 0
            }
        }, {

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
                from: "bookjournalmagazinetypemasters",
                localField: "bookMasterDetails.bookType",
                foreignField: "typeId",
                as: "type"
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
        { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "issueDate": 1,
                "returnDate": 1,
                "employeeDetails.email": 1,
                "employeeDetails.name": 1,
                "employeeDetails.mobile": 1,
                "bookDetails.bookReferenceNumber": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails._id": 1,
                "bookMasterDetails.bookType": 1,
                "type.name": 1
            }
        }
    ]).sort({ createdAt: -1 }).
    limit(5);

    const overDueBook = await BookIssue.aggregate([{
            $match: {
                status: 1,
                deleted: 0,
                bookReturnStatus: 0,
                returnDate: {
                    $lt: new Date()
                }
            }
        }, {

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
                from: "users",
                localField: "employeeID",
                foreignField: "_id",
                as: "employeeDetails"
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
        {
            $project: {
                "issueDate": 1,
                "returnDate": 1,
                "employeeDetails.email": 1,
                "employeeDetails.name": 1,
                "employeeDetails.mobile": 1,
                "bookDetails.bookReferenceNumber": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.bookType": 1,
                "bookMasterDetails._id": 1,
                "type.name": 1
            }
        }
    ]).sort({ createdAt: -1 }).
    limit(5);

    // const popularBook = await BookIssue.aggregate([{
    //         $match: {
    //             deleted: 0
    //         }
    //     },
    //     {
    //         $lookup: {
    //             from: "bookdetailsmasters",
    //             localField: "bookID",
    //             foreignField: "_id",
    //             as: "bookDetails"
    //         },
    //     },
    //     {
    //         $project: {
    //             "bookDetails.bookID": 1
    //         }
    //     },
    //     { $unwind: { path: "$bookDetails", preserveNullAndEmptyArrays: true } },
    //     {
    //         $lookup: {
    //             from: "bookmasters",
    //             localField: "bookDetails.bookID",
    //             foreignField: "_id",
    //             as: "bookMasterDetails"
    //         },
    //     },
    //     {
    //         $project: {
    //             "bookMasterDetails._id": 1,
    //         }
    //     },
    //     { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
    //     {
    //         $group: {
    //             _id: { bookID: "$bookMasterDetails._id" },
    //             issue: { $sum: 1 },
    //             doc: {
    //                 $push: "$$ROOT"
    //             }
    //         }
    //     },
    //     {
    //         $project: {
    //             issue: "$issue"
    //         }
    //     }
    // ]);

    // let arr = new Array()

    // for (const iterator of popularBook) {
    //     const reqBook = await BookRequest.find({
    //         bookID: iterator._id.bookID,
    //         deleted: 0,
    //         bookRequestStatus: 1
    //     });

    //     const bookDetails = await BookMaster.find({
    //         _id: iterator._id.bookID,
    //         deleted: 0
    //     }, {
    //         "title": 1,
    //         "edition": 1,
    //     }).populate({
    //         path: 'authorID',
    //         select: ['first_name', 'middle_name', 'last_name']
    //     }).populate({
    //         path: 'publisherID',
    //         select: ['title']
    //     }).populate({
    //         path: 'genreID',
    //         select: ['title']
    //     });

    //     const bookrating = await Bookrating.aggregate([{
    //             $match: {
    //                 bookMasterID: iterator._id.bookID,
    //                 deleted: 0
    //             }
    //         },
    //         {
    //             $group: {
    //                 _id: "$bookMasterID",
    //                 avgRating: { $avg: "$rating" }
    //             }
    //         }
    //     ]);

    //     var popularBookList = {};
    //     popularBookList['data'] = bookDetails[0];
    //     popularBookList['requestCount'] = reqBook.length;
    //     popularBookList['issueCount'] = iterator.issue;
    //     popularBookList['rating'] = bookrating[0].avgRating;
    //     arr.push(popularBookList);
    // }

    const filterObject = {};
    const filterObject1 = {};

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
        {
            $lookup: {
                from: "bookjournalmagazinetypemasters",
                localField: "bookMasterDetails.bookType",
                foreignField: "typeId",
                as: "type"
            },
        },
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$genreMasterDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
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
                "bookMasterDetails.bookType": 1,
                "bookMasterDetails._id": 1,
                "type.name": 1
            }
        }
    ]).sort(filterObject1).
    limit(5);

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

        var popularBookList = {};
        popularBookList['data'] = iterator;
        popularBookList['requestCount'] = reqBook.length;
        popularBookList['issueCount'] = bookIssuelist.length;
        arr.push(popularBookList);
    }

    let byIssue = arr.slice(0);
    byIssue.sort(function(a, b) {
        return b.issueCount - a.issueCount;
    });

    const requestBook = await BookRequest.aggregate([{
            $match: {
                status: 1,
                deleted: 0,
                bookRequestStatus: 1
            }
        },
        {
            $lookup: {
                from: "bookmasters",
                localField: "bookID",
                foreignField: "_id",
                as: "bookMasterDetails"
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
        {
            $lookup: {
                from: "bookjournalmagazinetypemasters",
                localField: "bookMasterDetails.bookType",
                foreignField: "typeId",
                as: "type"
            },
        },
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "createdAt": 1,
                "notifyStatus": 1,
                "employeeDetails.email": 1,
                "employeeDetails.name": 1,
                "employeeDetails.mobile": 1,
                "bookMasterDetails.title": 1,
                "type.name": 1,
                "bookMasterDetails.bookType": 1,
                "bookMasterDetails._id": 1,
                "bookMasterDetails.assignedQuantity": 1,
                "bookMasterDetails.availableQuantity": 1
            }
        }
    ]).sort({ createdAt: 1 }).
    limit(5);

    response.successResponse({
        totalBook: books,
        totalCopies: sumCopies,
        totalIssue: issueCount,
        totalreturn: returnCount,
        lastIssueBook: lastIssueBook,
        overDueBook: overDueBook,
        popularBook: arr,
        requestBook: requestBook,
    });

});


exports.statisticsDetails = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let sumCopies = 0;
    let issueCount = 0;
    let returnCount = 0;

    const books = await BookMaster.countDocuments({
        deleted: 0
    });

    const copies = await BookMaster.aggregate([{
            $match: {
                deleted: 0
            }
        },
        { $group: { _id: "null", copies: { $sum: "$assignedQuantity" } } }
    ]);

    if (copies.length > 0) {
        sumCopies = copies[0].copies;
    } else {
        sumCopies = sumCopies;
    }

    const issueBook = await BookIssue.find({
        status: 1,
        deleted: 0,
        bookReturnStatus: 0
    });

    if (issueBook.length > 0) {
        issueCount = issueBook.length;
    } else {
        issueCount = issueCount;
    }

    const returnBook = await BookIssue.find({
        status: 1,
        deleted: 0,
        bookReturnStatus: 1
    });

    if (returnBook.length > 0) {
        returnCount = returnBook.length;
    } else {
        returnCount = returnCount;
    }
    response.successResponse({
        totalBook: books,
        totalCopies: sumCopies,
        totalIssue: issueCount,
        totalreturn: returnCount,
    });
});

exports.lastIssuedBooksDetails = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const lastIssueBook = await BookIssue.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                status: 1,
                deleted: 0,
                bookReturnStatus: 0
            }
        }, {

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
                from: "bookjournalmagazinetypemasters",
                localField: "bookMasterDetails.bookType",
                foreignField: "typeId",
                as: "type"
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
        { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "issueDate": 1,
                "returnDate": 1,
                "employeeDetails.email": 1,
                "employeeDetails.name": 1,
                "employeeDetails.mobile": 1,
                "bookDetails.bookReferenceNumber": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails._id": 1,
                "bookMasterDetails.bookType": 1,
                "type.name": 1
            }
        }
    ]).limit(5);
    response.successResponse({
        lastIssueBook: lastIssueBook,
    });

});

exports.overDueBookDetails = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const overDueBook = await BookIssue.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                status: 1,
                deleted: 0,
                bookReturnStatus: 0,
                returnDate: {
                    $lt: new Date()
                }
            }
        }, {

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
                from: "users",
                localField: "employeeID",
                foreignField: "_id",
                as: "employeeDetails"
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
        {
            $project: {
                "issueDate": 1,
                "returnDate": 1,
                "employeeDetails.email": 1,
                "employeeDetails.name": 1,
                "employeeDetails.mobile": 1,
                "bookDetails.bookReferenceNumber": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.bookType": 1,
                "bookMasterDetails._id": 1,
                "type.name": 1
            }
        }
    ]).limit(5);
    response.successResponse({
        overDueBook: overDueBook,
    });

});

exports.popularBookDetails = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const filterObject = {};
    const filterObject1 = {};

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
            {
                $lookup: {
                    from: "bookjournalmagazinetypemasters",
                    localField: "bookMasterDetails.bookType",
                    foreignField: "typeId",
                    as: "type"
                },
            },
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$genreMasterDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
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
                    "bookMasterDetails.bookType": 1,
                    "bookMasterDetails._id": 1,
                    "type.name": 1
                }
            }
        ]).collation({ locale: "en" })
        .sort(filterObject1).
    limit(5);

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

        var popularBookList = {};
        popularBookList['data'] = iterator;
        popularBookList['requestCount'] = reqBook.length;
        popularBookList['issueCount'] = bookIssuelist.length;
        arr.push(popularBookList);
    }

    response.successResponse({
        popularBook: arr,
    });

});

exports.requestBookDetails = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const requestBook = await BookRequest.aggregate([{
            $match: {
                status: 1,
                deleted: 0,
                bookRequestStatus: 1
            }
        },
        {
            $lookup: {
                from: "bookmasters",
                localField: "bookID",
                foreignField: "_id",
                as: "bookMasterDetails"
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
        {
            $lookup: {
                from: "bookjournalmagazinetypemasters",
                localField: "bookMasterDetails.bookType",
                foreignField: "typeId",
                as: "type"
            },
        },
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "createdAt": 1,
                "notifyStatus": 1,
                "employeeDetails.email": 1,
                "employeeDetails.name": 1,
                "employeeDetails.mobile": 1,
                "bookMasterDetails.title": 1,
                "type.name": 1,
                "bookMasterDetails.bookType": 1,
                "bookMasterDetails._id": 1,
                "bookMasterDetails.assignedQuantity": 1,
                "bookMasterDetails.availableQuantity": 1
            }
        }
    ]).sort({ createdAt: 1 }).
    limit(5);

    response.successResponse({
        requestBook: requestBook,
    });

});