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
const fs = require("fs");
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);

const fastcsv = require('fast-csv');

const xlsx = require('xlsx');
const excel = require("exceljs");

exports.requestReport = catchAsync(async(req, res, next) => {
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

    const books = await BookRequest.aggregate([{
                $match: {
                    status: 1,
                    deleted: 0,
                    bookRequestStatus: 1
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

    const bookCount = await BookRequest.aggregate([{
            $match: {
                status: 1,
                deleted: 0,
                bookRequestStatus: 1
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

    response.successResponse({
        message: `Total request count= ${ books.length }`,
        requestList: books,
        bookCount: bookCount.length
    });

});

exports.exportRequestReport = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const filterObject = {};

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

    const books = await BookRequest.aggregate([{
            $match: {
                status: 1,
                deleted: 0,
                bookRequestStatus: 1
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
                "bookID.bookType": 1,
                "bookID._id": 1
            }
        }
    ]);

    const workbook = new excel.Workbook(); // Create a new workbook
    const worksheet = workbook.addWorksheet("Item Request"); // New Worksheet
    const path = "images/export"; // Path to download excel
    // Column for data in excel. key must match data key
    worksheet.columns = [
        { header: "Sl. No.", key: "s_no", width: 10 },
        { header: "Employee Name", key: "nm", width: 25 },
        { header: "Employee Email", key: "ee", width: 30 },
        { header: "Employee Mobile", key: "em", width: 25 },
        { header: "Requested Item", key: "ri", width: 50 },
        { header: "Item Type", key: "it", width: 25 },
        { header: "Available Quantity", key: "aq", width: 25 },
        { header: "Request Date", key: "rd", width: 25 },
    ];

    // Looping through User data
    let counter = 1;
    let type;

    books.forEach((req) => {

        if (req.bookID.bookType == 1) {
            type = 'Book';
        } else if (req.bookID.bookType == 2) {
            type = 'Magazine';
        } else {
            type = 'Journal';
        }

        req.s_no = counter;
        req.nm = req.employeeID.name;
        req.ee = req.employeeID.email;
        req.em = req.employeeID.mobile;
        req.ri = req.bookID.title;
        req.it = type;
        req.aq = req.bookID.availableQuantity ? req.bookID.availableQuantity : 0;
        req.rd = req.createdAt;
        worksheet.addRow(req); // Add data in worksheet
        counter++;
    });

    // Making first line in excel bold
    worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
    });
    try {

        let fileName = `${Math.floor(Math.random() * 10000)}${Date.now()}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
        const data = await workbook.xlsx.writeFile(`${path}/${fileName}`)
            .then(() => {
                res.send({
                    status: "success",
                    message: "file successfully downloaded",
                    path: `${path}/${fileName}`,
                });
            });
    } catch (err) {
        res.send({
            status: "error",
            message: err,
        });
    }

});

exports.issueReport = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    let pageSize;
    let currentPage;
    let arr = [];

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
        filterObject['issueDate'] = { $gte: new Date(req.body.fromDate), $lte: endDate }
    }

    if (req.body.fromDate && !req.body.toDate) {
        filterObject['issueDate'] = { $gte: new Date(req.body.fromDate), $lte: new Date(new Date()) }
    }

    const issueDetails = await BookIssue.aggregate([
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

    const bookCount = await BookIssue.aggregate([
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
            issueDetails: arr,
            bookCount: bookCount.length
        });
    } else {
        return next(new AppError("Issue details not found.", 500));
    }

});

exports.issueReportExport = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

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

    const issueDetails = await BookIssue.aggregate([
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
        { $unwind: { path: "$bookDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$employeeDetails", preserveNullAndEmptyArrays: true } },
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
                "designationDetails.designationName": 1
            }
        }
    ]);

    const workbook = new excel.Workbook(); // Create a new workbook
    const worksheet = workbook.addWorksheet("Item Issued"); // New Worksheet
    const path = "images/export"; // Path to download excel
    // Column for data in excel. key must match data key
    worksheet.columns = [
        { header: "Sl. No.", key: "s_no", width: 10 },
        { header: "Employee Name", key: "nm", width: 25 },
        { header: "Employee Email", key: "ee", width: 30 },
        { header: "Employee Mobile", key: "em", width: 25 },
        { header: "Issued Item", key: "ri", width: 50 },
        { header: "Item Type", key: "it", width: 25 },
        { header: "Item Reference Number", key: "ir", width: 50 },
        { header: "Issued Date", key: "id", width: 25 },
        { header: "Due Date", key: "dd", width: 25 },
        { header: "Overdue Days", key: "od", width: 25 },
    ];

    // Looping through User data
    let counter = 1;
    let type;

    issueDetails.forEach((req) => {

        if (req.bookMasterDetails.bookType == 1) {
            type = 'Book';
        } else if (req.bookMasterDetails.bookType == 2) {
            type = 'Magazine';
        } else {
            type = 'Journal';
        }

        const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        const firstDate = new Date(req.returnDate);
        const secondDate = new Date();
        let diffDays;

        if (firstDate < secondDate) {
            diffDays = Math.round(Math.abs((firstDate - secondDate) / oneDay));
        } else {
            diffDays = '0';
        }

        req.s_no = counter;
        req.nm = req.employeeDetails.name;
        req.ee = req.employeeDetails.email;
        req.em = req.employeeDetails.mobile;
        req.ri = req.bookMasterDetails.title;
        req.it = type;
        req.ir = req.bookDetails.bookReferenceNumber;
        req.id = req.issueDate;
        req.dd = req.returnDate;
        req.od = diffDays;
        worksheet.addRow(req); // Add data in worksheet
        counter++;
    });

    // Making first line in excel bold
    worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
    });
    try {

        let fileName = `${Math.floor(Math.random() * 10000)}${Date.now()}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
        const data = await workbook.xlsx.writeFile(`${path}/${fileName}`)
            .then(() => {
                res.send({
                    status: "success",
                    message: "file successfully downloaded",
                    path: `${path}/${fileName}`,
                });
            });
    } catch (err) {
        res.send({
            status: "error",
            message: err,
        });
    }

});

exports.returnReport = catchAsync(async(req, res, next) => {

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

    const returnDetails = await BookIssue.aggregate([
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

    const bookCount = await BookIssue.aggregate([
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

exports.returnReportExport = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

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

    const returnDetails = await BookIssue.aggregate([
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
        { $unwind: { path: "$bookDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$employeeDetails", preserveNullAndEmptyArrays: true } },
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
                "designationDetails.designationName": 1
            }
        }
    ]);

    const workbook = new excel.Workbook(); // Create a new workbook
    const worksheet = workbook.addWorksheet("Item Returned"); // New Worksheet
    const path = "images/export"; // Path to download excel
    // Column for data in excel. key must match data key
    worksheet.columns = [
        { header: "Sl No.", key: "s_no", width: 10 },
        { header: "Employee Name", key: "nm", width: 25 },
        { header: "Employee Email", key: "ee", width: 30 },
        { header: "Employee Mobile", key: "em", width: 25 },
        { header: "Requested Item", key: "ri", width: 50 },
        { header: "Item Type", key: "it", width: 25 },
        { header: "Item Reference Number", key: "ir", width: 50 },
        { header: "Issued Date", key: "id", width: 25 },
        { header: "Due Date", key: "dd", width: 25 },
        { header: "Returned On", key: "od", width: 25 },
    ];

    // Looping through User data
    let counter = 1;
    let type;

    returnDetails.forEach((req) => {

        if (req.bookMasterDetails.bookType == 1) {
            type = 'Book';
        } else if (req.bookMasterDetails.bookType == 2) {
            type = 'Magazine';
        } else {
            type = 'Journal';
        }

        req.s_no = counter;
        req.nm = req.employeeDetails.name;
        req.ee = req.employeeDetails.email;
        req.em = req.employeeDetails.mobile;
        req.ri = req.bookMasterDetails.title;
        req.it = type;
        req.ir = req.bookDetails.bookReferenceNumber;
        req.id = req.issueDate;
        req.dd = req.returnDate;
        req.od = req.updatedAt;
        worksheet.addRow(req); // Add data in worksheet
        counter++;
    });

    // Making first line in excel bold
    worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
    });
    try {

        let fileName = `${Math.floor(Math.random() * 10000)}${Date.now()}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
        const data = await workbook.xlsx.writeFile(`${path}/${fileName}`)
            .then(() => {
                res.send({
                    status: "success",
                    message: "file successfully downloaded",
                    path: `${path}/${fileName}`,
                });
            });
    } catch (err) {
        res.send({
            status: "error",
            message: err,
        });
    }

});

exports.bookReport = catchAsync(async(req, res, next) => {

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

    if (req.body.bookType) {
        filterObject["bookType"] = +req.body.bookType
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

    const response = new AppSuccess(res);

    const bookFilter = await BookMaster.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $match: {
                    deleted: 0
                },
            },
            {
                $lookup: {
                    from: "bookjournalmagazinetypemasters",
                    localField: "bookType",
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
                    "title": 1,
                    "bookType": 1,
                    "assignedQuantity": 1,
                    "availableQuantity": 1,
                    "damageQuantity": 1,
                    "lostQuantity": 1,
                    "createdAt": 1,
                    "type.name": 1,
                }
            }
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);


    let arr = new Array();

    for (const iterator of bookFilter) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        var popularBookList = {};
        popularBookList['title'] = iterator.title;
        popularBookList['bookId'] = iterator._id;
        popularBookList['bookType'] = iterator.bookType;
        popularBookList['type'] = iterator.type.name;
        popularBookList['assignedQuantity'] = iterator.assignedQuantity == null ? 0 : iterator.assignedQuantity;
        popularBookList['availableQuantity'] = iterator.availableQuantity == null ? 0 : iterator.availableQuantity;
        popularBookList['damageQuantity'] = iterator.damageQuantity == null ? 0 : iterator.damageQuantity;
        popularBookList['lostQuantity'] = iterator.lostQuantity == null ? 0 : iterator.lostQuantity;
        popularBookList['issueCount'] = bookIssuelist.length;
        popularBookList['createdAt'] = iterator.createdAt;
        arr.push(popularBookList);
    }

    const bookCount = await BookMaster.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                deleted: 0
            },
        },
        {
            $lookup: {
                from: "bookjournalmagazinetypemasters",
                localField: "bookType",
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
                "title": 1,
                "assignedQuantity": 1,
                "availableQuantity": 1,
                "damageQuantity": 1,
                "lostQuantity": 1,
                "type.name": 1,
            }
        }
    ]);

    if (bookFilter.length > 0) {
        response.successResponse({
            totalData: bookFilter.length,
            bookCount: bookCount.length,
            bookFilter: arr
        });
    } else {
        response.successResponse({
            totalData: bookFilter.length,
            bookCount: bookCount.length,
            bookFilter: []
        });
    }

});

exports.exportBookReport = catchAsync(async(req, res, next) => {

    const filterObject = {};

    if (req.body.bookType) {
        filterObject["bookType"] = +req.body.bookType
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

    const response = new AppSuccess(res);

    const bookFilter = await BookMaster.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                deleted: 0
            },
        },
        {
            $lookup: {
                from: "bookjournalmagazinetypemasters",
                localField: "bookType",
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
                "title": 1,
                "assignedQuantity": 1,
                "availableQuantity": 1,
                "damageQuantity": 1,
                "lostQuantity": 1,
                "type.name": 1,
                "createdAt": 1
            }
        }
    ]);


    let arr = new Array();

    for (const iterator of bookFilter) {

        const bookDetailsList = await BookDetailsMaster.find({
            bookID: iterator._id
        }, {
            "_id": 1
        });

        const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } });

        var popularBookList = {};
        popularBookList['title'] = iterator.title;
        popularBookList['type'] = iterator.type.name;
        popularBookList['createdAt'] = iterator.createdAt;
        popularBookList['assignedQuantity'] = iterator.assignedQuantity == null ? 0 : iterator.assignedQuantity;
        popularBookList['availableQuantity'] = iterator.availableQuantity == null ? 0 : iterator.availableQuantity;
        popularBookList['damageQuantity'] = iterator.damageQuantity == null ? 0 : iterator.damageQuantity;
        popularBookList['lostQuantity'] = iterator.lostQuantity == null ? 0 : iterator.lostQuantity;
        popularBookList['issueCount'] = bookIssuelist.length;
        arr.push(popularBookList);
    }

    const workbook = new excel.Workbook(); // Create a new workbook
    const worksheet = workbook.addWorksheet("Book Report"); // New Worksheet
    const path = "images/export"; // Path to download excel
    // Column for data in excel. key must match data key
    worksheet.columns = [
        { header: "Sl. No.", key: "s_no", width: 10 },
        { header: "Item Name", key: "nm", width: 40 },
        { header: "Item Type", key: "ee", width: 20 },
        { header: "Total Assigned", key: "em", width: 15 },
        { header: "Total Available", key: "ri", width: 15 },
        { header: "Total Issued", key: "ir", width: 15 },
        { header: "Total Damaged", key: "it", width: 15 },
        { header: "Total Lost", key: "id", width: 15 },
        { header: "Created Date", key: "dd", width: 25 }
    ];

    // Looping through User data
    let counter = 1;
    let type;

    arr.forEach((req) => {

        req.s_no = counter;
        req.nm = req.title;
        req.ee = req.type;
        req.em = req.assignedQuantity;
        req.ri = req.availableQuantity;
        req.ir = req.damageQuantity;
        req.it = req.lostQuantity;
        req.id = req.issueCount;
        req.dd = req.createdAt;
        worksheet.addRow(req); // Add data in worksheet
        counter++;
    });

    // Making first line in excel bold
    worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
    });
    try {

        let fileName = `${Math.floor(Math.random() * 10000)}${Date.now()}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
        const data = await workbook.xlsx.writeFile(`${path}/${fileName}`)
            .then(() => {
                res.send({
                    status: "success",
                    message: "file successfully downloaded",
                    path: `${path}/${fileName}`,
                });
            });
    } catch (err) {
        res.send({
            status: "error",
            message: err,
        });
    }

});