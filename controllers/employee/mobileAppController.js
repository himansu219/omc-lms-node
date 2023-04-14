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
        pageSize = 10;
    }

    if (req.body.currentPage) {
        currentPage = +req.body.currentPage;
    } else {
        currentPage = 1;
    }

    if (req.body.sortId) {
        sortId = req.body.sortId;
    } else {
        sortId = "6396ffb0d158366ed02d2f46";
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

    if (req.body.title) {
        filterObject['title'] = { $regex: req.body.title, "$options": "i" }
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

        arr.push({
            id: iterator._id,
            bookName: iterator.title,
            authorID: iterator.authorID,
            publisherID: iterator.publisherID,
            frontImage: iterator.front_image,
            rating: iterator.rating,
            issueCount: bookIssuelist.length
        });
    }

    response.successResponse({
        bookCount: bookCount.length,
        bookList: arr
    });

});