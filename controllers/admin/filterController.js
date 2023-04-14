const catchAsync = require("../../utils/catchAsync");
const BookMaster = require("../../models/admin/BookMaster");
const User = require("../../models/auth/user");
const QrCodeDetails = require("../../models/admin/qrCodeDetails");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const mongoose = require('./../../mongoose');
const BookIssue = require("../../models/admin/BookIssue");
const RackManagement = require("../../models/admin/RackManagement");
const GenreMaster = require("../../models/admin/genreMaster");
const AuthorMaster = require("../../models/admin/authorMaster");
const PublisherMaster = require("../../models/admin/publisherMaster");
const EBookMaster = require("../../models/admin/eBook");
const BookRequest = require("../../models/employee/BookRequest");
const BookDamage = require("../../models/admin/bookDamage");
const BookRequisition = require("../../models/employee/bookRequisition");
const Bookrating = require("../../models/employee/bookRating");
const BookDetailsMaster = require("../../models/admin/BookDetailsMaster");
const BlogParent = require("../../models/employee/blogParent");
const BlogComment = require("../../models/employee/blogComment");
const BlogLike = require("../../models/employee/blogLike");
const BookSuggested = require("../../models/admin/bookSuggested");
const BookSuggestedHistory = require("../../models/admin/bookSuggestedHistory");

exports.filterBook = catchAsync(async(req, res, next) => {

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

    if (req.body.authorID) {
        filterObject["authorID"] = req.body.authorID
    }

    if (req.body.publisherID) {
        filterObject["publisherID"] = req.body.publisherID
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = req.body.categoryID
    }

    filterObject["bookType"] = 1;
    filterObject["deleted"] = 0;

    const response = new AppSuccess(res);

    let sumCopies = 0;
    let sumACopies = 0;
    let sumDCopies = 0;
    let sumLCopies = 0;

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


    const copiesAvailable = await BookMaster.aggregate([{
            $match: {
                deleted: 0,
                bookType: 1
            }
        },
        { $group: { _id: "null", copies: { $sum: "$availableQuantity" } } }
    ]);

    if (copies.length > 0) {
        sumACopies = copiesAvailable[0].copies;
    } else {
        sumACopies = sumACopies;
    }

    const copiesDAvailable = await BookMaster.aggregate([{
            $match: {
                deleted: 0,
                bookType: 1
            }
        },
        { $group: { _id: "null", copies: { $sum: "$damageQuantity" } } }
    ]);

    if (copies.length > 0) {
        sumDCopies = copiesDAvailable[0].copies;
    } else {
        sumDCopies = sumDCopies;
    }

    const copiesLAvailable = await BookMaster.aggregate([{
            $match: {
                deleted: 0,
                bookType: 1
            }
        },
        { $group: { _id: "null", copies: { $sum: "$lostQuantity" } } }
    ]);

    if (copies.length > 0) {
        sumLCopies = copiesLAvailable[0].copies;
    } else {
        sumLCopies = sumLCopies;
    }

    const bookFilter = await BookMaster.find(filterObject, {
            "title": 1,
            "edition": 1,
            "status": 1,
            "pages": 1,
            "publishedYear": 1,
            "description": 1,
            "front_image": 1,
            "back_image": 1,
            "quantity": 1,
            "language": 1,
            "availableQuantity": 1,
            "assignedQuantity": 1,
            "damageQuantity": 1,
            "lostQuantity": 1
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name', 'profile_image', 'description']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).populate({
            path: 'genreID',
            select: ['title']
        }).sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find(filterObject, {
        "title": 1,
        "edition": 1,
        "status": 1,
        "pages": 1,
        "publishedYear": 1,
        "description": 1,
        "front_image": 1,
        "back_image": 1,
        "quantity": 1,
        "language": 1,
        "availableQuantity": 1,
        "assignedQuantity": 1,
        "damageQuantity": 1
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
            bookFilter: bookFilter,
            bookCount: bookCount.length,
            totalBook: books,
            totalCopies: sumCopies,
            totalIssue: sumACopies,
            totalreturn: sumCopies - sumACopies - sumLCopies
        });
    } else {
        response.successResponse({
            totalData: bookFilter.length,
            bookCount: bookCount.length,
            bookFilter: [],
            totalBook: books,
            totalCopies: sumCopies,
            totalIssue: sumACopies,
            totalreturn: sumCopies - sumACopies - sumLCopies
        });
    }

});

exports.filterEmployee = catchAsync(async(req, res, next) => {

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

    const filterObject = {};

    const orArray = [];
    let empDetails;
    let bookCount;

    filterObject["deleted"] = 0;
    filterObject["user_role"] = { $in: [3] };

    const response = new AppSuccess(res);

    if (req.body.empName) {
        orArray.push({ name: { $regex: req.body.empName, "$options": "i" } }, { mobile: { $regex: req.body.empName, "$options": "i" } }, { email: { $regex: req.body.empName, "$options": "i" } }, { employee_id: { $regex: req.body.empName, "$options": "i" } })

        empDetails = await User.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $lookup: {
                        from: "userrolemasters",
                        localField: "user_role",
                        foreignField: "userRoleId",
                        as: "userRole"
                    },
                },
                {
                    $lookup: {
                        from: "departmentmasters",
                        localField: "department",
                        foreignField: "_id",
                        as: "departmentDetails"
                    },
                },
                {
                    $lookup: {
                        from: "designationmasters",
                        localField: "designation",
                        foreignField: "_id",
                        as: "designationDetails"
                    },
                },
                { $unwind: { path: "$userRole", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$departmentDetails", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$designationDetails", preserveNullAndEmptyArrays: true } },
                {
                    $match: filterObject
                },
                {
                    $match: {
                        $or: orArray,
                    },
                },
                {
                    $project: {
                        "name": 1,
                        "email": 1,
                        "mobile": 1,
                        "employee_id": 1,
                        "user_role": 1,
                        "status": 1,
                        "userRole.name": 1,
                        "departmentDetails.departmentName": 1,
                        "designationDetails.designationName": 1,
                    }
                }
            ]).skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await User.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $lookup: {
                    from: "userrolemasters",
                    localField: "user_role",
                    foreignField: "userRoleId",
                    as: "userRole"
                },
            },
            {
                $lookup: {
                    from: "departmentmasters",
                    localField: "department",
                    foreignField: "_id",
                    as: "departmentDetails"
                },
            },
            {
                $lookup: {
                    from: "designationmasters",
                    localField: "designation",
                    foreignField: "_id",
                    as: "designationDetails"
                },
            },
            { $unwind: { path: "$userRole", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$departmentDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$designationDetails", preserveNullAndEmptyArrays: true } },
            {
                $match: filterObject
            },
            {
                $match: {
                    $or: orArray,
                },
            },
            {
                $project: {
                    "name": 1,
                    "email": 1,
                    "mobile": 1,
                    "user_role": 1,
                    "status": 1,
                    "userRole.name": 1,
                    "departmentDetails.departmentName": 1,
                    "designationDetails.designationName": 1,
                }
            }
        ]);
    } else {

        empDetails = await User.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $lookup: {
                        from: "userrolemasters",
                        localField: "user_role",
                        foreignField: "userRoleId",
                        as: "userRole"
                    },
                },
                {
                    $lookup: {
                        from: "departmentmasters",
                        localField: "department",
                        foreignField: "_id",
                        as: "departmentDetails"
                    },
                },
                {
                    $lookup: {
                        from: "designationmasters",
                        localField: "designation",
                        foreignField: "_id",
                        as: "designationDetails"
                    },
                },
                { $unwind: { path: "$userRole", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$departmentDetails", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$designationDetails", preserveNullAndEmptyArrays: true } },
                {
                    $match: filterObject
                },
                {
                    $project: {
                        "name": 1,
                        "email": 1,
                        "mobile": 1,
                        "employee_id": 1,
                        "user_role": 1,
                        "status": 1,
                        "userRole.name": 1,
                        "departmentDetails.departmentName": 1,
                        "designationDetails.designationName": 1,
                    }
                }
            ]).skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await User.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $lookup: {
                    from: "userrolemasters",
                    localField: "user_role",
                    foreignField: "userRoleId",
                    as: "userRole"
                },
            },
            {
                $lookup: {
                    from: "departmentmasters",
                    localField: "department",
                    foreignField: "_id",
                    as: "departmentDetails"
                },
            },
            {
                $lookup: {
                    from: "designationmasters",
                    localField: "designation",
                    foreignField: "_id",
                    as: "designationDetails"
                },
            },
            { $unwind: { path: "$userRole", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$departmentDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$designationDetails", preserveNullAndEmptyArrays: true } },
            {
                $match: filterObject
            },
            {
                $project: {
                    "name": 1,
                    "email": 1,
                    "mobile": 1,
                    "user_role": 1,
                    "status": 1,
                    "userRole.name": 1,
                    "departmentDetails.departmentName": 1,
                    "designationDetails.designationName": 1,
                }
            }
        ]);
    }

    response.successResponse({
        message: `Total employee count= ${ empDetails.length }`,
        empList: empDetails,
        empCount: bookCount.length
    });

});

exports.filterUser = catchAsync(async(req, res, next) => {

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

    const orArray = [];
    let empDetails;
    let bookCount;

    if (req.body.empName) {
        orArray.push({ name: { $regex: req.body.empName, "$options": "i" } }, { mobile: { $regex: req.body.empName, "$options": "i" } }, { email: { $regex: req.body.empName, "$options": "i" } }, )

        empDetails = await User.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $match: {
                        deleted: 0,
                        user_role: { $in: [2, 4] }
                    },
                },
                {
                    $lookup: {
                        from: "userrolemasters",
                        localField: "user_role",
                        foreignField: "userRoleId",
                        as: "userRole"
                    },
                },
                { $unwind: { path: "$userRole", preserveNullAndEmptyArrays: true } },
                {
                    $match: {
                        $or: orArray,
                    },
                },
                {
                    $project: {
                        "name": 1,
                        "email": 1,
                        "mobile": 1,
                        "user_role": 1,
                        "status": 1,
                        "userRole.name": 1,
                    }
                }
            ]).skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await User.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $match: {
                    deleted: 0,
                    user_role: { $in: [2, 4] }
                },
            },
            {
                $lookup: {
                    from: "userrolemasters",
                    localField: "user_role",
                    foreignField: "userRoleId",
                    as: "userRole"
                },
            },
            { $unwind: { path: "$userRole", preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    $or: orArray,
                },
            },
            {
                $project: {
                    "name": 1,
                    "email": 1,
                    "mobile": 1,
                    "user_role": 1,
                    "status": 1,
                    "userRole.name": 1,
                }
            }
        ]);
    } else {
        empDetails = await User.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $match: {
                        deleted: 0,
                        user_role: { $in: [2, 4] }
                    },
                },
                {
                    $lookup: {
                        from: "userrolemasters",
                        localField: "user_role",
                        foreignField: "userRoleId",
                        as: "userRole"
                    },
                },
                { $unwind: { path: "$userRole", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        "name": 1,
                        "email": 1,
                        "mobile": 1,
                        "user_role": 1,
                        "status": 1,
                        "userRole.name": 1,
                    }
                }
            ]).skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await User.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $match: {
                    deleted: 0,
                    user_role: { $in: [2, 4] }
                },
            },
            {
                $lookup: {
                    from: "userrolemasters",
                    localField: "user_role",
                    foreignField: "userRoleId",
                    as: "userRole"
                },
            },
            { $unwind: { path: "$userRole", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    "name": 1,
                    "email": 1,
                    "mobile": 1,
                    "user_role": 1,
                    "status": 1,
                    "userRole.name": 1,
                }
            }
        ]);
    }

    const response = new AppSuccess(res);

    response.successResponse({
        message: `Total employee count= ${ empDetails.length }`,
        empList: empDetails,
        empCount: bookCount.length
    });

});

exports.filterQrCodeManagement = catchAsync(async(req, res, next) => {

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

    const filterObject = {};

    if (req.body.bookName) {
        filterObject['bookMasterDetails.title'] = { $regex: req.body.bookName, "$options": "i" }
    }

    if (req.body.bookReferenceNumber) {
        filterObject['bookReferenceNumber'] = { $regex: req.body.bookReferenceNumber, "$options": "i" }
    }

    if (req.body.status) {
        filterObject['isAssigned'] = +req.body.status
    }


    const response = new AppSuccess(res);

    const qrCodeDetailsFilter = await QrCodeDetails.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $match: {
                    status: 1,
                    deleted: 0
                },
            },
            {
                $lookup: {
                    from: "bookdetailsmasters",
                    localField: "bookDetailMasterId",
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
                $match: filterObject
            },
            {
                $project: {
                    "qrCodePath": 1,
                    "isAssigned": 1,
                    "bookReferenceNumber": 1,
                    "bookDetailMasterId": 1,
                    "bookDetails.bookReferenceNumber": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.bookType": 1,
                    "bookDetails.bookStatus": 1
                }
            }
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await QrCodeDetails.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                status: 1,
                deleted: 0
            },
        },
        {
            $lookup: {
                from: "bookdetailsmasters",
                localField: "bookDetailMasterId",
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
            $match: filterObject
        },
        {
            $project: {
                "qrCodePath": 1,
                "isAssigned": 1,
                "bookReferenceNumber": 1,
                "bookDetailMasterId": 1,
                "bookDetails.bookReferenceNumber": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.bookType": 1,
                "bookDetails.bookStatus": 1
            }
        }
    ]);

    if (qrCodeDetailsFilter.length > 0) {
        response.successResponse({
            totalData: qrCodeDetailsFilter.length,
            qrCodeDetailsFilter: qrCodeDetailsFilter,
            bookCount: bookCount.length
        });
    } else {
        response.successResponse({
            totalData: qrCodeDetailsFilter.length,
            qrCodeDetailsFilter: [],
            bookCount: bookCount.length
        });
    }

});

exports.filterMyRecords = catchAsync(async(req, res, next) => {

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

    if (req.body.type) {
        filterObject["bookReturnStatus"] = +req.body.type; // 0 - issued, 1- returned
    }

    if (req.body.title) {
        filterObject['bookMasterDetails.title'] = { $regex: req.body.title, "$options": "i" }
    }

    let startDate = new Date(req.body.toDate);

    // seconds * minutes * hours * milliseconds = 1 day 
    let day = 60 * 60 * 24 * 1000;

    let endDate = new Date(startDate.getTime() + day);

    if (req.body.fromDate && req.body.toDate) {
        filterObject['issueDate'] = { $gte: new Date(req.body.fromDate), $lte: endDate }
    }

    if (req.body.fromDate && !req.body.toDate) {
        filterObject['issueDate'] = { $gte: new Date(req.body.fromDate), $lte: new Date(new Date()) }
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
                $match: filterObject
            },
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
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const recordsCount = await BookIssue.aggregate([
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
            $match: filterObject
        },
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
        records: records,
        recordCount: recordsCount.length
    });

});

exports.filterRackManagementListing = catchAsync(async(req, res, next) => {

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
    const filterObject1 = {};

    if (req.body.title) {
        filterObject['bookMasterDetails.title'] = { $regex: req.body.title, "$options": "i" }
    }

    if (req.body.title) {
        filterObject1['bookDetails.bookReferenceNumber'] = { $regex: req.body.title, "$options": "i" }
    }

    const match_filter = { $or: [filterObject, filterObject1] };

    const rackManagementDetails = await RackManagement.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $match: {
                    status: 1,
                    deleted: 0
                },
            },
            {
                $lookup: {
                    from: "bookdetailsmasters",
                    localField: "_id",
                    foreignField: "rackManagementID",
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
                    from: "rackmasters",
                    localField: "rackID",
                    foreignField: "_id",
                    as: "rackDetails"
                },
            },
            {
                $lookup: {
                    from: "shelfmasters",
                    localField: "shelfID",
                    foreignField: "_id",
                    as: "shelfDetails"
                },
            },
            {
                $lookup: {
                    from: "qrcodedetails",
                    localField: "bookDetails._id",
                    foreignField: "bookDetailMasterId",
                    as: "qrCodeDetailsData"
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
                $match: match_filter
            },
            {
                $project: {
                    "bookDetails.bookReferenceNumber": 1,
                    "bookDetails._id": 1,
                    "bookMasterDetails._id": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.bookType": 1,
                    "rackDetails.rackName": 1,
                    "shelfDetails.shelfName": 1,
                    "qrCodeDetailsData.qrCodePath": 1,
                    "type.name": 1
                }
            }
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const rackManagementCount = await RackManagement.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                status: 1,
                deleted: 0
            },
        },
        {
            $lookup: {
                from: "bookdetailsmasters",
                localField: "_id",
                foreignField: "rackManagementID",
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
                from: "rackmasters",
                localField: "rackID",
                foreignField: "_id",
                as: "rackDetails"
            },
        },
        {
            $lookup: {
                from: "shelfmasters",
                localField: "shelfID",
                foreignField: "_id",
                as: "shelfDetails"
            },
        },
        {
            $lookup: {
                from: "qrcodedetails",
                localField: "bookDetails._id",
                foreignField: "bookDetailMasterId",
                as: "qrCodeDetailsData"
            },
        },
        {
            $match: match_filter
        },
        {
            $project: {
                "bookDetails.bookReferenceNumber": 1,
                "bookDetails._id": 1,
                "bookMasterDetails._id": 1,
                "bookMasterDetails.title": 1,
                "rackDetails.rackName": 1,
                "shelfDetails.shelfName": 1,
                "qrCodeDetailsData.qrCodePath": 1
            }
        }
    ]);


    if (rackManagementDetails.length > 0) {
        response.successResponse({
            rackManagementDetails: rackManagementDetails,
            rackManagementCount: rackManagementCount.length
        });
    } else {
        return next(new AppError("Rack Management details not found.", 500));
    }

});

exports.filterGenre = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const filterObject = {};

    if (req.body.title) {
        filterObject['title'] = { $regex: req.body.title, "$options": "i" }
    }

    filterObject["deleted"] = 0;

    filterObject["status"] = 1;

    const genreDetails = await GenreMaster.find(filterObject, {
        'title': 1
    });

    response.successResponse({
        message: `Total genre count= ${ genreDetails.length }`,
        genreList: genreDetails
    });

});

exports.filterAuthor = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const orArray = [];
    if (req.body.title) {
        orArray.push({ first_name: { $regex: req.body.title, "$options": "i" } }, { middle_name: { $regex: req.body.title, "$options": "i" } }, { last_name: { $regex: req.body.title, "$options": "i" } }, )

    }

    const authorDetails = await AuthorMaster.find({
        $or: orArray,
        deleted: 0,
        status: 1
    }, {
        'first_name': 1,
        'middle_name': 1,
        'last_name': 1,
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total authors count= ${ authorDetails.length }`,
        authorList: authorDetails
    });

});

exports.filterPublisher = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const filterObject = {};

    if (req.body.title) {
        filterObject['title'] = { $regex: req.body.title, "$options": "i" }
    }

    filterObject["deleted"] = 0;

    filterObject["status"] = 1;

    const publisherDetails = await PublisherMaster.find(filterObject, {
        'title': 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total publisher count= ${ publisherDetails.length }`,
        publisherList: publisherDetails
    });

});

exports.filterJournal = catchAsync(async(req, res, next) => {

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

    if (req.body.publisherID) {
        filterObject["publisherID"] = req.body.publisherID
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = req.body.categoryID
    }

    filterObject["deleted"] = 0;
    filterObject["bookType"] = 3;

    const response = new AppSuccess(res);

    let sumCopies = 0;
    let sumACopies = 0;
    let sumDCopies = 0;
    let sumLCopies = 0;

    const books = await BookMaster.countDocuments({
        deleted: 0,
        bookType: 3
    });

    const copies = await BookMaster.aggregate([{
            $match: {
                deleted: 0,
                bookType: 3
            }
        },
        { $group: { _id: "null", copies: { $sum: "$assignedQuantity" } } }
    ]);

    if (copies.length > 0) {
        sumCopies = copies[0].copies;
    } else {
        sumCopies = sumCopies;
    }


    const copiesAvailable = await BookMaster.aggregate([{
            $match: {
                deleted: 0,
                bookType: 3
            }
        },
        { $group: { _id: "null", copies: { $sum: "$availableQuantity" } } }
    ]);

    if (copies.length > 0) {
        sumACopies = copiesAvailable[0].copies;
    } else {
        sumACopies = sumACopies;
    }

    const copiesDAvailable = await BookMaster.aggregate([{
            $match: {
                deleted: 0,
                bookType: 3
            }
        },
        { $group: { _id: "null", copies: { $sum: "$damageQuantity" } } }
    ]);

    if (copies.length > 0) {
        sumDCopies = copiesDAvailable[0].copies;
    } else {
        sumDCopies = sumDCopies;
    }

    const copiesLAvailable = await BookMaster.aggregate([{
            $match: {
                deleted: 0,
                bookType: 3
            }
        },
        { $group: { _id: "null", copies: { $sum: "$lostQuantity" } } }
    ]);

    if (copies.length > 0) {
        sumLCopies = copiesLAvailable[0].copies;
    } else {
        sumLCopies = sumLCopies;
    }

    const bookFilter = await BookMaster.find(filterObject, {
            "title": 1,
            "edition": 1,
            "status": 1,
            "pages": 1,
            "publishedYear": 1,
            "description": 1,
            "front_image": 1,
            "back_image": 1,
            "quantity": 1,
            "language": 1,
            "availableQuantity": 1,
            "assignedQuantity": 1,
            "damageQuantity": 1,
            "lostQuantity": 1,
            "volume": 1,
            "issue": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name', 'profile_image', 'description']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).populate({
            path: 'genreID',
            select: ['title']
        }).sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find(filterObject, {
        "title": 1,
        "edition": 1,
        "status": 1,
        "pages": 1,
        "publishedYear": 1,
        "description": 1,
        "front_image": 1,
        "back_image": 1,
        "quantity": 1,
        "language": 1,
        "availableQuantity": 1,
        "assignedQuantity": 1,
        "damageQuantity": 1,
        "volume": 1,
        "issue": 1,
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
            bookFilter: bookFilter,
            bookCount: bookCount.length,
            totalBook: books,
            totalCopies: sumCopies,
            totalIssue: sumACopies,
            totalreturn: sumCopies - sumACopies - sumLCopies
        });
    } else {
        response.successResponse({
            totalData: bookFilter.length,
            bookFilter: [],
            bookCount: bookCount.length,
            totalBook: books,
            totalCopies: sumCopies,
            totalIssue: sumACopies,
            totalreturn: sumCopies - sumACopies - sumLCopies
        });
    }

});

exports.filterMagazine = catchAsync(async(req, res, next) => {

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

    if (req.body.publisherID) {
        filterObject["publisherID"] = req.body.publisherID
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = req.body.categoryID
    }

    filterObject["bookType"] = 2;
    filterObject["deleted"] = 0;

    const response = new AppSuccess(res);

    let sumCopies = 0;
    let sumACopies = 0;
    let sumDCopies = 0;
    let sumLCopies = 0;

    const books = await BookMaster.countDocuments({
        deleted: 0,
        bookType: 2
    });

    const copies = await BookMaster.aggregate([{
            $match: {
                deleted: 0,
                bookType: 2
            }
        },
        { $group: { _id: "null", copies: { $sum: "$assignedQuantity" } } }
    ]);

    if (copies.length > 0) {
        sumCopies = copies[0].copies;
    } else {
        sumCopies = sumCopies;
    }


    const copiesAvailable = await BookMaster.aggregate([{
            $match: {
                deleted: 0,
                bookType: 2
            }
        },
        { $group: { _id: "null", copies: { $sum: "$availableQuantity" } } }
    ]);

    if (copies.length > 0) {
        sumACopies = copiesAvailable[0].copies;
    } else {
        sumACopies = sumACopies;
    }

    const copiesDAvailable = await BookMaster.aggregate([{
            $match: {
                deleted: 0,
                bookType: 2
            }
        },
        { $group: { _id: "null", copies: { $sum: "$damageQuantity" } } }
    ]);

    if (copies.length > 0) {
        sumDCopies = copiesDAvailable[0].copies;
    } else {
        sumDCopies = sumDCopies;
    }

    const copiesLAvailable = await BookMaster.aggregate([{
            $match: {
                deleted: 0,
                bookType: 2
            }
        },
        { $group: { _id: "null", copies: { $sum: "$lostQuantity" } } }
    ]);

    if (copies.length > 0) {
        sumLCopies = copiesLAvailable[0].copies;
    } else {
        sumLCopies = sumLCopies;
    }

    const bookFilter = await BookMaster.find(filterObject, {
            "title": 1,
            "edition": 1,
            "status": 1,
            "pages": 1,
            "publishedYear": 1,
            "description": 1,
            "front_image": 1,
            "back_image": 1,
            "quantity": 1,
            "language": 1,
            "availableQuantity": 1,
            "assignedQuantity": 1,
            "damageQuantity": 1,
            "lostQuantity": 1
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name', 'profile_image', 'description']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).populate({
            path: 'genreID',
            select: ['title']
        }).sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookMaster.find(filterObject, {
        "title": 1,
        "edition": 1,
        "status": 1,
        "pages": 1,
        "publishedYear": 1,
        "description": 1,
        "front_image": 1,
        "back_image": 1,
        "quantity": 1,
        "language": 1,
        "availableQuantity": 1,
        "assignedQuantity": 1,
        "damageQuantity": 1
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
            bookFilter: bookFilter,
            bookCount: bookCount.length,
            totalBook: books,
            totalCopies: sumCopies,
            totalIssue: sumACopies,
            totalreturn: sumCopies - sumACopies - sumLCopies
        });
    } else {
        response.successResponse({
            totalData: bookFilter.length,
            bookCount: bookCount.length,
            bookFilter: [],
            totalBook: books,
            totalCopies: sumCopies,
            totalIssue: sumACopies,
            totalreturn: sumCopies - sumACopies - sumLCopies
        });
    }

});

exports.filterEBook = catchAsync(async(req, res, next) => {

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

    if (req.body.authorID) {
        filterObject["authorID"] = req.body.authorID
    }

    if (req.body.publisherID) {
        filterObject["publisherID"] = req.body.publisherID
    }

    if (req.body.categoryID) {
        filterObject["genreID"] = req.body.categoryID
    }

    filterObject["bookType"] = 1;
    filterObject["deleted"] = 0;

    const response = new AppSuccess(res);

    const bookFilter = await EBookMaster.find(filterObject, {
            "title": 1,
            "edition": 1,
            "status": 1,
            "pages": 1,
            "publishedYear": 1,
            "description": 1,
            "front_image": 1,
            "back_image": 1,
            "language": 1,
            "downloadURL": 1,
            "createdAt": 1,
        }).populate({
            path: 'authorID',
            select: ['first_name', 'middle_name', 'last_name', 'profile_image', 'description']
        }).populate({
            path: 'publisherID',
            select: ['title']
        }).populate({
            path: 'genreID',
            select: ['title']
        }).sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await EBookMaster.find(filterObject, {
        "title": 1,
        "edition": 1,
        "status": 1,
        "pages": 1,
        "publishedYear": 1,
        "description": 1,
        "front_image": 1,
        "back_image": 1,
        "language": 1,
        "downloadURL": 1,
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
            bookCount: bookCount.length,
            bookFilter: bookFilter
        });
    } else {
        response.successResponse({
            totalData: bookFilter.length,
            bookCount: bookCount.length,
            bookFilter: []
        });
    }

});

exports.requestFilter = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let pageSize;
    let currentPage;
    let bookCount;
    let books;

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

    const orArray = [];

    if (req.body.bookType) {
        filterObject["bookID.bookType"] = +req.body.bookType
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

    if (req.body.employeeID) {
        orArray.push({ 'employeeID.name': { $regex: req.body.employeeID, "$options": "i" } }, { 'bookID.title': { $regex: req.body.employeeID, "$options": "i" } })

        books = await BookRequest.aggregate([{
                    $match: {
                        status: 1,
                        deleted: 0,
                        bookRequestStatus: { $in: [1, 3] }
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
                        from: "users",
                        localField: "employeeID",
                        foreignField: "_id",
                        as: "employeeID"
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
                { $unwind: { path: "$employeeID", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$bookID", preserveNullAndEmptyArrays: true } },
                {
                    $match: filterObject
                },
                {
                    $match: {
                        $or: orArray,
                    },
                },
                {
                    $project: {
                        "createdAt": 1,
                        "bookRequestStatus": 1,
                        "remark": 1,
                        "notifyStatus": 1,
                        "employeeID.email": 1,
                        "employeeID.name": 1,
                        "employeeID.mobile": 1,
                        "bookID.title": 1,
                        "bookID.availableQuantity": 1,
                        "bookID.bookType": 1,
                        "bookID._id": 1,
                        "type.name": 1
                    }
                }
            ]).skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await BookRequest.aggregate([{
                $match: {
                    status: 1,
                    deleted: 0,
                    bookRequestStatus: { $in: [1, 3] }
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
                    from: "users",
                    localField: "employeeID",
                    foreignField: "_id",
                    as: "employeeID"
                },
            },
            { $unwind: { path: "$employeeID", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$bookID", preserveNullAndEmptyArrays: true } },
            {
                $match: filterObject
            },
            {
                $match: {
                    $or: orArray,
                },
            },
            {
                $project: {
                    "createdAt": 1,
                    "employeeID.email": 1,
                    "employeeID.name": 1,
                    "employeeID.mobile": 1,
                    "bookID.title": 1,
                    "bookID.availableQuantity": 1,
                    "bookID.bookType": 1
                }
            }
        ]);
    } else {

        books = await BookRequest.aggregate([{
                    $match: {
                        status: 1,
                        deleted: 0,
                        bookRequestStatus: { $in: [1, 3] }
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
                        from: "users",
                        localField: "employeeID",
                        foreignField: "_id",
                        as: "employeeID"
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
                { $unwind: { path: "$employeeID", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$bookID", preserveNullAndEmptyArrays: true } },
                {
                    $match: filterObject
                },
                {
                    $project: {
                        "createdAt": 1,
                        "bookRequestStatus": 1,
                        "remark": 1,
                        "notifyStatus": 1,
                        "employeeID.email": 1,
                        "employeeID.name": 1,
                        "employeeID.mobile": 1,
                        "bookID.title": 1,
                        "bookID.availableQuantity": 1,
                        "bookID.bookType": 1,
                        "bookID._id": 1,
                        "type.name": 1
                    }
                }
            ]).skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await BookRequest.aggregate([{
                $match: {
                    status: 1,
                    deleted: 0,
                    bookRequestStatus: { $in: [1, 3] }
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
                    from: "users",
                    localField: "employeeID",
                    foreignField: "_id",
                    as: "employeeID"
                },
            },
            { $unwind: { path: "$employeeID", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$bookID", preserveNullAndEmptyArrays: true } },
            {
                $match: filterObject
            },
            {
                $project: {
                    "createdAt": 1,
                    "employeeID.email": 1,
                    "employeeID.name": 1,
                    "employeeID.mobile": 1,
                    "bookID.title": 1,
                    "bookID.availableQuantity": 1,
                    "bookID.bookType": 1
                }
            }
        ]);

    }

    response.successResponse({
        message: `Total request count= ${ books.length }`,
        requestList: books,
        bookCount: bookCount.length
    });

});

exports.issueFilter = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    let arr = [];
    const orArray = [];

    let pageSize;
    let currentPage;
    let bookCount;
    let issueDetails;

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

    if (req.body.bookType) {
        filterObject["bookMasterDetails.bookType"] = +req.body.bookType
    }

    let startDate = new Date(req.body.toDate);

    // seconds * minutes * hours * milliseconds = 1 day 
    let day = 60 * 60 * 24 * 1000;

    let endDate = new Date(startDate.getTime() + day);

    if (req.body.fromDate && req.body.toDate) {
        filterObject['issueDate'] = { $gte: new Date(req.body.fromDate), $lte: endDate }
    }

    if (req.body.fromDate && !req.body.toDate) {
        filterObject['issueDate'] = { $gte: new Date(req.body.fromDate), $lte: new Date(new Date()) }
    }

    if (req.body.employeeID) {
        orArray.push({ 'employeeDetails.name': { $regex: req.body.employeeID, "$options": "i" } }, { 'bookMasterDetails.title': { $regex: req.body.employeeID, "$options": "i" } })

        issueDetails = await BookIssue.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $match: {
                        bookReturnStatus: 0,
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
                        from: "users",
                        localField: "employeeID",
                        foreignField: "_id",
                        as: "employeeDetails"
                    },
                },
                {
                    $lookup: {
                        from: "departmentmasters",
                        localField: "employeeDetails.department",
                        foreignField: "_id",
                        as: "departmentDetails"
                    },
                },
                {
                    $lookup: {
                        from: "designationmasters",
                        localField: "employeeDetails.designation",
                        foreignField: "_id",
                        as: "designationDetails"
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
                { $unwind: { path: "$employeeDetails", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$bookDetails", preserveNullAndEmptyArrays: true } },
                {
                    $match: filterObject
                },
                {
                    $match: {
                        $or: orArray,
                    },
                },
                {
                    $project: {
                        "issueDate": 1,
                        "returnDate": 1,
                        "bookDetails.bookReferenceNumber": 1,
                        "bookMasterDetails.title": 1,
                        "bookMasterDetails._id": 1,
                        "bookMasterDetails.bookType": 1,
                        "employeeDetails.email": 1,
                        "employeeDetails.name": 1,
                        "employeeDetails.mobile": 1,
                        "departmentDetails.departmentName": 1,
                        "designationDetails.designationName": 1,
                        "type.name": 1
                    }
                }
            ]).skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await BookIssue.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $match: {
                    bookReturnStatus: 0,
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
                    from: "users",
                    localField: "employeeID",
                    foreignField: "_id",
                    as: "employeeDetails"
                },
            },
            {
                $lookup: {
                    from: "departmentmasters",
                    localField: "employeeDetails.department",
                    foreignField: "_id",
                    as: "departmentDetails"
                },
            },
            {
                $lookup: {
                    from: "designationmasters",
                    localField: "employeeDetails.designation",
                    foreignField: "_id",
                    as: "designationDetails"
                },
            },
            {
                $match: filterObject
            },
            {
                $match: {
                    $or: orArray,
                },
            },
            {
                $project: {
                    "issueDate": 1,
                    "returnDate": 1,
                    "bookDetails.bookReferenceNumber": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.bookType": 1,
                    "employeeDetails.email": 1,
                    "employeeDetails.name": 1,
                    "employeeDetails.mobile": 1,
                    "departmentDetails.departmentName": 1,
                    "designationDetails.designationName": 1
                }
            }
        ]);

    } else {

        issueDetails = await BookIssue.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $match: {
                        bookReturnStatus: 0,
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
                        from: "users",
                        localField: "employeeID",
                        foreignField: "_id",
                        as: "employeeDetails"
                    },
                },
                {
                    $lookup: {
                        from: "departmentmasters",
                        localField: "employeeDetails.department",
                        foreignField: "_id",
                        as: "departmentDetails"
                    },
                },
                {
                    $lookup: {
                        from: "designationmasters",
                        localField: "employeeDetails.designation",
                        foreignField: "_id",
                        as: "designationDetails"
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
                { $unwind: { path: "$employeeDetails", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$bookDetails", preserveNullAndEmptyArrays: true } },
                {
                    $match: filterObject
                },
                {
                    $project: {
                        "issueDate": 1,
                        "returnDate": 1,
                        "bookDetails.bookReferenceNumber": 1,
                        "bookMasterDetails.title": 1,
                        "bookMasterDetails._id": 1,
                        "bookMasterDetails.bookType": 1,
                        "employeeDetails.email": 1,
                        "employeeDetails.name": 1,
                        "employeeDetails.mobile": 1,
                        "departmentDetails.departmentName": 1,
                        "designationDetails.designationName": 1,
                        "type.name": 1
                    }
                }
            ]).skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await BookIssue.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $match: {
                    bookReturnStatus: 0,
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
                    from: "users",
                    localField: "employeeID",
                    foreignField: "_id",
                    as: "employeeDetails"
                },
            },
            {
                $lookup: {
                    from: "departmentmasters",
                    localField: "employeeDetails.department",
                    foreignField: "_id",
                    as: "departmentDetails"
                },
            },
            {
                $lookup: {
                    from: "designationmasters",
                    localField: "employeeDetails.designation",
                    foreignField: "_id",
                    as: "designationDetails"
                },
            },
            {
                $match: filterObject
            },
            {
                $project: {
                    "issueDate": 1,
                    "returnDate": 1,
                    "bookDetails.bookReferenceNumber": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.bookType": 1,
                    "employeeDetails.email": 1,
                    "employeeDetails.name": 1,
                    "employeeDetails.mobile": 1,
                    "departmentDetails.departmentName": 1,
                    "designationDetails.designationName": 1
                }
            }
        ]);

    }

    for (const iterator of issueDetails) {

        const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        const firstDate = new Date(iterator.returnDate);
        const secondDate = new Date();
        let diffDays;

        if (firstDate < secondDate) {
            diffDays = Math.round(Math.abs((firstDate - secondDate) / oneDay));
        } else {
            diffDays = '0';
        }

        arr.push({
            id: iterator._id,
            name: iterator.employeeDetails.name,
            email: iterator.employeeDetails.email,
            mobile: iterator.employeeDetails.mobile,
            title: iterator.bookMasterDetails.title,
            booktype: iterator.type.name,
            bookId: iterator.bookMasterDetails._id,
            bookType: iterator.bookMasterDetails.bookType,
            bookReferenceNumber: iterator.bookDetails.bookReferenceNumber,
            issueDate: iterator.issueDate,
            returnDate: iterator.returnDate,
            overdueDate: diffDays
        });
    }

    if (issueDetails.length > 0) {
        response.successResponse({
            todayDate: new Date(),
            totalIssue: issueDetails.length,
            issueDetails: arr,
            bookCount: bookCount.length
        });
    } else {
        return next(new AppError("Issue details not found.", 500));
    }

});

exports.returnFilter = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    let pageSize;
    let currentPage;
    let bookCount;
    let returnDetails;
    const orArray = [];

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

    if (req.body.bookType) {
        filterObject["bookMasterDetails.bookType"] = +req.body.bookType
    }

    let startDate = new Date(req.body.toDate);

    // seconds * minutes * hours * milliseconds = 1 day 
    let day = 60 * 60 * 24 * 1000;

    let endDate = new Date(startDate.getTime() + day);

    if (req.body.fromDate && req.body.toDate) {
        filterObject['updatedAt'] = { $gte: new Date(req.body.fromDate), $lte: endDate }
    }

    if (req.body.fromDate && !req.body.toDate) {
        filterObject['updatedAt'] = { $gte: new Date(req.body.fromDate), $lte: new Date(new Date()) }
    }

    if (req.body.employeeID) {
        orArray.push({ 'employeeDetails.name': { $regex: req.body.employeeID, "$options": "i" } }, { 'bookMasterDetails.title': { $regex: req.body.employeeID, "$options": "i" } })

        returnDetails = await BookIssue.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $match: {
                        bookReturnStatus: 1,
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
                        from: "users",
                        localField: "employeeID",
                        foreignField: "_id",
                        as: "employeeDetails"
                    },
                },
                {
                    $lookup: {
                        from: "departmentmasters",
                        localField: "employeeDetails.department",
                        foreignField: "_id",
                        as: "departmentDetails"
                    },
                },
                {
                    $lookup: {
                        from: "designationmasters",
                        localField: "employeeDetails.designation",
                        foreignField: "_id",
                        as: "designationDetails"
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
                    $match: filterObject
                },
                {
                    $match: {
                        $or: orArray,
                    },
                },
                {
                    $project: {
                        "issueDate": 1,
                        "returnDate": 1,
                        "updatedAt": 1,
                        "bookDetails.bookReferenceNumber": 1,
                        "bookMasterDetails.title": 1,
                        "bookMasterDetails._id": 1,
                        "bookMasterDetails.bookType": 1,
                        "employeeDetails.email": 1,
                        "employeeDetails.name": 1,
                        "employeeDetails.mobile": 1,
                        "departmentDetails.departmentName": 1,
                        "designationDetails.designationName": 1,
                        "type.name": 1
                    }
                }
            ]).skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await BookIssue.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $match: {
                    bookReturnStatus: 1,
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
                    from: "users",
                    localField: "employeeID",
                    foreignField: "_id",
                    as: "employeeDetails"
                },
            },
            {
                $lookup: {
                    from: "departmentmasters",
                    localField: "employeeDetails.department",
                    foreignField: "_id",
                    as: "departmentDetails"
                },
            },
            {
                $lookup: {
                    from: "designationmasters",
                    localField: "employeeDetails.designation",
                    foreignField: "_id",
                    as: "designationDetails"
                },
            },
            {
                $match: filterObject
            },
            {
                $match: {
                    $or: orArray,
                },
            },
            {
                $project: {
                    "issueDate": 1,
                    "returnDate": 1,
                    "updatedAt": 1,
                    "bookDetails.bookReferenceNumber": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.bookType": 1,
                    "employeeDetails.email": 1,
                    "employeeDetails.name": 1,
                    "employeeDetails.mobile": 1,
                    "departmentDetails.departmentName": 1,
                    "designationDetails.designationName": 1
                }
            }
        ]);

    } else {
        returnDetails = await BookIssue.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $match: {
                        bookReturnStatus: 1,
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
                        from: "users",
                        localField: "employeeID",
                        foreignField: "_id",
                        as: "employeeDetails"
                    },
                },
                {
                    $lookup: {
                        from: "departmentmasters",
                        localField: "employeeDetails.department",
                        foreignField: "_id",
                        as: "departmentDetails"
                    },
                },
                {
                    $lookup: {
                        from: "designationmasters",
                        localField: "employeeDetails.designation",
                        foreignField: "_id",
                        as: "designationDetails"
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
                    $match: filterObject
                },
                {
                    $project: {
                        "issueDate": 1,
                        "returnDate": 1,
                        "updatedAt": 1,
                        "bookDetails.bookReferenceNumber": 1,
                        "bookMasterDetails.title": 1,
                        "bookMasterDetails._id": 1,
                        "bookMasterDetails.bookType": 1,
                        "employeeDetails.email": 1,
                        "employeeDetails.name": 1,
                        "employeeDetails.mobile": 1,
                        "departmentDetails.departmentName": 1,
                        "designationDetails.designationName": 1,
                        "type.name": 1
                    }
                }
            ]).skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await BookIssue.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $match: {
                    bookReturnStatus: 1,
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
                    from: "users",
                    localField: "employeeID",
                    foreignField: "_id",
                    as: "employeeDetails"
                },
            },
            {
                $lookup: {
                    from: "departmentmasters",
                    localField: "employeeDetails.department",
                    foreignField: "_id",
                    as: "departmentDetails"
                },
            },
            {
                $lookup: {
                    from: "designationmasters",
                    localField: "employeeDetails.designation",
                    foreignField: "_id",
                    as: "designationDetails"
                },
            },
            {
                $match: filterObject
            },
            {
                $project: {
                    "issueDate": 1,
                    "returnDate": 1,
                    "updatedAt": 1,
                    "bookDetails.bookReferenceNumber": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.bookType": 1,
                    "employeeDetails.email": 1,
                    "employeeDetails.name": 1,
                    "employeeDetails.mobile": 1,
                    "departmentDetails.departmentName": 1,
                    "designationDetails.designationName": 1
                }
            }
        ]);
    }




    if (returnDetails.length > 0) {
        response.successResponse({
            totalReturn: returnDetails.length,
            returnDetails: returnDetails,
            bookCount: bookCount.length,
        });
    } else {
        return next(new AppError("Return details not found.", 500));
    }

});

exports.damageFilter = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    let pageSize;
    let currentPage;

    let bookCount;
    let books;
    const orArray = [];

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

    if (req.body.title) {
        orArray.push({ 'bookMasterDetails.title': { $regex: req.body.title, "$options": "i" } }, { 'bookdetailsmastersdetails.bookReferenceNumber': { $regex: req.body.title, "$options": "i" } })

        books = await BookDamage.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $match: {
                        status: 1,
                        deleted: 0,
                    }
                },
                {
                    $lookup: {
                        from: "bookmasters",
                        localField: "bookMasterId",
                        foreignField: "_id",
                        as: "bookMasterDetails"
                    },
                },
                {
                    $lookup: {
                        from: "bookdetailsmasters",
                        localField: "bookdetailsMasterId",
                        foreignField: "_id",
                        as: "bookdetailsmastersdetails"
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
                { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$bookdetailsmastersdetails", preserveNullAndEmptyArrays: true } },
                {
                    $match: {
                        $or: orArray,
                    },
                },
                {
                    $project: {
                        "bookMasterDetails.title": 1,
                        "bookMasterDetails._id": 1,
                        "bookMasterDetails.edition": 1,
                        "bookMasterDetails.bookType": 1,
                        "bookdetailsmastersdetails.bookReferenceNumber": 1,
                        "remark": 1,
                        "type.name": 1
                    }
                }
            ]).collation({ locale: "en" })
            .skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await BookDamage.aggregate([{
                $match: {
                    status: 1,
                    deleted: 0,
                }
            },
            {
                $lookup: {
                    from: "bookmasters",
                    localField: "bookMasterId",
                    foreignField: "_id",
                    as: "bookMasterDetails"
                },
            },
            {
                $lookup: {
                    from: "bookdetailsmasters",
                    localField: "bookdetailsMasterId",
                    foreignField: "_id",
                    as: "bookdetailsmastersdetails"
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
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$bookdetailsmastersdetails", preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    $or: orArray,
                },
            },
            {
                $project: {
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails._id": 1,
                    "bookMasterDetails.edition": 1,
                    "bookMasterDetails.bookType": 1,
                    "bookdetailsmastersdetails.bookReferenceNumber": 1,
                    "remark": 1,
                    "type.name": 1
                }
            }
        ]).collation({ locale: "en" });

    } else {

        books = await BookDamage.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $match: {
                        status: 1,
                        deleted: 0,
                    }
                },
                {
                    $lookup: {
                        from: "bookmasters",
                        localField: "bookMasterId",
                        foreignField: "_id",
                        as: "bookMasterDetails"
                    },
                },
                {
                    $lookup: {
                        from: "bookdetailsmasters",
                        localField: "bookdetailsMasterId",
                        foreignField: "_id",
                        as: "bookdetailsmastersdetails"
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
                { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$bookdetailsmastersdetails", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        "bookMasterDetails.title": 1,
                        "bookMasterDetails._id": 1,
                        "bookMasterDetails.edition": 1,
                        "bookMasterDetails.bookType": 1,
                        "bookdetailsmastersdetails.bookReferenceNumber": 1,
                        "remark": 1,
                        "type.name": 1
                    }
                }
            ]).collation({ locale: "en" })
            .skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await BookDamage.aggregate([{
                $match: {
                    status: 1,
                    deleted: 0,
                }
            },
            {
                $lookup: {
                    from: "bookmasters",
                    localField: "bookMasterId",
                    foreignField: "_id",
                    as: "bookMasterDetails"
                },
            },
            {
                $lookup: {
                    from: "bookdetailsmasters",
                    localField: "bookdetailsMasterId",
                    foreignField: "_id",
                    as: "bookdetailsmastersdetails"
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
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$bookdetailsmastersdetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails._id": 1,
                    "bookMasterDetails.edition": 1,
                    "bookMasterDetails.bookType": 1,
                    "bookdetailsmastersdetails.bookReferenceNumber": 1,
                    "remark": 1,
                    "type.name": 1
                }
            }
        ]).collation({ locale: "en" });
    }



    response.successResponse({
        message: `Total damage count= ${ books.length }`,
        damageList: books,
        bookCount: bookCount.length
    });

});

exports.requisitionFilter = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let pageSize;
    let currentPage;

    let bookCount;
    let requisitionDetails;
    const orArray = [];

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

    if (req.body.status) {
        filterObject['requisitionStatus'] = +req.body.status;
    }

    if (req.body.title) {

        orArray.push({ 'bookName': { $regex: req.body.title, "$options": "i" } }, { 'authorName': { $regex: req.body.title, "$options": "i" } }, { 'employeeID.name': { $regex: req.body.title, "$options": "i" } }, { 'employeeID.employee_id': { $regex: req.body.title, "$options": "i" } })

        requisitionDetails = await BookRequisition.aggregate([
                { $sort: { "createdAt": -1 } },
                {
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
                    $match: filterObject
                },
                {
                    $match: {
                        $or: orArray,
                    },
                },
                {
                    $project: {
                        "bookName": 1,
                        "authorName": 1,
                        "remark": 1,
                        "publisherName": 1,
                        "description": 1,
                        "createdAt": 1,
                        "requisitionStatus": 1,
                        "updatedAt": 1,
                        "employeeID.name": 1,
                        "employeeID.email": 1,
                        "employeeID.mobile": 1,
                        "employeeID.employee_id": 1
                    }
                }
            ]).collation({ locale: "en" }).skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await BookRequisition.aggregate([
            { $sort: { "createdAt": -1 } },
            {
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
                $match: filterObject
            },
            {
                $match: {
                    $or: orArray,
                },
            },
            {
                $project: {
                    "bookName": 1,
                    "authorName": 1,
                    "publisherName": 1,
                    "description": 1,
                    "createdAt": 1,
                    "requisitionStatus": 1,
                    "updatedAt": 1,
                    "employeeID.name": 1,
                    "employeeID.email": 1,
                    "employeeID.mobile": 1,
                    "employeeID.employee_id": 1
                }
            }
        ]);

    } else {

        requisitionDetails = await BookRequisition.aggregate([
                { $sort: { "createdAt": -1 } },
                {
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
                    $match: filterObject
                },
                {
                    $project: {
                        "bookName": 1,
                        "authorName": 1,
                        "publisherName": 1,
                        "description": 1,
                        "remark": 1,
                        "createdAt": 1,
                        "requisitionStatus": 1,
                        "updatedAt": 1,
                        "employeeID.name": 1,
                        "employeeID.email": 1,
                        "employeeID.mobile": 1,
                        "employeeID.employee_id": 1
                    }
                }
            ]).collation({ locale: "en" }).skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await BookRequisition.aggregate([
            { $sort: { "createdAt": -1 } },
            {
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
                $match: filterObject
            },
            {
                $project: {
                    "bookName": 1,
                    "authorName": 1,
                    "publisherName": 1,
                    "description": 1,
                    "createdAt": 1,
                    "requisitionStatus": 1,
                    "updatedAt": 1,
                    "employeeID.name": 1,
                    "employeeID.email": 1,
                    "employeeID.mobile": 1,
                    "employeeID.employee_id": 1
                }
            }
        ]);

    }

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

exports.reviewFilter = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let pageSize;
    let currentPage;

    let reviewCount;
    let reviewDetails;
    const orArray = [];

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

    try {

        const filterObject = {};

        if (req.body.status) {
            filterObject['active'] = +req.body.status
        }

        if (req.body.title) {
            orArray.push({ 'bookMasterDetails.title': { $regex: req.body.title, "$options": "i" } }, { 'employeeDetails.name': { $regex: req.body.title, "$options": "i" } })

            reviewDetails = await Bookrating.aggregate([
                    { $sort: { "createdAt": -1 } },
                    {
                        $match: {
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
                        $match: filterObject
                    },
                    {
                        $match: {
                            $or: orArray,
                        },
                    },
                    {
                        $project: {
                            "rating": 1,
                            "review": 1,
                            "active": 1,
                            "createdAt": 1,
                            "status": 1,
                            "bookMasterDetails.title": 1,
                            "bookMasterDetails.edition": 1,
                            "bookMasterDetails.front_image": 1,
                            "bookMasterDetails.bookType": 1,
                            "bookMasterDetails._id": 1,
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
                ]).skip(pageSize * (currentPage - 1))
                .limit(pageSize);

            reviewCount = await Bookrating.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $match: {
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
                    $match: filterObject
                },
                {
                    $match: {
                        $or: orArray,
                    },
                },
                {
                    $project: {
                        "rating": 1,
                        "review": 1,
                        "active": 1,
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

        } else {

            reviewDetails = await Bookrating.aggregate([
                    { $sort: { "createdAt": -1 } },
                    {
                        $match: {
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
                        $match: filterObject
                    },
                    {
                        $project: {
                            "rating": 1,
                            "review": 1,
                            "active": 1,
                            "createdAt": 1,
                            "status": 1,
                            "bookMasterDetails.title": 1,
                            "bookMasterDetails.edition": 1,
                            "bookMasterDetails.front_image": 1,
                            "bookMasterDetails.bookType": 1,
                            "bookMasterDetails._id": 1,
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
                ]).skip(pageSize * (currentPage - 1))
                .limit(pageSize);

            reviewCount = await Bookrating.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $match: {
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
                    $match: filterObject
                },
                {
                    $project: {
                        "rating": 1,
                        "review": 1,
                        "active": 1,
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

        }

        response.successResponse({
            message: `Total review count= ${ reviewDetails.length }`,
            reviewDetails: reviewDetails,
            reviewCount: reviewCount.length
        });

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.findBookIssueDetailsFilter = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    const bookDetailsList = await BookDetailsMaster.find({
        bookID: req.body.bookId
    }, {
        "_id": 1
    });

    const filterObject = {};

    if (req.body.status) {
        filterObject['bookReturnStatus'] = req.body.status
    }

    filterObject['bookID'] = { $in: bookDetailsList }

    const bookIssuelist = await BookIssue.find(filterObject, {
        "issueDate": 1,
        "returnDate": 1,
        "bookReturnStatus": 1,
        "bookStatus": 1,
        "remark": 1,
        "updated_by": 1,
        "updatedAt": 1
    }).populate({
        path: 'employeeID',
        select: ['name', 'mobile', 'email', 'employee_id']
    }).populate({
        path: 'bookID',
        select: ['bookReferenceNumber']
    }).sort({ createdAt: -1 });

    if (bookIssuelist.length > 0) {
        response.successResponse({
            message: `Total Issue Book Details : ${bookIssuelist.length}`,
            bookIssuelist: bookIssuelist
        });
    } else {
        response.successResponse({
            message: `No Issue Book Details Found`,
            bookIssuelist: []
        });
    }

});

exports.qrCodeFilter = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    const filterObject = {};

    if (req.body.status) {
        filterObject['isAssigned'] = +req.body.status
    }

    const qrCodeDetails = await QrCodeDetails.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                status: 1,
                deleted: 0
            },
        },
        {
            $lookup: {
                from: "bookdetailsmasters",
                localField: "bookDetailMasterId",
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
            $match: filterObject
        },
        {
            $project: {
                "qrCodePath": 1,
                "isAssigned": 1,
                "bookReferenceNumber": 1,
                "bookDetailMasterId": 1,
                "bookDetails.bookReferenceNumber": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.bookType": 1
            }
        }
    ]);


    if (qrCodeDetails.length > 0) {
        response.successResponse({
            totalData: qrCodeDetails.length,
            qrCodeDetails: qrCodeDetails
        });
    } else {
        return next(new AppError("Qr code details not found.", 500));
    }

});

exports.blogAdminFilter = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let arr = new Array();

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

    // if (req.body.desc) {
    //     filterObject['description'] = { $regex: req.body.desc, "$options": "i" }
    // }

    if (req.body.empId) {
        filterObject["userId"] = req.body.empId
    }

    filterObject["deleted"] = 0;

    try {

        const blogDetails = await BlogParent.find(filterObject, {
                "description": 1,
                "createdAt": 1,
                "status": 1,
                "img": 1,
            }).populate({
                path: 'userId',
                select: ['name', 'email', 'mobile', 'employee_id']
            }).populate({
                path: 'relation',
                select: ['relation']
            }).populate({
                path: 'bookId',
                select: ['title', 'front_image']
            }).sort({ createdAt: -1 })
            .skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        const blogCount = await BlogParent.find(filterObject, {
            "description": 1,
            "createdAt": 1,
            "img": 1,
        }).populate({
            path: 'userId',
            select: ['name', 'email', 'mobile', 'employee_id']
        }).populate({
            path: 'relation',
            select: ['relation']
        }).populate({
            path: 'bookId',
            select: ['title', 'front_image']
        }).sort({ createdAt: -1 });

        if (blogDetails.length > 0) {

            for (const iterator of blogDetails) {
                const reply = await BlogComment.find({
                    status: 1,
                    deleted: 0,
                    blogId: iterator._id
                });

                const like = await BlogLike.find({
                    status: 1,
                    deleted: 0,
                    parentBlogId: iterator._id
                });

                arr.push({
                    id: iterator._id,
                    empId: iterator.userId._id,
                    empName: iterator.userId.name,
                    empEmail: iterator.userId.email,
                    empMobile: iterator.userId.mobile,
                    empId: iterator.userId.employee_id,
                    relationship: iterator.relation.relation,
                    commentCount: reply.length,
                    likeCount: like.length,
                    blogCreatedDate: iterator.createdAt,
                    blogDescription: iterator.description,
                    blogimg: iterator.img,
                    bookDetails: iterator.bookId,
                    status: iterator.status
                });
            }
        }

        response.successResponse({
            blogList: arr,
            blogCount: blogCount.length
        });

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.suggestedFilter = catchAsync(async(req, res, next) => {

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

    if (req.body.bookID) {
        filterObject['bookMasterDetails.title'] = { $regex: req.body.bookID, "$options": "i" }
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
            {
                $lookup: {
                    from: "users",
                    localField: "created_by",
                    foreignField: "_id",
                    as: "recommandedBy"
                },
            },
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$recommandedBy", preserveNullAndEmptyArrays: true } },
            {
                $match: filterObject
            },
            {
                $project: {
                    "createdAt": 1,
                    "bookmasterId": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails._id": 1,
                    "bookMasterDetails.front_image": 1,
                    "authorDetails.first_name": 1,
                    "authorDetails.middle_name": 1,
                    "authorDetails.last_name": 1,
                    "publisherDetails.title": 1,
                    "recommandedBy.name": 1,
                    "recommandedBy.user_role": 1,
                }
            }
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

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
                "authorDetails.first_name": 1,
                "authorDetails.middle_name": 1,
                "authorDetails.last_name": 1,
                "publisherDetails.title": 1
            }
        }
    ]);

    response.successResponse({
        totalBookDetails: bookDetails.length,
        bookDetails: bookDetails,
        bookCount: bookCount.length
    });

});

exports.suggestedHistoryFilter = catchAsync(async(req, res, next) => {

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


    const filterObject = {};

    if (req.body.bookID) {
        filterObject['bookMasterDetails.title'] = { $regex: req.body.bookID, "$options": "i" }
    }

    const bookDetails = await BookSuggestedHistory.aggregate([
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
            {
                $lookup: {
                    from: "users",
                    localField: "created_by",
                    foreignField: "_id",
                    as: "recommandedBy"
                },
            },
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$recommandedBy", preserveNullAndEmptyArrays: true } },
            {
                $match: filterObject
            },
            {
                $project: {
                    "createdAt": 1,
                    "bookmasterId": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails._id": 1,
                    "bookMasterDetails.front_image": 1,
                    "authorDetails.first_name": 1,
                    "authorDetails.middle_name": 1,
                    "authorDetails.last_name": 1,
                    "publisherDetails.title": 1,
                    "recommandedBy.name": 1,
                    "recommandedBy.user_role": 1,
                }
            }
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookSuggestedHistory.aggregate([
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
                "authorDetails.first_name": 1,
                "authorDetails.middle_name": 1,
                "authorDetails.last_name": 1,
                "publisherDetails.title": 1
            }
        }
    ]);

    response.successResponse({
        totalBookDetails: bookDetails.length,
        bookDetails: bookDetails,
        bookCount: bookCount.length
    });

});

// exports.filterQrCodeManagement = catchAsync(async(req, res, next) => {

//     let pageSize;
//     let currentPage;

//     if (req.body.pageSize) {
//         pageSize = +req.body.pageSize;
//     } else {
//         pageSize = 12;
//     }

//     if (req.body.currentPage) {
//         currentPage = +req.body.currentPage;
//     } else {
//         currentPage = 1;
//     }

//     const orArray = [];
//     if (req.body.bookName) {
//         orArray.push({ 'bookMasterDetails.title': { $regex: req.body.bookName, "$options": "i" } }, { 'bookReferenceNumber': +req.body.bookName })
//     }

//     if (req.body.status) {
//         orArray.push({ 'isAssigned': +req.body.status })
//     }

//     console.log(orArray);

//     const response = new AppSuccess(res);

//     const qrCodeDetailsFilter = await QrCodeDetails.aggregate([
//             { $sort: { "createdAt": -1 } },
//             {
//                 $match: {
//                     status: 1,
//                     deleted: 0
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "bookdetailsmasters",
//                     localField: "bookDetailMasterId",
//                     foreignField: "_id",
//                     as: "bookDetails"
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "bookmasters",
//                     localField: "bookDetails.bookID",
//                     foreignField: "_id",
//                     as: "bookMasterDetails"
//                 },
//             },
//             {
//                 $match: { $or: orArray }
//             },
//             {
//                 $project: {
//                     "qrCodePath": 1,
//                     "isAssigned": 1,
//                     "bookReferenceNumber": 1,
//                     "bookDetailMasterId": 1,
//                     "bookDetails.bookReferenceNumber": 1,
//                     "bookMasterDetails.title": 1,
//                     "bookMasterDetails.bookType": 1,
//                     "bookDetails.bookStatus": 1
//                 }
//             }
//         ]).skip(pageSize * (currentPage - 1))
//         .limit(pageSize);

//     const bookCount = await QrCodeDetails.aggregate([
//         { $sort: { "createdAt": -1 } },
//         {
//             $match: {
//                 status: 1,
//                 deleted: 0
//             },
//         },
//         {
//             $lookup: {
//                 from: "bookdetailsmasters",
//                 localField: "bookDetailMasterId",
//                 foreignField: "_id",
//                 as: "bookDetails"
//             },
//         },
//         {
//             $lookup: {
//                 from: "bookmasters",
//                 localField: "bookDetails.bookID",
//                 foreignField: "_id",
//                 as: "bookMasterDetails"
//             },
//         },
//         {
//             $match: {
//                 $or: orArray
//             }
//         },
//         {
//             $project: {
//                 "qrCodePath": 1,
//                 "isAssigned": 1,
//                 "bookReferenceNumber": 1,
//                 "bookDetailMasterId": 1,
//                 "bookDetails.bookReferenceNumber": 1,
//                 "bookMasterDetails.title": 1,
//                 "bookMasterDetails.bookType": 1,
//                 "bookDetails.bookStatus": 1
//             }
//         }
//     ]);

//     if (qrCodeDetailsFilter.length > 0) {
//         response.successResponse({
//             totalData: qrCodeDetailsFilter.length,
//             qrCodeDetailsFilter: qrCodeDetailsFilter,
//             bookCount: bookCount.length
//         });
//     } else {
//         response.successResponse({
//             totalData: qrCodeDetailsFilter.length,
//             qrCodeDetailsFilter: [],
//             bookCount: bookCount.length
//         });
//     }

// });

// exports.filterUser = catchAsync(async(req, res, next) => {

//     let pageSize;
//     let currentPage;

//     if (req.body.pageSize) {
//         pageSize = +req.body.pageSize;
//     } else {
//         pageSize = 12;
//     }

//     if (req.body.currentPage) {
//         currentPage = +req.body.currentPage;
//     } else {
//         currentPage = 1;
//     }

//     const orArray = [];
//     if (req.body.empName) {
//         orArray.push({ name: { $regex: req.body.empName, "$options": "i" } }, { mobile: { $regex: req.body.empName, "$options": "i" } }, { email: { $regex: req.body.empName, "$options": "i" } }, )

//     }

//     const response = new AppSuccess(res);

//     const bookDetails = await User.aggregate([
//             { $sort: { "createdAt": -1 } },
//             {
//                 $match: {
//                     status: 1,
//                     user_role: { $in: [2, 4] }
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "userrolemasters",
//                     localField: "user_role",
//                     foreignField: "userRoleId",
//                     as: "userRole"
//                 },
//             },
//             { $unwind: { path: "$userRole", preserveNullAndEmptyArrays: true } },

//             {
//                 $project: {
//                     "name": 1,
//                     "email": 1,
//                     "mobile": 1,
//                     "user_role": 1,
//                     "status": 1,
//                     "userRole.name": 1,
//                 }
//             }
//         ]).skip(pageSize * (currentPage - 1))
//         .limit(pageSize);

//     const empDetails = await User.find({
//             $or: orArray,
//             deleted: 0,
//             user_role: { $in: [2, 4] }
//         }, {
//             "name": 1,
//             "email": 1,
//             "mobile": 1,
//             "user_role": 1,
//             "status": 1
//         }).sort({ createdAt: -1 })
//         .skip(pageSize * (currentPage - 1))
//         .limit(pageSize);

//     const bookCount = await User.find({
//         $or: orArray,
//         deleted: 0,
//         user_role: { $in: [2, 4] }
//     }, {
//         "name": 1,
//         "email": 1,
//         "mobile": 1,
//         "user_role": 1,
//         "status": 1
//     }).sort({ createdAt: -1 });

//     response.successResponse({
//         message: `Total employee count= ${ bookDetails.length }`,
//         empList: bookDetails,
//         bookCount: bookCount.length
//     });

// });