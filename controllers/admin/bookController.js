const catchAsync = require("../../utils/catchAsync");
const BookMaster = require("../../models/admin/BookMaster");
const TempBook = require("../../models/admin/temporaryBulkBooks");
const BookIssue = require("../../models/admin/BookIssue");
const BookRequest = require("../../models/employee/BookRequest");
const LanguageMaster = require("../../models/admin/LanguageMaster");
const SettingMaster = require("../../models/admin/settingMaster");
const BookDetailsMaster = require("../../models/admin/BookDetailsMaster");
const BookDamage = require("../../models/admin/bookDamage");
const BookRecover = require("../../models/admin/bookRecover");
const BookReferenceUniqueNumberMaster = require("../../models/admin/BookReferenceUniqueNumberMaster");
const QrCodeDetails = require("../../models/admin/qrCodeDetails");
const QrCode = require("../../models/admin/qrCode");
const DepartmentMaster = require("../../models/admin/departmentMaster");
const DesignationMaster = require("../../models/admin/DesignationMaster");
const RackMaster = require("../../models/admin/rackMaster");
const ShelfMaster = require("../../models/admin/shelfMaster");
const RackManagement = require("../../models/admin/RackManagement");
const Notification = require("../../models/admin/notification");
const BookSuggested = require("../../models/admin/bookSuggested");
const BookSuggestedHistory = require("../../models/admin/bookSuggestedHistory");
const BookJournalMagzineTypeMaster = require("../../models/admin/bookJournalMagzineTypeMaster");
const User = require("../../models/auth/user");
const Activity = require("../../models/activity/activityLog");
const requestIp = require('request-ip');
const BookRequisition = require("../../models/employee/bookRequisition");
const Bookrating = require("../../models/employee/bookRating");
const helper = require("../../utils/helper");
const AuthorMaster = require("../../models/admin/authorMaster");
const PublisherMaster = require("../../models/admin/publisherMaster");
const GenreMaster = require("../../models/admin/genreMaster");
const mongoose = require('mongoose');
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const qrCode = require("qrcode");
const fs = require("fs");
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const ItemStatusMaster = require("../../models/admin/itemStatusMaster");
const BookRequisitionStatusMaster = require("../../models/admin/bookRequisitionStatusMaster");

const { ReturnDocument } = require("mongodb");
const { json } = require("express");
const rackMaster = require("../../models/admin/rackMaster");

let userId = '';
let imgFrontData = '';
let imgBackData = '';

exports.store = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    let genres;
    let author;
    let edition;
    let pages;

    if (req.body.genres) {
        genres = req.body.genres;
    } else {
        genres = null;
    }

    if (req.body.author) {
        author = req.body.author;
    } else {
        author = null;
    }

    if (req.body.edition) {
        edition = req.body.edition;
    } else {
        edition = null;
    }

    if (req.body.pages) {
        pages = req.body.pages;
    } else {
        pages = 0;
    }


    if (!req.body.bookType) {
        new AppError("Item type is not defined.", 400, { type: "duplicate book" })
    }

    const existingBookByOtherDetails = await BookMaster.findOne({
        title: req.body.title,
        authorID: author,
        genreID: genres,
        edition: edition,
        publisherID: req.body.publisher,
        //status: 1,
        deleted: 0,
        bookType: req.body.bookType
    });

    if (existingBookByOtherDetails) {
        return next(
            new AppError("Item already exists", 400, { type: "duplicate book" })
        );
    }


    if (req.files.f_image == undefined) {
        imgFrontData = null;
    } else {
        imgFrontData = "images/book/" + req.files.f_image[0].filename;
    }

    if (req.files.b_image == undefined) {
        imgBackData = null;
    } else {
        imgBackData = "images/book/" + req.files.b_image[0].filename;
    }

    try {

        const newBook = await BookMaster.create({
            bookType: req.body.bookType,
            title: req.body.title,
            authorID: author,
            genreID: genres,
            edition: req.body.edition,
            pages: pages,
            publisherID: req.body.publisher,
            publishedYear: req.body.publishedYear,
            description: req.body.description,
            language: req.body.language,
            volume: req.body.volume,
            issue: req.body.issue,
            front_image: imgFrontData,
            back_image: imgBackData,
            created_by: userId,
            status: 1
        });
        if (newBook) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);



            const data = {
                title: newBook.title,
                id: newBook._id,
            };
            let bookType;
            if (req.body.bookType == 1) {
                bookType = "Book"
            } else if (req.body.bookType == 2) {
                bookType = "Magazine"
            } else if (req.body.bookType == 3) {
                bookType = "Journal"
            } else {}

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Add Book",
                operationType: `${ bookType } Added - <a href='/books/book-details/${newBook._id}'><b>${ req.body.title }</b></a>`,
                userType: userType,
                created_by: userId
            });

            response.createResponse({
                message: `${bookType} successfully added`,
                book: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.bookList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const books = await BookMaster.find({
        deleted: 0,
        bookType: 1,
    }, {
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

    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookList: books
    });

});

exports.bookUpdate = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.bookId == "") {
        return next(new AppError("Item details not found", 500));
    }

    const checkbookID = await BookMaster.findById(req.body.bookId, {
        deleted: 0
    });

    if (checkbookID.bookType == 2 || checkbookID.bookType == 1) {

        const existingBookByOtherDetails = await BookMaster.find({
            _id: { $ne: req.body.bookId },
            title: req.body.title,
            authorID: req.body.author,
            genreID: req.body.genres,
            edition: req.body.edition,
            publisherID: req.body.publisher,
            //status: 1,
            deleted: 0
        });

        if (existingBookByOtherDetails.length > 0) {
            return next(
                new AppError("Item already exists", 400, { type: "duplicate book" })
            );
        }
    }

    if (checkbookID.bookType == 3) {
        const existingBookByOtherDetails = await BookMaster.find({
            _id: { $ne: req.body.bookId },
            title: req.body.title,
            edition: req.body.edition,
            publisherID: req.body.publisher,
            status: 1,
            deleted: 0
        });

        if (existingBookByOtherDetails.length > 0) {
            return next(
                new AppError("Journal already exists", 400, { type: "duplicate book" })
            );
        }
    }
    
    if (checkbookID) {
        try {

            if (req.files.f_image == undefined) {
                imgFrontData = null;
            } else {
                imgFrontData = "images/book/" + req.files.f_image[0].filename;
            }

            if (req.files.b_image == undefined) {
                imgBackData = null;
            } else {
                imgBackData = "images/book/" + req.files.b_image[0].filename;
            }

            let updateData;

            if (checkbookID.bookType == 3) {
                updateData = {
                    title: req.body.title,
                    edition: req.body.edition,
                    publisherID: req.body.publisher,
                    publishedYear: req.body.publishedYear,
                    description: req.body.description,
                    volume: req.body.volume,
                    issue: req.body.issue,
                    updated_by: userId
                }
            } else if (checkbookID.bookType == 2 || checkbookID.bookType == 1) {
                let pages;
                console.log(req.body.pages);
                if (req.body.pages == null) {
                    pages = '';
                } else {
                    pages = req.body.pages;
                }

                updateData = {
                    title: req.body.title,
                    authorID: req.body.author,
                    genreID: req.body.genres,
                    edition: req.body.edition,
                    pages: pages,
                    publisherID: req.body.publisher,
                    publishedYear: req.body.publishedYear,
                    description: req.body.description,
                    language: req.body.language,
                    updated_by: userId
                }

                
            } else {
                return next(new AppError("Invalid item type.", 500));
            }

            if (imgFrontData) {
                updateData.front_image = imgFrontData;
            }
            if (imgBackData) {
                updateData.back_image = imgBackData;
            }

            if (req.body.backImgCheck == 1) {
                updateData.back_image = "";
            }
            console.log(updateData); 
            const updateBook = await BookMaster.findByIdAndUpdate(req.body.bookId, updateData);
             
            if (updateBook) {

                let bookType;
                if (checkbookID.bookType == 1) {
                    bookType = "Book"
                } else if (checkbookID.bookType == 2) {
                    bookType = "Magazine"
                } else if (checkbookID.bookType == 3) {
                    bookType = "Journal"
                } else {}

                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                    userType = "Librarian"
                }

                let activity_data = [];
                
                if (checkbookID.title != req.body.title) {
                    activity_data.push(`<b>Title :</b> "${ checkbookID.title }" to "${ req.body.title }"`);
                }

                if ((checkbookID.publisherID.toString()).includes(req.body.publisher.toString()) == false) {

                    // let previousPublisherTitle = await PublisherMaster.findById(checkbookID.publisherID);

                    let oldPublisherTitle = await PublisherMaster.find({ "_id": { "$in": checkbookID.publisherID } }, {
                        "title": 1
                    });

                    let old_publisher = [];

                    for (const old of oldPublisherTitle) {
                        old_publisher.push(old.title.toString());
                    }

                    let newpublisherData = await BookMaster.findById(req.body.bookId, {
                        "publisherID": 1,
                    }).populate({
                        path: 'publisherID',
                        select: ['title']
                    });

                    let new_publisher = [];

                    for (const iterator of newpublisherData.publisherID) {
                        new_publisher.push(iterator.title.toString());
                    }

                    activity_data.push(`<b>Publisher:</b> "${ old_publisher.toString() }" to "${ new_publisher.toString() }"`)
                }

                if (checkbookID.edition != req.body.edition) {
                    activity_data.push(`<b>Edition :</b> "${ checkbookID.edition }" to "${ req.body.edition }"`);
                }

                if (checkbookID.description != req.body.description) {
                    activity_data.push(`<b>Description :</b> "${ checkbookID.description }" to "${ req.body.description }"`);
                }

                if (checkbookID.publishedYear != req.body.publishedYear) {
                    activity_data.push(`<b>Published Data :</b> "${ checkbookID.publishedYear }" to "${ req.body.publishedYear }"`);
                }

                let old_author = [];

                // if(checkbookID.bookType == 1){

                //     for (const auth of checkbookID.authorID) {
                      
                //         let oldAuthorTitle = await AuthorMaster.aggregate([{
                //         $match: {
                //                 deleted: 0,
                //                 $expr: { $eq: ['$_id', { $toObjectId: auth }] }
                //             },
                //             }, 
                //             {
                //                 $project: {
                //                     name: { $concat: ["$first_name", "$middle_name", "$last_name"] }
                //             }
                //         }]);

                //         old_author.push(oldAuthorTitle[0].name);
                //     }

                //     console.log(old_author);


                    // let oldAuthorTitle = await AuthorMaster.find({ "_id": { "$in": checkbookID.authorID } });
                    // let oldAuthorTitle = await AuthorMaster.aggregate([{
                    //     $match: {
                    //         deleted: 0,
                    //         $expr: { $eq: ['$_id', { $toObjectId: req.params.id }] }
                    //     },
                    // }, {
                    //     $project: {
                    //         name: { $concat: ["$first_name", "$middle_name", "$last_name"] }
                    //     }
                    // }]);

                    
                    
                    // for (const old of oldAuthorTitle) {
                    //     old_author.push(old.first_name + old.middle_name + old.last_name);
                    // }

                    // console.log(oldAuthorTitle);
                // }

                if (checkbookID.bookType == 1 || checkbookID.bookType == 2) {
                    
                    if (req.body.pages && (checkbookID.pages != req.body.pages)) {
                        activity_data.push(`<b>Pages :</b> "${ checkbookID.pages }" to "${ req.body.pages }"`);
                    }

                    if ((checkbookID.genreID.toString()).includes(req.body.genres) == false) {

                        let oldGenreTitle = await GenreMaster.find({ "_id": { "$in": checkbookID.genreID } }, {
                            "title": 1
                        });

                        let old_Genre = [];

                        for (const old of oldGenreTitle) {
                            old_Genre.push(old.title.toString());
                        }

                        let newGenreData = await BookMaster.findById(req.body.bookId, {
                            "genreID": 1,
                        }).populate({
                            path: 'genreID',
                            select: ['title']
                        });

                        activity_data.push(`<b>Category:</b> "${ old_Genre.toString() }" to "${ newGenreData.genreID.title }"`)
                    }
                    
                    if (checkbookID.language != req.body.language) {
                        activity_data.push(`<b>Language :</b> "${ checkbookID.language }" to "${ req.body.language }"`);
                    }
                }

                if(checkbookID.bookType == 3){
                    if (checkbookID.volume != req.body.volume) {
                        activity_data.push(`<b>Volume :</b> "${ checkbookID.volume }" to "${ req.body.volume }"`);
                    }

                    if (checkbookID.issue != req.body.issue) {
                        activity_data.push(`<b>Issue :</b> "${ checkbookID.issue }" to "${ req.body.issue }"`);
                    }
                }
                

                const clientIp = requestIp.getClientIp(req);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Update Book",
                    operationType: `${ bookType } Updated - <a href="/books/book-details/${req.body.bookId}"> <b>${checkbookID.title}</b></a> <p>${ activity_data } </p>`,
                    userType: userType,
                    created_by: userId
                });

                const data = {
                    id: updateBook._id,
                };

                response.createResponse({
                    message: "Data successfully updated.",
                    book: data,
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
});

exports.storeBookStock = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let bookQuantity = '';

    const getBookQuantity = +req.body.quantity;

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.bookId) {
        return next(new AppError("Item details not found", 500));
    }

    const checkbookID = await BookMaster.findById(req.body.bookId, {
        deleted: 0
    });

    if (checkbookID) {
        try {

            if (checkbookID.quantity == "" || checkbookID.quantity == null) {
                bookQuantity = getBookQuantity;
            } else {
                bookQuantity = getBookQuantity + (+checkbookID.quantity);
            }

            const updateBook = await BookMaster.findByIdAndUpdate(req.body.bookId, {
                quantity: bookQuantity,
                updated_by: userId
            });

            if (updateBook) {

                let refNumber = '';
                const loopArray = new Array(getBookQuantity);
                for (const iterator of loopArray) {

                    await BookDetailsMaster.create({
                        libraryID: req.body.libraryID,
                        bookID: req.body.bookId,
                        bookIssueStatus: 0,
                        bookStatus: 1,
                        created_by: userId
                    });
                }

                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                    userType = "Librarian"
                }

                let bookType;

                if(checkbookID.bookType == 1){
                    bookType = "Book";
                } else if(checkbookID.bookType == 2){
                    bookType = "Magazine";
                } else if(checkbookID.bookType == 3) {
                    bookType = "Journal";
                } else {

                }

                const clientIp = requestIp.getClientIp(req);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Book Stock Add",
                    operationType: `${ bookType } Stock Added - <a href="/books/book-details/${req.body.bookId}"> <b>${checkbookID.title}</b></a> <b>Quantity:</b> ${ bookQuantity }`,
                    userType: userType,
                    created_by: userId
                });

                const data = {
                    id: updateBook._id,
                    bookName: updateBook.title,
                    totalQuantity: bookQuantity
                };

                response.createResponse({
                    message: "Stock added successfully.",
                    book: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }
    } else {
        return next(new AppError("Item details not found.", 500));
    }
});

exports.findBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const bookDetails = await BookMaster.find({
        _id: req.params.id,
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
        "quantity": 1,
        "availableQuantity": 1,
        "issue": 1,
        "volume": 1,
        "rating": 1,
        "bookType": 1
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name', 'profile_image', 'description', 'status']
    }).populate({
        path: 'publisherID',
        select: ['title', 'status']
    }).populate({
        path: 'genreID',
        select: ['title']
    }).sort({ createdAt: -1 });

    if (bookDetails.length > 0) {

        const checkBookAssigned = await BookDetailsMaster.find({
            bookID: req.params.id,
            rackManagementID: { $ne: null },
            status: 1,
            deleted: 0
        });

        const checkBookIssued = await BookDetailsMaster.find({
            bookID: req.params.id,
            rackManagementID: { $ne: null },
            bookIssueStatus: 1,
            status: 1,
            deleted: 0
        });

        const checkBookrating = await Bookrating.find({
            bookMasterID: req.params.id,
            active: 1,
            status: 1,
            deleted: 0,
        }, {
            "rating": 1,
            "review": 1,
            "createdAt": 1,
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

        const checkBookreview = await Bookrating.find({
            bookMasterID: req.params.id,
            review: { $ne: null },
            active: 1,
            status: 1,
            deleted: 0
        });

        const oneStar = await Bookrating.find({
            bookMasterID: req.params.id,
            rating: 1,
            active: 1,
            status: 1,
            deleted: 0
        });

        const twoStar = await Bookrating.find({
            bookMasterID: req.params.id,
            rating: 2,
            active: 1,
            status: 1,
            deleted: 0
        });

        const fiveStar = await Bookrating.find({
            bookMasterID: req.params.id,
            rating: 5,
            active: 1,
            status: 1,
            deleted: 0
        });

        const threeStar = await Bookrating.find({
            bookMasterID: req.params.id,
            rating: 3,
            active: 1,
            status: 1,
            deleted: 0
        });

        const fourStar = await Bookrating.find({
            bookMasterID: req.params.id,
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
            message: `Item Details`,
            bookData: bookDetails,
            bookAssigned: checkBookAssigned.length,
            bookIssued: checkBookIssued.length,
            ratingCount: checkBookrating.length,
            reviewCount: checkBookreview.length,
            oneStarPercentage: oneStarPercentage,
            twoStarPercentage: twoStarPercentage,
            threeStarPercentage: threeStarPercentage,
            fourStarPercentage: fourStarPercentage,
            fiveStarPercentage: fiveStarPercentage,
            oneStar: oneStar.length,
            twoStar: twoStar.length,
            threeStar: threeStar.length,
            fourStar: fourStar.length,
            fiveStar: fiveStar.length,
            ratingArray: arr
        });
    } else {
        return next(new AppError("Item details not found.", 500));
    }

});

exports.issueBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    /* const existingSettingByDetails = await SettingMaster.findOne({
        status: 1,
        deleted: 0
    });

    if (existingSettingByDetails && existingSettingByDetails.bookReturnDays != null) {
        if (existingSettingByDetails && existingSettingByDetails.maximumBookIssued != null) {
            let bookReturnDays = existingSettingByDetails.bookReturnDays;
            let maximumBookIssued = existingSettingByDetails.maximumBookIssued;

            const checkUserIssuedBook = await BookIssue.find({
                employeeID: req.body.employeeID,
                bookReturnStatus: 0,
                status: 1,
                deleted: 0
            });

            if (checkUserIssuedBook.length < maximumBookIssued) {

                
            } else {
                return next(new AppError("Maximum Item already issued.", 500));
            }
        } else {
            return next(new AppError("Please set maximum item issued in the setting menu.", 500));
        }
    } else {
        return next(new AppError("Please set return days in the setting menu.", 500));
    } */


    try {
        const checkQrCodeDetails = await QrCodeDetails.findById(req.body.qrCodeDetailID, {
            deleted: 0
        });
        
        if (checkQrCodeDetails && checkQrCodeDetails.isAssigned == 1) {

            const getMasterBookId = await BookDetailsMaster.findById(checkQrCodeDetails.bookDetailMasterId, {
                deleted: 0
            });  

            if (getMasterBookId) {

                if (getMasterBookId.bookStatus == 4) {
                    return next(new AppError("This item is reported as lost", 500));
                }

                if (getMasterBookId.bookIssueStatus != 1) {
                    
                    const checkQuantity = await BookMaster.findById(getMasterBookId.bookID, {
                        deleted: 0
                    });
                    if(checkQuantity){
                        
                        let itemType = checkQuantity.bookType;
                        let magazine_type = checkQuantity.magazine_type;
                        const filterObject = {};

                        filterObject["itemType"] = +itemType;

                        if (itemType == 2) {
                            filterObject["itemTypeType"] = magazine_type
                        }
                        const ItemSettingsDetails = await ItemSettings.findOne(filterObject);
                        if(ItemSettingsDetails){
                            let bookReturnDays = ItemSettingsDetails.returnPeriod;
                            let maximumBookIssued = ItemSettingsDetails.itemIssue;
                            // Get user authorization type
                            const employeeDetails = await User.findById(req.body.employeeID, {
                                deleted: 0
                            });
                            if(employeeDetails){
                                const filterIssueObject = {};

                                filterIssueObject["bm.bookType"] = +itemType;
                                filterIssueObject["employeeID"] = ObjectId(req.body.employeeID);
                                filterIssueObject["bookReturnStatus"] = 0;
                                filterIssueObject["status"] = 1;
                                filterIssueObject["deleted"] = 0;
        
                                if (itemType == 2) {
                                    filterIssueObject["bm.magazine_type"] = magazine_type
                                } 
                                // Total specific item issued to the employee
                                const checkUserIssuedBook = await BookIssue.find({
                                    employeeID: req.body.employeeID,
                                    bookReturnStatus: 0,
                                    status: 1,
                                    deleted: 0
                                });

                                const checkUserIssuedItemWise = await BookIssue.aggregate([                              
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
                                            as: "bm"
                                        },
                                    },
                                    { $unwind: { path: "$employeeID", preserveNullAndEmptyArrays: true } },
                                    { $unwind: { path: "$bookID", preserveNullAndEmptyArrays: true } },
                                    { $unwind: { path: "$bookDetails.bookID", preserveNullAndEmptyArrays: true } },
                                    {
                                        $match: filterIssueObject
                                    },
                                    {
                                        $project: {
                                            "bm.title": 1,
                                            "bm.bookType": 1,
                                            "bm._id": 1,
                                            "employeeID":1,
                                            "bookReturnStatus":1
                                        }
                                    }
                                ]);
                                let authorization_type = employeeDetails.authorization_type;
                                let notification_type = employeeDetails.notification_type;
                                let is_item_issuable = 0;

                                if(authorization_type == 1){
                                    is_item_issuable = 1;
                                }else if(maximumBookIssued > checkUserIssuedItemWise.length){
                                    is_item_issuable = 1;
                                }else{
                                    is_item_issuable = 0;
                                    return next(new AppError("Maximum Items already issued.", 500));
                                }
                                if(is_item_issuable == 1){
                                    if (checkQuantity && checkQuantity.availableQuantity > 0) {

                                        let pushArray = [];
                
                                        for (const iterator of checkUserIssuedBook) {
                
                                            const checkIssue = await BookDetailsMaster.findById(iterator.bookID, {
                                                deleted: 0
                                            });
                
                                            pushArray.push(checkIssue.bookID.toString());
                                        }
                
                                        const checkExistBook = pushArray.includes(checkQuantity._id.toString());
                                        if (checkExistBook) {
                                            return next(new AppError("Item already issued.", 500));
                                        }

                                        const issueBookinsert = await BookIssue.create({
                                            libraryID: req.body.libraryID,
                                            bookID: getMasterBookId._id,
                                            employeeID: req.body.employeeID,
                                            issueDate: new Date(),
                                            returnDate: new Date(new Date().getTime() + (bookReturnDays * 24 * 60 * 60 * 1000)),
                                            created_by: userId
                                        });
                
                                        await BookMaster.findByIdAndUpdate(getMasterBookId.bookID, {
                                            availableQuantity: (+checkQuantity.availableQuantity) - 1,
                                            updated_by: userId
                                        });
                
                                        await BookDetailsMaster.findByIdAndUpdate(getMasterBookId._id, {
                                            bookIssueStatus: 1,
                                            updated_by: userId
                                        });
                
                                        if (!req.body.requestID) {
                                            const checkRequestStatus = await BookRequest.findOne({
                                                bookRequestStatus: 1,
                                                bookID: getMasterBookId.bookID,
                                                employeeID: req.body.employeeID,
                                                deleted: 0,
                                            });
                
                                            if (checkRequestStatus) {
                                                await BookRequest.findByIdAndUpdate(checkRequestStatus._id, {
                                                    bookRequestStatus: 2,
                                                    bookIssueId: issueBookinsert._id,
                                                    updated_by: userId
                                                });
                                            }
                                        } else {
                                            await BookRequest.findByIdAndUpdate(req.body.requestID, {
                                                bookRequestStatus: 2,
                                                bookIssueId: issueBookinsert._id,
                                                updated_by: userId
                                            });
                                        }
                
                                        if (issueBookinsert) {
                
                                            let userType;
                                            if (req.user.user_role == 1) {
                                                userType = "Admin"
                                            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                                                userType = "Librarian"
                                            }
                
                                            const clientIp = requestIp.getClientIp(req);
                
                                            await Activity.create({
                                                ipAddress: clientIp,
                                                pageDetail: "Item Issued",
                                                operationType: "Item Issued",
                                                userType: userType,
                                                created_by: userId
                                            });
                
                                            await Notification.create({
                                                user_id: userId,
                                                notification_for: req.body.employeeID,
                                                notificationRole: 2,
                                                notification_type: "Item Issued",
                                                message: `${checkQuantity.title} has been successfully issued.`,
                                                created_by: userId
                                            });
                
                                            const empName = await User.findById(req.body.employeeID, {
                                                deleted: 0
                                            });
                
                                            let bookType;
                
                                            if (checkQuantity.bookType == 1) {
                                                bookType = 'Book';
                                            } else if (checkQuantity.bookType == 2) {
                                                bookType = 'Magazine';
                                            } else {
                                                bookType = 'Journal';
                                            }
                                            // According to notification we need to choose the medium like email(0) or SMS(1)
                                            if(notification_type == 0){
                                                const subject = `${ bookType } Issued | OMC Reads`;
                                                const textContent = `${ bookType } Issued`;
                                                const name = empName.name;
                                                const email = empName.email;
                                                const html = `<p><strong>${checkQuantity.title}</strong> is successfully issued.</p><br/>`;
                    
                                                helper.sendMail(subject, textContent, name, email, html);
                                            }else{
                                                // Send SMS
                                            }                                           
                
                                            const data = {
                                                id: issueBookinsert._id,
                                            };
                
                                            response.createResponse({
                                                message: "Item issued successfully",
                                                issue: data,
                                            });
                                        } else {
                                            return next(new AppError("Something went wrong", 500));
                                        }
                                    } else {
                                        return next(new AppError("Item quantity not available.", 500));
                                    }
                                }
                            }else{
                                return next(new AppError("Employee details not found.", 500));
                            }
                        }else{
                            return next(new AppError("Item settings are not defined for this type.", 500));
                        }                                        
                    }else{
                        return next(new AppError("Item details not available.", 500));                    
                    }

                    return;
                    

                } else {
                    return next(new AppError("Item already issued.", 500));
                }
            }else{
                return next(new AppError("Item details not found", 500));
            }
            
        } else {
            return next(new AppError("QR Code not assigned.", 500));
        }

    } catch (err) {
        return next(new AppError(err, 500));
    }


});

exports.bookDamaged = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.bookID == "") {
        return next(new AppError("Item details not found", 500));
    }

    try {

        const bookTransactionData = await BookDetailsMaster.findById(req.body.bookID, {
            deleted: 0
        });

        if (bookTransactionData && bookTransactionData.bookIssueStatus == 1) {

            return next(
                new AppError(
                    "Unable to change the damage status of the item. Transactional data already exist",
                    500, {
                        type: "book_transaction_exist",
                    }
                )
            );
        }

        const damageBookStatus = await BookDetailsMaster.findByIdAndUpdate(req.body.bookID, {
            deleted: 1,
            updated_by: userId
        });

        if (damageBookStatus) {

            const data = {
                id: damageBookStatus._id,
            };

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Damage Book",
                operationType: "Damage Book",
                userType: userType,
                created_by: userId
            });

            response.createResponse({
                message: "Item status changed successfully.",
                book: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.requestBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.bookID == "") {
        return next(new AppError("Item details not found", 500));
    }

    try {

        const bookAvailabilityData = await BookMaster.findById(req.body.bookID, {
            deleted: 0
        });

        if (bookAvailabilityData && bookAvailabilityData.availableQuantity > 0) {

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
                        user_role: { $in: [1, 2] },
                        deleted: 0
                    }, {
                        "_id": 1
                    });

                    await Notification.create({
                        user_id: userId,
                        notification_for: getUserIdFromRole,
                        notification_type: "Book Request",
                        message: `${getUser.name} has requested the book for ${bookname.title}`,
                        created_by: userId
                    });

                    const clientIp = requestIp.getClientIp(req);

                    await Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Book Request",
                        operationType: "Book Request",
                        userType: userType,
                        created_by: userId
                    });

                    const data = {
                        id: requestBook._id,
                    };

                    response.createResponse({
                        message: "Item requested successfully.",
                        book: data,
                    });
                } else {
                    return next(new AppError("Something went wrong", 500));
                }

            } else {
                return next(new AppError("Item already requested", 500));
            }

        } else {

            return next(
                new AppError(
                    "Book not available",
                    500, {
                        type: "book_not_available",
                    }
                )
            );
        }

    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.bookRequestListing = catchAsync(async(req, res, next) => {
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
                $project: {
                    "createdAt": 1,
                    "employeeID.email": 1,
                    "employeeID.name": 1,
                    "employeeID.mobile": 1,
                    "bookID.title": 1,
                    "bookID._id": 1,
                    "bookID.availableQuantity": 1,
                    "bookID.bookType": 1,
                    "bookID._id": 1
                }
            }
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookRequest.find({
        bookRequestStatus: 1,
        status: 1,
        deleted: 0,
    });


    response.successResponse({
        message: `Total request count= ${ books.length }`,
        requestList: books,
        bookCount: bookCount.length
    });

});

exports.bookRequestDetails = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    const checkReqDetails = await BookRequest.findById(req.params.id, {
        deleted: 0
    });

    if (checkReqDetails) {

        const bookname = await BookMaster.findById(checkReqDetails.bookID, {
            deleted: 0
        }, {
            "availableQuantity": 1
        });

        if (!bookname.availableQuantity) {
            return next(new AppError("Item Not Available.", 500));
        }

        const requestBookDetails = await BookRequest.aggregate([{
                $match: {
                    status: 1,
                    deleted: 0,
                    $expr: { $eq: ['$_id', { $toObjectId: req.params.id }] }
                },
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
                $project: {
                    "createdAt": 1,
                    "employeeDetails.email": 1,
                    "employeeDetails.name": 1,
                    "employeeDetails.mobile": 1,
                    "employeeDetails._id": 1,
                    "employeeDetails.employee_id": 1,
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails.quantity": 1,
                    "bookMasterDetails.availableQuantity": 1,
                    "bookMasterDetails.description": 1,
                    "bookMasterDetails._id": 1,
                    "departmentDetails.departmentName": 1,
                    "departmentDetails._id": 1,
                    "designationDetails.designationName": 1,
                    "designationDetails._id": 1
                }
            }
        ]);

        const bookCopiesDetails = await BookDetailsMaster.aggregate([{
                $match: {
                    $expr: { $eq: ['$bookID', { $toObjectId: checkReqDetails.bookID }] },
                    bookIssueStatus: 0,
                    rackManagementID: { $ne: null },
                    deleted: 0
                }
            },
            {
                $lookup: {
                    from: "qrcodedetails",
                    localField: "_id",
                    foreignField: "bookDetailMasterId",
                    as: "qrCodeDetails"
                },
            },
            {
                $project: {
                    "qrCodeDetails._id": 1
                }
            },
            { $unwind: { path: "$qrCodeDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "rackmanagements",
                    localField: "qrCodeDetails._id",
                    foreignField: "qrCodeID",
                    as: "locationDetails"
                },
            },
            {
                $project: {
                    "locationDetails.rackID": 1,
                    "locationDetails.shelfID": 1
                }
            },
            { $unwind: { path: "$locationDetails", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { rackID: "$locationDetails.rackID", shelfID: "$locationDetails.shelfID" },
                    copies: { $sum: 1 },
                    doc: {
                        $push: "$$ROOT"
                    }
                }
            },
            {
                $project: {
                    rackName: "$_id.rackID",
                    shelfName: "$_id.shelfID",
                    copies: "$copies",
                    data: {
                        $map: {
                            input: "$doc",
                            as: "count",
                            in: {
                                $mergeObjects: [
                                    "$$count",
                                    {
                                        copies: "$copies"
                                    }
                                ]
                            },
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "rackmasters",
                    localField: "rackName",
                    foreignField: "_id",
                    as: "rackDetails"
                },
            },
            {
                $lookup: {
                    from: "shelfmasters",
                    localField: "shelfName",
                    foreignField: "_id",
                    as: "shelfDetails"
                },
            },
            {
                $addFields: {
                    rackName: "$rackDetails.rackName",
                    shelfName: "$shelfDetails.shelfName",
                }
            },
            { $unwind: { path: "$rackName", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$shelfName", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    "rackName": 1,
                    "shelfName": 1,
                    "copies": 1,
                    "_id": 0
                }
            },
        ]);

        let availableBook;

        if (bookCopiesDetails.length > 0) {
            availableBook = bookCopiesDetails;
        } else {
            availableBook = [];
        }

        if (requestBookDetails.length > 0) {
            response.successResponse({
                requestBookDetails: requestBookDetails,
                availableBook: bookCopiesDetails
            });
        } else {
            return next(new AppError("Request details not found.", 500));
        }
    } else {
        return next(new AppError("Request details not found.", 500));
    }
});

exports.addQrCodeQuantity = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const quantity = +req.body.quantity;

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!quantity) {
        return next(new AppError("Invalid quantity", 500));
    }

    const unassignedBook = await BookDetailsMaster.find({
        rackManagementID: null,
        deleted: 0
    });

    const remainingQrcode = await QrCodeDetails.find({
        bookDetailMasterId: null,
        deleted: 0
    });

    const total_book_unassigned = unassignedBook.length;
    const tot_qr_code_unassigned = remainingQrcode.length;
    const tot_qr_code_can_assign = (+total_book_unassigned) - (+tot_qr_code_unassigned);

    if (quantity <= tot_qr_code_can_assign) {
        try {

            const createQrCodeData = await QrCode.create({
                quantity: quantity,
                created_by: userId
            });

            const loopArray = new Array(quantity);
            for (const iterator of loopArray) {

                const bookRefMasterCheck = await QrCodeDetails.find({});

                if (bookRefMasterCheck.length > 0) {

                    let lastRecordBookDetails = await QrCodeDetails.findOne({}, {
                        'bookReferenceNumber': 1
                    }).sort({ createdAt: -1 });

                    refNumber = (+lastRecordBookDetails.bookReferenceNumber) + 1;

                    await BookReferenceUniqueNumberMaster.updateOne({
                        bookRefNumber: refNumber,
                        updated_by: userId
                    });

                } else {

                    refNumber = 11111;

                    await BookReferenceUniqueNumberMaster.create({
                        bookRefNumber: refNumber,
                        created_by: userId
                    });
                }

                const createQrCode = await QrCodeDetails.create({
                    qrCodeId: createQrCodeData._id,
                    bookReferenceNumber: refNumber,
                    created_by: userId
                });

                let myObjectIdString = createQrCode._id.toString()

                //Get the base64 url

                const src = await qrCode.toDataURL(myObjectIdString);

                let base64Data = src.replace(/^data:image\/png;base64,/, "");

                let imageName = `${Math.floor(Math.random() * 10000)}${Date.now()}.png`;
                let imagePath = "images/qrCode/" + imageName;

                await writeFileAsync("images/qrCode/" + imageName, base64Data, 'base64');

                await QrCodeDetails.findByIdAndUpdate(createQrCode._id, {
                    qrCodePath: imagePath,
                    updated_by: userId
                });

            }

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Generate Qr Code",
                operationType: `Qr Code Generated of Quantity <b>${ quantity }</b>`,
                userType: userType,
                created_by: userId
            });

            response.createResponse({
                message: "QR code generated successfully."
            });

        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }

    } else {
        if (quantity > total_book_unassigned) {
            return next(
                new AppError(`Unable to generate Qrcode as ${ unassignedBook.length } book stocks are there.`, 400, { type: "quantity limit exceed" })
            );
        } else {
            return next(
                new AppError(`Qr code generated but not assigned.`, 400, { type: "quantity limit exceed" })
            );
        }

    }

});

exports.qrCodeList = catchAsync(async(req, res, next) => {

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

    const filterObject1 = {};
    const filterObject2 = {};
    const filterObject3 = {};
    if (req.body.bookReferenceNumber) {
        filterObject1['bookReferenceNumber'] = { $regex: req.body.bookReferenceNumber, "$options": "i" }
            //filterObject1['bookReferenceNumber'] = +req.body.bookReferenceNumber;
    }
    if (req.body.bookName) {
        filterObject3['bookMasterDetails.title'] = { $regex: req.body.bookName, "$options": "i" }
            //filterObject1['bookMasterDetails.title'] = { $regex: req.body.bookName, "$options": "i" }
            //filterObject1['title'] = { $regex: req.body.bookName, "$options": "i" }
    }
    if (req.body.status) {
        filterObject2['isAssigned'] = +req.body.status
            //filterObject['isAssigned'] = 1
    }

    const match_filter = { $or: [filterObject1, filterObject3] };
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
                $match: filterObject2
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
                    "bookDetails.bookStatus": 1,
                    "type.name": 1
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
            $match: match_filter
        },
        {
            $match: filterObject2
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


    if (qrCodeDetails.length > 0) {
        response.successResponse({
            totalData: qrCodeDetails.length,
            bookCount: bookCount.length,
            qrCodeDetails: qrCodeDetails
        });
    } else {
        return next(new AppError("Qr code details not found.", 500));
    }

});

exports.addRackManagement = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    const rackAvailabilityData = await RackMaster.findById(req.body.rackID, {
        deleted: 0
    });

    if (!rackAvailabilityData) {
        return next(new AppError("Rack details not found.", 500));
    }

    const shelfAvailabilityData = await ShelfMaster.findById(req.body.shelfID, {
        deleted: 0
    });

    if (!shelfAvailabilityData) {
        return next(new AppError("Shelf details not found.", 500));
    }

    const bookAvailabilityData = await BookMaster.findById(req.body.bookID, {
        deleted: 0
    });

    if (!bookAvailabilityData) {
        return next(new AppError("Item details not found.", 500));
    }

    const qrCodeAvailabilityData = await QrCodeDetails.findById(req.body.qrCodeDetailsID, {
        deleted: 0
    });

    if (!qrCodeAvailabilityData) {
        return next(new AppError("QR code details not found.", 500));
    }

    const existingQrCodeByName = await RackManagement.findOne({
        qrCodeID: req.body.qrCodeDetailsID,
        status: 1,
        deleted: 0
    });

    if (existingQrCodeByName) {
        return next(
            new AppError("QR code already assigned", 400, { type: "duplicate qr code" })
        );
    }

    const checkBookAvailability = await BookDetailsMaster.find({
        bookID: req.body.bookID,
        rackManagementID: null,
        status: 1,
        deleted: 0
    });

    if (checkBookAvailability.length < 1) {
        return next(
            new AppError("item copies not available", 400)
        );
    }

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    try {

        const mapQrCode = await RackManagement.create({
            rackID: req.body.rackID,
            shelfID: req.body.shelfID,
            bookID: req.body.bookID,
            bookType: req.body.type,
            qrCodeID: req.body.qrCodeDetailsID,
            bookRefNo: req.body.refId,
            created_by: userId
        });

        if (mapQrCode) {

            const bookDetailsAvailabilityData = await BookDetailsMaster.findOneAndUpdate({
                bookID: req.body.bookID,
                rackManagementID: null,
                status: 1,
                deleted: 0
            }, { $set: { "rackManagementID": mapQrCode._id } });

            const updateQrCode = await QrCodeDetails.findByIdAndUpdate(req.body.qrCodeDetailsID, {
                isAssigned: 1,
                bookDetailMasterId: bookDetailsAvailabilityData._id,
                updated_by: userId
            });

            await BookDetailsMaster.findByIdAndUpdate(bookDetailsAvailabilityData._id, {
                bookReferenceNumber: updateQrCode.bookReferenceNumber,
                updated_by: userId
            });

            let avlQty = 0;

            if (bookAvailabilityData.availableQuantity) {
                avlQty = bookAvailabilityData.availableQuantity + 1;
            } else {
                avlQty = 1;
            }

            if (bookAvailabilityData.assignedQuantity) {
                assignedQuantity = bookAvailabilityData.assignedQuantity + 1;
            } else {
                assignedQuantity = 1;
            }

            await BookMaster.findByIdAndUpdate(req.body.bookID, {
                availableQuantity: avlQty,
                assignedQuantity: assignedQuantity,
                updated_by: userId
            });

            const clientIp = requestIp.getClientIp(req);

            let bookType;

            if(req.body.type == 1){
                bookType = "Book";
            } else if(req.body.type == 2){
                bookType = "Magazine";
            } else {
                bookType = "Journal";
            }

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            }

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Rack Management",
                operationType: `Rack Management Update - <b>${ bookAvailabilityData.title }</b> ${ bookType} has been mapped to rack - <b>${rackAvailabilityData.rackName}</b> and shelf - <b>${shelfAvailabilityData.shelfName}</b> with reference no.<b>${ req.body.refId }</b>`,
                userType: userType,
                created_by: userId
            });
        }

        response.createResponse({
            message: "Item mapped successfully."
        });

    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }

});

exports.bookIssueListing = catchAsync(async(req, res, next) => {

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
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookIssue.find({
        bookReturnStatus: 0,
        status: 1,
        deleted: 0,
    });


    if (issueDetails.length > 0) {
        response.successResponse({
            todayDate: new Date(),
            totalIssue: issueDetails.length,
            issueDetails: issueDetails,
            bookCount: bookCount.length
        });
    } else {
        return next(new AppError("Issue details not found.", 500));
    }

});

exports.bookReturnListing = catchAsync(async(req, res, next) => {

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
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookIssue.find({
        bookReturnStatus: 1,
        status: 1,
        deleted: 0,
    });

    if (returnDetails.length > 0) {
        response.successResponse({
            totalReturn: returnDetails.length,
            returnDetails: returnDetails,
            bookCount: bookCount.length
        });
    } else {
        return next(new AppError("Return details not found.", 500));
    }

});

exports.rackManagementListing = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

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
            $project: {
                "bookDetails.bookReferenceNumber": 1,
                "bookDetails._id": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.bookType": 1,
                "rackDetails.rackName": 1,
                "shelfDetails.shelfName": 1,
                "qrCodeDetailsData.qrCodePath": 1
            }
        }
    ]);


    if (rackManagementDetails.length > 0) {
        response.successResponse({
            rackManagementDetails: rackManagementDetails
        });
    } else {
        return next(new AppError("Rack Management details not found.", 500));
    }

});

exports.bookStockList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const bookDetailsList = await BookDetailsMaster.find({
        bookID: req.params.id,
        deleted: 0,
    }, {
        "bookReferenceNumber": 1,
        "bookIssueStatus": 1,
        "bookStatus": 1,
    }).populate({
        path: 'bookID',
        select: ['title', 'bookType']
    }).sort({ createdAt: -1 });

    if (bookDetailsList.length > 0) {
        response.successResponse({
            message: `Total Book Details : ${bookDetailsList.length}`,
            bookData: bookDetailsList
        });
    } else {
        response.successResponse({
            message: `Item details not found`,
            bookData: []
        });
    }
});

exports.bookIssueDetails = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    const issueDetails = await BookIssue.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                $expr: { $eq: ['$_id', { $toObjectId: req.params.id }] },
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
                from: "rackmanagements",
                localField: "bookDetails.rackManagementID",
                foreignField: "_id",
                as: "rackMasterDetails"
            },
        },
        {
            $lookup: {
                from: "rackmasters",
                localField: "rackMasterDetails.rackID",
                foreignField: "_id",
                as: "rackDetails"
            },
        },
        {
            $lookup: {
                from: "shelfmasters",
                localField: "rackMasterDetails.shelfID",
                foreignField: "_id",
                as: "shelfDetails"
            },
        },
        {
            $lookup: {
                from: "qrcodedetails",
                localField: "bookDetails._id",
                foreignField: "bookDetailMasterId",
                as: "qrCodeDetails"
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
            $project: {
                "issueDate": 1,
                "returnDate": 1,
                "remark": 1,
                "bookStatus": 1,
                "bookReturnStatus": 1,
                "updatedAt": 1,
                "bookDetails.bookReferenceNumber": 1,
                "bookMasterDetails.title": 1,
                "bookMasterDetails.bookType": 1,
                "bookMasterDetails.edition": 1,
                "bookMasterDetails.front_image": 1,
                "employeeDetails.email": 1,
                "employeeDetails.name": 1,
                "employeeDetails.mobile": 1,
                "employeeDetails.employee_id": 1,
                "departmentDetails.departmentName": 1,
                "designationDetails.designationName": 1,
                "authorMasterDetails.first_name": 1,
                "authorMasterDetails.middle_name": 1,
                "authorMasterDetails.last_name": 1,
                "publishermastersDetails.title": 1,
                "qrCodeDetails._id": 1,
                "rackDetails.rackName": 1,
                "shelfDetails.shelfName": 1
            }
        }
    ]);

    if (issueDetails.length > 0) {

        const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        const firstDate = new Date(issueDetails[0].returnDate);
        const secondDate = new Date();
        let diffDays;

        if (firstDate < secondDate) {
            diffDays = Math.round(Math.abs((firstDate - secondDate) / oneDay));
        } else {
            diffDays = '0';
        }

        response.successResponse({
            parameter: req.params.parameter,
            issueDetails: issueDetails,
            overDueDate: diffDays
        });
    } else {
        return next(new AppError("Issue details not found.", 500));
    }

});

// exports.returnBook = catchAsync(async(req, res, next) => {
//     const response = new AppSuccess(res);
//     let userId = '';

//     if (req.user) {
//         userId = req.user._id;
//     } else {
//         userId = "";
//     }

//     const getqrCodeDetails = await QrCodeDetails.findById(req.body.qrCodeID, {
//         deleted: 0
//     });

//     if (getqrCodeDetails && getqrCodeDetails.isAssigned == 1) {

//         const getDetailsBookId = await BookDetailsMaster.findById(getqrCodeDetails.bookDetailMasterId, {
//             deleted: 0
//         });

//         if (getDetailsBookId && getDetailsBookId.bookIssueStatus == 1) {

//             const checkIssue = await BookIssue.findOne({
//                 bookID: getDetailsBookId._id,
//                 bookReturnStatus: 0,
//                 deleted: 0
//             });

//             if (checkIssue && checkIssue.bookReturnStatus == 0) {
//                 const updateIssue = await BookIssue.findByIdAndUpdate(checkIssue._id, {
//                     bookReturnStatus: 1,
//                     bookStatus: req.body.bookStatus,
//                     remark: req.body.remark,
//                     updated_by: userId
//                 });

//                 const updateAndFindMasterBookId = await BookDetailsMaster.findByIdAndUpdate(checkIssue.bookID, {
//                     bookIssueStatus: 0,
//                     bookStatus: req.body.bookStatus,
//                     remark: req.body.remark,
//                     updated_by: userId
//                 });

//                 if (req.body.bookStatus == 3) {
//                     await BookDamage.create({
//                         bookdetailsMasterId: checkIssue.bookID,
//                         remark: req.body.remark,
//                         created_by: userId
//                     });
//                 }

//                 const checkQuantity = await BookMaster.findById(updateAndFindMasterBookId.bookID, {
//                     deleted: 0
//                 });

//                 const updateBook = await BookMaster.findByIdAndUpdate(checkQuantity.id, {
//                     availableQuantity: (+checkQuantity.availableQuantity) + 1,
//                     updated_by: userId
//                 });

//                 if (updateBook) {

//                     await Notification.create({
//                         user_id: userId,
//                         notification_for: updateIssue.employeeID,
//                         notification_type: "Book Return",
//                         message: `${updateBook.title} has been successfully returned`,
//                         created_by: userId
//                     });

//                     const data = {
//                         issueID: checkIssue._id,
//                     };

//                     response.createResponse({
//                         message: "Book returned successfully",
//                         issue: data,
//                     });
//                 } else {
//                     return next(new AppError("Something went wrong", 500));
//                 }
//             } else {
//                 return next(new AppError("Issue details not found.", 500));
//             }

//         } else {
//             return next(new AppError("Book not issued.", 500));
//         }

//     } else {
//         return next(new AppError("Issue details not found.", 500));
//     }
// });

exports.bookQrCodeIssueDetails = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    const getqrCodeDetails = await QrCodeDetails.findById(req.params.id, {
        deleted: 0
    });

    if (getqrCodeDetails && getqrCodeDetails.isAssigned == 1) {

        const getDetailsBookId = await BookDetailsMaster.findById(getqrCodeDetails.bookDetailMasterId, {
            deleted: 0
        });

        if (getDetailsBookId && getDetailsBookId.bookStatus == 4) {
            return next(new AppError("This item is reported as lost", 500));
        }

        const checkIssue = await BookIssue.findOne({
            bookID: getDetailsBookId._id,
            bookReturnStatus: 0,
            deleted: 0
        });

        if (checkIssue) {

            let status = "";

            if (checkIssue.bookReturnStatus == 0) {
                status = "Issued";
            } else {
                status = "Returned";
            }

            const issueDetails = await BookIssue.aggregate([
                { $sort: { "createdAt": -1 } },
                {
                    $match: {
                        $expr: { $eq: ['$_id', { $toObjectId: checkIssue._id }] },
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
                {
                    $lookup: {
                        from: "departmentmasters",
                        localField: "employeeDetails.department",
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
                    $project: {
                        "issueDate": 1,
                        "returnDate": 1,
                        "bookDetails.bookReferenceNumber": 1,
                        "bookMasterDetails.title": 1,
                        "bookMasterDetails.edition": 1,
                        "employeeDetails.email": 1,
                        "employeeDetails.name": 1,
                        "employeeDetails.mobile": 1,
                        "employeeDetails.employee_id": 1,
                        "departmentDetails.departmentName": 1,
                        "designationDetails.designationName": 1,
                        "authorMasterDetails.first_name": 1,
                        "authorMasterDetails.middle_name": 1,
                        "authorMasterDetails.last_name": 1,
                        "publishermastersDetails.title": 1
                    }
                }
            ]);


            if (issueDetails.length > 0) {
                response.successResponse({
                    status: status,
                    qrCodeID: req.params.id,
                    issueDetails: issueDetails
                });
            } else {
                return next(new AppError("Issue details not found.", 500));
            }
        } else {
            return next(new AppError("Issue details not found.", 500));
        }


    } else {
        return next(new AppError("Issue details not found.", 500));
    }

});


exports.findBookIssueDetails = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    const bookDetailsList = await BookDetailsMaster.find({
        bookID: req.body.bookId
    }, {
        "_id": 1
    });

    const bookIssuelist = await BookIssue.find({ bookID: { $in: bookDetailsList } }, {
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
            message: `Total Issue Item Details : ${bookIssuelist.length}`,
            bookIssuelist: bookIssuelist
        });
    } else {
        response.successResponse({
            message: `No Issue Item Details Found`,
            bookIssuelist: []
        });
    }

});


exports.bookStockDamage = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const bookDamageList = await BookDamage.find({
        deleted: 0
    }, {
        "remark": 1
    }).populate({
        path: 'bookMasterId',
        select: ['title', 'edition']
    }).populate({
        path: 'bookdetailsMasterId',
        select: ['bookReferenceNumber']
    }).sort({ createdAt: -1 });

    if (bookDamageList.length > 0) {
        response.successResponse({
            message: `Total Item Damage : ${bookDamageList.length}`,
            damageList: bookDamageList
        });
    } else {
        response.successResponse({
            message: `No Damage Item Details found`,
            damageList: []
        });
    }
});

exports.bookDestroy = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.bookId == "") {
        return next(new AppError("Item details not found", 500))
    }

    try {

        const checkDetailsMasterData = await BookDetailsMaster.find({
            bookID: req.body.bookId,
            deleted: 0
        });

        const checkDetailsMasterDataId = await BookMaster.find({
            _id: req.body.bookId
        });

        const checkRequestMasterData = await BookRequest.find({
            bookID: req.body.bookId
        });

        if (checkDetailsMasterDataId.length == 0) {
            return next(
                new AppError(
                    "Item details not found",
                    500, {
                        type: "book_not_found"
                    }
                )
            );
        }

        if (checkDetailsMasterData && checkDetailsMasterData.length > 0) {
            return next(
                new AppError(
                    "Unable to delete the data. Transactional data already exist",
                    500, {
                        type: "transactional_data_exist"
                    }
                )
            );
        }

        if (checkRequestMasterData && checkRequestMasterData.length > 0) {
            return next(
                new AppError(
                    "Unable to delete the data. Transactional data already exist",
                    500, {
                        type: "transactional_data_exist"
                    }
                )
            );
        }

        const deleteBook = await BookMaster.findByIdAndUpdate(req.body.bookId, {
            deleted: 1,
            updated_by: userId
        });

        if (deleteBook) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            }

            let bookType;

            if(checkDetailsMasterDataId[0].bookType == 1){
                bookType = "Book";
            } else if(checkDetailsMasterDataId[0].bookType == 2){
                bookType = "Magazine";
            } else if(checkDetailsMasterDataId[0].bookType == 3) {
                bookType = "Journal";
            } else {

            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Book Delete",
                operationType: `${ bookType } Deleted - ${ checkDetailsMasterDataId[0].title }`,
                userType: userType,
                created_by: userId
            });

            const data = {
                id: deleteBook._id,
            };

            response.createResponse({
                message: "Item deleted successfully.",
                book: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }

    } catch (err) {
        return next(new AppError("Something went wrong", 500));
    }

});

exports.destroyBookStock = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const getBookQuantity = +req.body.quantity;

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.bookId) {
        return next(new AppError("Item details not found", 500));
    }

    if (getBookQuantity <= 0) {
        return next(new AppError("Please enter valid stock", 500));
    }

    const checkbookID = await BookMaster.findById(req.body.bookId, {
        deleted: 0
    });

    if (checkbookID) {
        try {

            const unassignedBook = await BookDetailsMaster.find({
                rackManagementID: null,
                deleted: 0
            });

            const remainingQrcode = await QrCodeDetails.find({
                bookDetailMasterId: null,
                deleted: 0
            });

            const total_book_unassigned = unassignedBook.length;
            const tot_qr_code_unassigned = remainingQrcode.length;
            const tot_qr_code_can_assign = (+total_book_unassigned) - (+tot_qr_code_unassigned);

            if (getBookQuantity > tot_qr_code_can_assign) {
                return next(new AppError("Unable to delete stock as unassigned qr code are there.", 400));
            }

            if (checkbookID.quantity < getBookQuantity) {
                return next(new AppError("Stock not available", 400));
            } else {

                const checkMasterDetailsData = await BookDetailsMaster.find({
                    bookID: req.body.bookId,
                    rackManagementID: null,
                    bookIssueStatus: 0,
                    deleted: 0
                });

                if (checkMasterDetailsData.length < getBookQuantity) {
                    return next(new AppError("Stock not available", 400));
                } else {
                    let deleteIDArray = [];

                    const checkMasterDetailsDataArray = await BookDetailsMaster.find({
                            bookID: req.body.bookId,
                            rackManagementID: null,
                            bookIssueStatus: 0,
                            deleted: 0
                        }).sort({ createdAt: -1 })
                        .limit(getBookQuantity);

                    for (const iterator of checkMasterDetailsDataArray) {
                        deleteIDArray.push(iterator._id);
                    }

                    const deleteStock = await BookDetailsMaster.deleteMany({
                        _id: { $in: deleteIDArray }
                    });

                    await BookMaster.findByIdAndUpdate(req.body.bookId, {
                        quantity: checkbookID.quantity - getBookQuantity,
                        updated_by: userId
                    });

                    if (deleteStock) {

                        const clientIp = requestIp.getClientIp(req);

                        let userType;
                        if (req.user.user_role == 1) {
                            userType = "Admin"
                        } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                            userType = "Librarian"
                        }

                        let bookType;

                        if(checkbookID.bookType == 1){
                            bookType = "Book";
                        } else if(checkbookID.bookType == 2){
                            bookType = "Magazine";
                        } else if(checkbookID.bookType == 3) {
                            bookType = "Journal";
                        } else {

                        }

                        await Activity.create({
                            ipAddress: clientIp,
                            pageDetail: "Book Stock Delete",
                            operationType: `${ bookType } Stock Deducted - <a href = "/books/book-details/${req.body.bookId}"> <b>${checkbookID.title}</b> </a> - <b>Quantity : </b> ${ getBookQuantity }`,
                            userType: userType,
                            created_by: userId
                        });

                        response.createResponse({
                            message: "Stock removed successfully"
                        });
                    } else {
                        return next(new AppError("Something went wrong", 400));
                    }
                }

            }
        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }

    } else {
        return next(new AppError("Item details not found.", 500));
    }
});

exports.bookIssueLocationDetails = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.bookId) {
        return next(new AppError("Item details not found", 500));
    }

    const checkbookID = await BookMaster.findById(req.body.bookId, {
        deleted: 0
    });

    if (checkbookID) {

        try {
            const bookCopiesDetails = await BookDetailsMaster.aggregate([{
                    $match: {
                        $expr: { $eq: ['$bookID', { $toObjectId: req.body.bookId }] },
                        bookIssueStatus: 0,
                        rackManagementID: { $ne: null },
                        bookStatus: { $ne: 4 },
                        deleted: 0
                    }
                },
                {
                    $lookup: {
                        from: "qrcodedetails",
                        localField: "_id",
                        foreignField: "bookDetailMasterId",
                        as: "qrCodeDetails"
                    },
                },
                {
                    $project: {
                        "qrCodeDetails._id": 1
                    }
                },
                { $unwind: { path: "$qrCodeDetails", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "rackmanagements",
                        localField: "qrCodeDetails._id",
                        foreignField: "qrCodeID",
                        as: "locationDetails"
                    },
                },
                {
                    $project: {
                        "locationDetails.rackID": 1,
                        "locationDetails.shelfID": 1
                    }
                },
                { $unwind: { path: "$locationDetails", preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: { rackID: "$locationDetails.rackID", shelfID: "$locationDetails.shelfID" },
                        copies: { $sum: 1 },
                        doc: {
                            $push: "$$ROOT"
                        }
                    }
                },
                {
                    $project: {
                        rackName: "$_id.rackID",
                        shelfName: "$_id.shelfID",
                        copies: "$copies",
                        data: {
                            $map: {
                                input: "$doc",
                                as: "count",
                                in: {
                                    $mergeObjects: [
                                        "$$count",
                                        {
                                            copies: "$copies"
                                        }
                                    ]
                                },
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: "rackmasters",
                        localField: "rackName",
                        foreignField: "_id",
                        as: "rackDetails"
                    },
                },
                {
                    $lookup: {
                        from: "shelfmasters",
                        localField: "shelfName",
                        foreignField: "_id",
                        as: "shelfDetails"
                    },
                },
                {
                    $addFields: {
                        rackName: "$rackDetails.rackName",
                        shelfName: "$shelfDetails.shelfName",
                    }
                },
                { $unwind: { path: "$rackName", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$shelfName", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        "rackName": 1,
                        "shelfName": 1,
                        "copies": 1,
                        "_id": 0
                    }
                },
            ]);

            if (bookCopiesDetails.length > 0) {
                response.successResponse({
                    message: `Total Details : ${bookCopiesDetails.length}`,
                    availableBook: bookCopiesDetails,
                });
            } else {
                response.successResponse({
                    message: `Item details not found`,
                    availableBook: []
                });
            }

        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }


    } else {
        return next(new AppError("Item details not found.", 500));
    }
});

exports.empDetails = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.empCode) {
        return next(new AppError("Employee code not found", 500));
    }

    const searchValue = req.body.empCode.replace(/\s+/g, '');
    const empDetails = await User.find({
        $or: [{ employee_id: searchValue },
            { email: searchValue },
            { mobile: searchValue }
        ],
        deleted: 0,
        status: 1,
        user_role: { $ne: 4 },
        verified: true
    }, {
        "name": 1,
        "email": 1,
        "mobile": 1,
        "address": 1,
        "employee_id": 1
    }).populate({
        path: 'department',
        select: ['departmentName']
    }).populate({
        path: 'designation',
        select: ['designationName']
    }).sort({ createdAt: -1 });

    if (empDetails.length > 0) {
        response.successResponse({
            message: `Employee Details`,
            employeeData: empDetails
        });
    } else {
        return next(new AppError("Employee details not found.", 500));
    }
});

exports.getQrCode = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.bookRefNo) {
        return next(new AppError("Item details not found", 500));
    }

    const getQrCodeDetails = await QrCodeDetails.findOne({
        bookReferenceNumber: req.body.bookRefNo,
        //bookDetailMasterId: null,
        status: 1,
        deleted: 0
    }, {
        "_id": 1,
        "bookDetailMasterId": 1
    });

    if (getQrCodeDetails && !getQrCodeDetails.bookDetailMasterId) {

        response.successResponse({
            message: `QrCode Id`,
            QrCode: getQrCodeDetails._id
        });
    } else if (getQrCodeDetails && getQrCodeDetails.bookDetailMasterId) {
        return next(new AppError("Qr code already assigned.", 500));
    } else {
        return next(new AppError("QR code not found.", 500));
    }
});

exports.getBookRefNo = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.qrCode) {
        return next(new AppError("QR code not found", 500));
    }

    const getBookRefNoId = await QrCodeDetails.findOne({
        _id: req.body.qrCode,
        //bookDetailMasterId: null,
        status: 1,
        deleted: 0
    }, {
        "bookReferenceNumber": 1,
        "_id": 0,
        "bookDetailMasterId": 1
    });

    if (getBookRefNoId && !getBookRefNoId.bookDetailMasterId) {

        response.successResponse({
            message: `Item Reference ID`,
            bookRefNo: getBookRefNoId
        });
    } else if (getBookRefNoId && getBookRefNoId.bookDetailMasterId) {
        return next(new AppError("Item reference id already assigned.", 500));
    } else {
        return next(new AppError("Item reference id not found.", 500));
    }
});

exports.bookStatusChange = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.bookId) {
        Item
        return next(new AppError("Item details not found", 500))
    }

    if (!req.body.status) {
        return next(new AppError("Item status not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await BookMaster.find({
            _id: req.body.bookId
        });

        if (checkDetailsMasterDataId.length == 0) {
            return next(
                new AppError(
                    "Item details not found",
                    500, {
                        type: "book_not_found"
                    }
                )
            );
        }

        let statusValue;
        let statusBeforeChanged;
        let statusAfterChanged;

        if (req.body.status == 1) {
            statusValue = 0;
            statusBeforeChanged = "Active";
            statusAfterChanged = "Inactive";
        } else if (req.body.status == 0) {
            statusValue = 1;
            statusBeforeChanged = "Inactive";
            statusAfterChanged = "Active";
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

        const statusChange = await BookMaster.findByIdAndUpdate(req.body.bookId, {
            status: statusValue,
            updated_by: userId
        });

        const checkSuggested = await BookSuggested.findOne({
            bookmasterId: req.body.bookId,
            deleted: 0
        });

        if (checkSuggested) {
            await BookSuggested.findByIdAndUpdate(checkSuggested._id, {
                status: statusValue,
                updated_by: userId
            });
        }

        if (statusChange) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            }

            let bookType;

            if(checkDetailsMasterDataId[0].bookType == 1){
                bookType = "Book";
            } else if(checkDetailsMasterDataId[0].bookType == 2){
                bookType = "Magazine";
            } else if(checkDetailsMasterDataId[0].bookType == 3) {
                bookType = "Journal";
            } else {

            }


            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Book Status Change",
                operationType: `${ bookType } Status Changed - <a href = "/books/book-details/${req.body.bookId}">${ checkDetailsMasterDataId[0].title } </a> <b>Status: </b> ${ statusBeforeChanged } to ${ statusAfterChanged }`,
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

exports.getQrCodeForIssue = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.bookRefNo) {
        return next(new AppError("Item details not found", 500));
    }

    if (!req.body.bookId) {
        return next(new AppError("Item details not found", 500));
    }

    const checkBook = await BookDetailsMaster.findOne({
        bookReferenceNumber: req.body.bookRefNo,
        bookID: req.body.bookId,
        status: 1,
        deleted: 0
    });

    if (checkBook) {
        const getQrCodeDetails = await QrCodeDetails.findOne({
            bookReferenceNumber: req.body.bookRefNo,
            bookDetailMasterId: { $ne: null },
            status: 1,
            deleted: 0
        }, {
            "_id": 1
        });

        if (getQrCodeDetails) {

            response.successResponse({
                message: `QrCode Id`,
                QrCode: getQrCodeDetails._id
            });
        } else {
            return next(new AppError("QR code not found.", 500));
        }
    } else {
        return next(new AppError("Item details doesn`t match with item reference id.", 500));
    }
});

exports.getBookRefNoForIssue = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.qrCode) {
        return next(new AppError("QR code not found", 500));
    }

    if (!req.body.bookId) {
        return next(new AppError("Item details not found", 500));
    }

    const getBookRefNoId = await QrCodeDetails.findOne({
        _id: req.body.qrCode,
        bookDetailMasterId: { $ne: null },
        status: 1,
        deleted: 0
    }, {
        "bookReferenceNumber": 1,
        "_id": 0
    });


    if (getBookRefNoId) {

        const checkBook = await BookDetailsMaster.findOne({
            bookReferenceNumber: getBookRefNoId.bookReferenceNumber,
            bookID: req.body.bookId,
            status: 1,
            deleted: 0
        });

        if (checkBook) {
            response.successResponse({
                message: `Item Reference ID`,
                bookRefNo: getBookRefNoId
            });
        } else {
            return next(new AppError("Item details doesn`t match with book qr code.", 500));
        }

    } else {
        return next(new AppError("Item reference id not found.", 500));
    }
});

exports.bookListByStatus = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.type) {
        return next(new AppError("Type not found", 500))
    }

    const books = await BookMaster.find({
        deleted: 0,
        status: 1,
        bookType: req.body.type,
    }, {
        "title": 1,
    }).sort({ createdAt: -1 });


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookList: books
    });

});

exports.getQuantityAdd = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const unassignedBook = await BookDetailsMaster.find({
        rackManagementID: null,
        deleted: 0
    });

    const remainingQrcode = await QrCodeDetails.find({
        bookDetailMasterId: null,
        deleted: 0
    });

    const total_book_unassigned = unassignedBook.length;
    const tot_qr_code_unassigned = remainingQrcode.length;
    const tot_qr_code_can_assign = (+total_book_unassigned) - (+tot_qr_code_unassigned);
    response.successResponse({
        maximunBook: tot_qr_code_can_assign
    });
});

exports.createSuggestedBook = catchAsync(async(req, res, next) => {
    
    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.bookId) {
        return next(new AppError("Book details not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await BookMaster.findById({
            _id: req.body.bookId
        });


        if (checkDetailsMasterDataId.length == 0) {
            return next(
                new AppError(
                    "Book details not found",
                    500, {
                        type: "book_not_found"
                    }
                )
            );
        }

        const checkDuplicate = await BookSuggested.find({
            bookmasterId: req.body.bookId,
            status: 1,
            deleted: 0
        });

        if (checkDuplicate.length > 0) {
            return next(
                new AppError(
                    "Book already added",
                    500, {
                        type: "book_not_found"
                    }
                )
            );
        }

        const addBook = await BookSuggested.create({
            bookmasterId: req.body.bookId,
            created_by: userId
        });

        const addBookHistory = await BookSuggestedHistory.create({
            bookmasterId: req.body.bookId,
            created_by: userId
        });

        if (addBook) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Suggested Book Added",
                operationType: `<a href="/recommended-books"><b>${ checkDetailsMasterDataId.title }</b> has been added to recommended books list</a>.`,
                userType: userType,
                created_by: userId
            });

            response.createResponse({
                message: "Book added successfully."
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }

    } catch (err) {
        return next(new AppError("Something went wrong", 500));
    }

});

exports.suggestedBooksList = catchAsync(async(req, res, next) => {

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
                    "bookMasterDetails._id": 1,
                    "bookMasterDetails.front_image": 1,
                    "authorDetails.first_name": 1,
                    "authorDetails.middle_name": 1,
                    "authorDetails.last_name": 1,
                    "publisherDetails.title": 1
                }
            }
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await BookSuggested.find({
        status: 1,
        deleted: 0,
    });

    response.successResponse({
        totalBookDetails: bookDetails.length,
        bookDetails: bookDetails,
        bookCount: bookCount.length
    });

});

exports.removeSuggestedBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.bookSuggestedId) {
        return next(new AppError("Suggested book details not found", 500));
    }

    try {

        const checkbookID = await BookSuggested.findById(req.body.bookSuggestedId, {
            deleted: 0
        });

        const checkDetailsMasterDataId = await BookMaster.findById({
            _id: checkbookID.bookmasterId
        });

        if (checkbookID) {

            const removeBook = await BookSuggested.deleteOne({
                _id: req.body.bookSuggestedId
            });

            if (removeBook) {

                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                    userType = "Librarian"
                }

                const clientIp = requestIp.getClientIp(req);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Remove suggested book",
                    operationType: `<a href="/recommended-books"><b>${checkDetailsMasterDataId.title}</b> has been removed from the recommended books.</a>`,
                    userType: userType,
                    created_by: userId
                });
                response.createResponse({
                    message: "Suggested book removed successfully.",
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } else {
            return next(new AppError("Suggested book details not found", 500));
        }
    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.suggestedBooksAddList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const books = await BookMaster.find({
        deleted: 0,
        status: 1,
        bookType: 1,
        availableQuantity: {
            $gt: 0
        },
    }, {
        "title": 1,
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name']
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookList: books
    });

});

exports.notifyRequisition = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.requisitionId) {
        return next(new AppError("Requisition details not found", 500))
    }

    const checkData = await BookRequisition.findOne({
        _id: req.body.requisitionId,
        status: 1,
        deleted: 0
    });

    if (req.body.status == 2 || req.body.status == 3 || req.body.status == 4) {

        if (checkData) {
            try {

                const empName = await User.findById(checkData.employeeID, {
                    deleted: 0
                });

                if (req.body.status == 2) {

                    const subject = "Book Suggested | OMC Reads";
                    const textContent = "Book Suggested";
                    const name = empName.name;
                    const email = empName.email;
                    const html = `<p>Suggestion for <strong>${checkData.bookName}</strong> is now approved.</p><br/>`;

                    helper.sendMail(subject, textContent, name, email, html);

                    let userType;
                    if (req.user.user_role == 1) {
                        userType = "Admin"
                    } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                        userType = "Librarian"
                    }

                    const clientIp = requestIp.getClientIp(req);

                    await Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Suggested Book Alert",
                        operationType: `<a href="/suggested-books">Suggested Book Alert - <b>${checkData.bookName}</b> suggested by ${empName.name} has been approved</a>`,
                        userType: userType,
                        created_by: userId
                    });

                    await BookRequisition.findByIdAndUpdate(req.body.requisitionId, {
                        requisitionStatus: req.body.status
                    });

                    await Notification.create({
                        user_id: userId,
                        notification_for: checkData.employeeID,
                        notificationRole: 2,
                        notification_type: "Suggested Book",
                        message: `Suggestion for ${checkData.bookName} is now approved.`,
                        created_by: userId
                    });

                    response.createResponse({
                        message: "Item has been successfully approved."
                    });

                }

                if (req.body.status == 3) {

                    const subject = "Book Suggested | OMC Reads";
                    const textContent = "Book Suggested";
                    const name = empName.name;
                    const email = empName.email;
                    const html = `<p>Suggestion for <strong>${checkData.bookName}</strong> is cancelled.</p><br/>`;

                    helper.sendMail(subject, textContent, name, email, html);

                    let userType;
                    if (req.user.user_role == 1) {
                        userType = "Admin"
                    } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                        userType = "Librarian"
                    }

                    const clientIp = requestIp.getClientIp(req);

                    await Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Suggested Book Alert",
                        operationType: `<a href="/suggested-books">Suggested Book Alert - <b>${checkData.bookName}</b> suggested by ${empName.name} has been cancelled</a>`,
                        userType: userType,
                        created_by: userId
                    });

                    await BookRequisition.findByIdAndUpdate(req.body.requisitionId, {
                        requisitionStatus: req.body.status,
                        remark: req.body.remark
                    });

                    await Notification.create({
                        user_id: userId,
                        notification_for: checkData.employeeID,
                        notificationRole: 2,
                        notification_type: "Suggested Book",
                        message: `Suggestion for ${checkData.bookName} is cancelled.`,
                        created_by: userId
                    });

                    response.createResponse({
                        message: "Item has been successfully cancelled."
                    });

                }

                if (req.body.status == 4) {

                    const subject = "Book Suggested | OMC Reads";
                    const textContent = "Book Suggested";
                    const name = empName.name;
                    const email = empName.email;
                    const html = `<p>Suggestion for <strong>${checkData.bookName}</strong> is now added to library.</p><br/>`;

                    helper.sendMail(subject, textContent, name, email, html);

                    let userType;
                    if (req.user.user_role == 1) {
                        userType = "Admin"
                    } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                        userType = "Librarian"
                    }

                    const clientIp = requestIp.getClientIp(req);

                    await Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Suggested Book Alert",
                        operationType: `<a href="/suggested-books">Suggested Book Alert - <b>${checkData.bookName}</b> suggested by ${empName.name} has been added to library</a>`,
                        userType: userType,
                        created_by: userId
                    });

                    await BookRequisition.findByIdAndUpdate(req.body.requisitionId, {
                        requisitionStatus: req.body.status
                    });

                    await Notification.create({
                        user_id: userId,
                        notification_for: checkData.employeeID,
                        notificationRole: 2,
                        notification_type: "Suggested Book",
                        message: `Suggestion for ${checkData.bookName} is now added to library.`,
                        created_by: userId
                    });

                    response.createResponse({
                        message: "Item has been successfully added to the library."
                    });

                }


            } catch (err) {
                return next(new AppError(err, 500));
            }

        } else {
            return next(new AppError("Requisition details not found.", 500));
        }

    } else {
        return next(new AppError("Invalid value.", 500));
    }

});

exports.notifyRequest = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.requestId) {
        return next(new AppError("Request details not found", 500))
    }

    const checkData = await BookRequest.findOne({
        _id: req.body.requestId,
        bookRequestStatus: 1,
        status: 1,
        deleted: 0
    });

    if (checkData) {
        if (checkData.notifyStatus == 0) {
            try {

                const empName = await User.findById(checkData.employeeID, {
                    deleted: 0
                });

                const bookName = await BookMaster.findById(checkData.bookID, {
                    deleted: 0
                });

                if (req.body.status == "Approved") {

                    const subject = "Book Request | OMC Reads";
                    const textContent = "Book Request";
                    const name = empName.name;
                    const email = empName.email;
                    const html = `<p><strong>${bookName.title}</strong> is now available.</p><br/>`;

                    helper.sendMail(subject, textContent, name, email, html);

                    let userType;
                    if (req.user.user_role == 1) {
                        userType = "Admin"
                    } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                        userType = "Librarian"
                    }

                    const clientIp = requestIp.getClientIp(req);

                    await Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Request Alert",
                        operationType: `Request Alert - Requested item <a href="/item-requested"><b>${bookName.title}</b></a> has been <b>approved</b>`,
                        userType: userType,
                        created_by: userId
                    });

                    await BookRequest.findByIdAndUpdate(req.body.requestId, {
                        notifyStatus: 1
                    });

                    await Notification.create({
                        user_id: userId,
                        notification_for: checkData.employeeID,
                        notificationRole: 2,
                        notification_type: "Book Request Alert",
                        message: `${bookName.title} is now available.`,
                        created_by: userId
                    });

                    response.createResponse({
                        message: "Notified successfully"
                    });
                }

                if (req.body.status == "Cancelled") {
                    const subject = "Book Request | OMC Reads";
                    const textContent = "Book Request";
                    const name = empName.name;
                    const email = empName.email;
                    const html = `<p>Request for <strong>${bookName.title}</strong> has been cancelled.</p><br/>`;

                    helper.sendMail(subject, textContent, name, email, html);

                    let userType;
                    if (req.user.user_role == 1) {
                        userType = "Admin"
                    } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                        userType = "Librarian"
                    }

                    const clientIp = requestIp.getClientIp(req);

                    await Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Request Alert",
                        operationType: `Request Alert - Requested item <a href="/item-requested"><b>${bookName.title}</b></a> has been <b>cancelled</b>`,
                        userType: userType,
                        created_by: userId
                    });

                    await BookRequest.findByIdAndUpdate(req.body.requestId, {
                        bookRequestStatus: 3,
                        remark: req.body.remark
                    });

                    await Notification.create({
                        user_id: userId,
                        notification_for: checkData.employeeID,
                        notificationRole: 2,
                        notification_type: "Book Request Alert",
                        message: `Request for ${bookName.title} has been cancelled.`,
                        created_by: userId
                    });

                    response.createResponse({
                        message: "Cancelled successfully"
                    });
                }


            } catch (err) {
                return next(new AppError(err, 500));
            }
        } else {
            return next(new AppError("Already Notified.", 500));
        }
    } else {
        return next(new AppError("Request details not found.", 500));
    }
});

exports.notificationRequest = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.requestId) {
        return next(new AppError("Request details not found", 500))
    }

    const checkData = await BookRequest.findOne({
        _id: req.body.requestId,
        bookRequestStatus: 1,
        status: 1,
        deleted: 0
    });

    if (checkData) {

        try {

            const empName = await User.findById(checkData.employeeID, {
                deleted: 0
            });

            const bookName = await BookMaster.findById(checkData.bookID, {
                deleted: 0
            });

            const subject = "Book Request | OMC Reads";
            const textContent = "Book Request";
            const name = empName.name;
            const email = empName.email;
            const html = `<p><strong>${bookName.title}</strong> is now available.</p><br/>`;

            helper.sendMail(subject, textContent, name, email, html);

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Request Alert",
                operationType: `Request Alert - <b>${ empName.name }</b> has been notified for <a href="/item-requested"><b>${bookName.title}</b></a> request`,
                userType: userType,
                created_by: userId
            });

            await BookRequest.findByIdAndUpdate(req.body.requestId, {
                notifyStatus: 1
            });

            await Notification.create({
                user_id: userId,
                notification_for: checkData.employeeID,
                notificationRole: 2,
                notification_type: "Book Request Alert",
                message: `${bookName.title} is now available.`,
                created_by: userId
            });

            response.createResponse({
                message: "Notified successfully"
            });

        } catch (err) {
            return next(new AppError(err, 500));
        }

    } else {
        return next(new AppError("Request details not found.", 500));
    }
});

exports.bookIssueHistoryListing = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    const issueDetails = await BookIssue.aggregate([
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
            $project: {
                "issueDate": 1,
                "returnDate": 1,
                "bookReturnStatus": 1,
                "bookDetails.bookReferenceNumber": 1,
                "bookMasterDetails.title": 1,
                "employeeDetails.email": 1,
                "employeeDetails.name": 1,
                "employeeDetails.mobile": 1,
                "departmentDetails.departmentName": 1,
                "designationDetails.designationName": 1
            }
        }
    ]);


    if (issueDetails.length > 0) {
        response.successResponse({
            todayDate: new Date(),
            totalIssue: issueDetails.length,
            issueDetails: issueDetails
        });
    } else {
        return next(new AppError("Issue details not found.", 500));
    }

});

exports.notifyOverDue = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.overdueId) {
        return next(new AppError("Request details not found", 500))
    }

    const checkData = await BookIssue.findOne({
        _id: req.body.overdueId,
        bookReturnStatus: 0,
        status: 1,
        deleted: 0
    });

    if (checkData) {

        try {

            const empName = await User.findById(checkData.employeeID, {
                deleted: 0
            });

            const bookCopyName = await BookDetailsMaster.findById(checkData.bookID, {
                deleted: 0
            });

            const bookName = await BookMaster.findById(bookCopyName.bookID, {
                deleted: 0
            });

            const subject = "Book Overdued | OMC Reads";
            const textContent = "Book Overdued";
            const name = empName.name;
            const email = empName.email;
            const html = `<p><strong>${bookName.title}</strong> is now overdued. Kindly return the book.</p><br/>`;

            helper.sendMail(subject, textContent, name, email, html);

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Request Book Overdued",
                operationType: "Request Book Overdued",
                userType: userType,
                created_by: userId
            });

            await Notification.create({
                user_id: userId,
                notification_for: checkData.employeeID,
                notificationRole: 2,
                notification_type: "Book Overdued",
                message: `${bookName.title} is now overdued. Kindly return the book.`,
                created_by: userId
            });

            response.createResponse({
                message: "Book Overdued alert successfull"
            });

        } catch (err) {
            return next(new AppError(err, 500));
        }

    } else {
        return next(new AppError("Book Overdued details not found.", 500));
    }
});

exports.journalList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const books = await BookMaster.find({
        deleted: 0,
        bookType: 3,
    }, {
        "title": 1,
        "edition": 1,
        "status": 1,
        "publishedYear": 1,
        "description": 1,
        "front_image": 1,
        "back_image": 1,
        "quantity": 1,
        "availableQuantity": 1,
        "assignedQuantity": 1,
        "damageQuantity": 1,
        "volume": 1,
        "issue": 1,
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).populate({
        path: 'genreID',
        select: ['title']
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total journal count= ${ books.length }`,
        journalList: books
    });

});

exports.magazineList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const books = await BookMaster.find({
        deleted: 0,
        bookType: 2,
    }, {
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

    response.successResponse({
        message: `Total magazine count= ${ books.length }`,
        magazineList: books
    });

});

exports.getBookJourMagType = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const books = await BookJournalMagzineTypeMaster.find({
        deleted: 0,
        status: 1,
    }, {
        "name": 1,
        "typeId": 1,
    }).sort({ createdAt: 1 });

    response.successResponse({
        message: `Total count= ${ books.length }`,
        data: books
    });

});

exports.getQrCodeForReturn = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.bookRefNo) {
        return next(new AppError("Book details not found", 500));
    }

    const getQrCodeDetails = await QrCodeDetails.findOne({
        bookReferenceNumber: req.body.bookRefNo,
        bookDetailMasterId: { $ne: null },
        status: 1,
        deleted: 0
    }, {
        "_id": 1
    });

    if (getQrCodeDetails) {

        const data = await BookDetailsMaster.findOne({
            bookReferenceNumber: req.body.bookRefNo,
            status: 1,
            deleted: 0
        }, {
            "_id": 1,
            "bookID": 1,
        });

        const checkbookID = await BookMaster.findOne({
            _id: data.bookID,
            status: 1,
            deleted: 0
        }, {
            "title": 1,
            "bookType": 1
        });

        response.successResponse({
            message: `QrCode Id`,
            QrCode: getQrCodeDetails._id,
            title: checkbookID.title,
            bookType: checkbookID.bookType
        });
    } else {
        return next(new AppError("QR code not found.", 500));
    }
});

exports.getBookRefNoForReturn = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.qrCode) {
        return next(new AppError("QR code not found", 500));
    }

    const getBookRefNoId = await QrCodeDetails.findOne({
        _id: req.body.qrCode,
        bookDetailMasterId: { $ne: null },
        status: 1,
        deleted: 0
    }, {
        "bookReferenceNumber": 1,
        "_id": 0
    });

    if (getBookRefNoId) {

        const data = await BookDetailsMaster.findOne({
            bookReferenceNumber: getBookRefNoId.bookReferenceNumber,
            status: 1,
            deleted: 0
        }, {
            "_id": 1,
            "bookID": 1,
        });

        const checkbookID = await BookMaster.findOne({
            _id: data.bookID,
            status: 1,
            deleted: 0
        }, {
            "title": 1,
            "bookType": 1
        });

        response.successResponse({
            message: `Book Reference Number`,
            bookRefNo: getBookRefNoId,
            title: checkbookID.title,
            bookType: checkbookID.bookType
        });
    } else {
        return next(new AppError("Book reference number not found.", 500));
    }
});

exports.authorBookList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let authorArray = new Array();
    let authorAssignedArray = new Array();

    const authorDetails = await AuthorMaster.find({
        status: 1,
        deleted: 0
    }, {
        'id': 1,
    }).sort({ createdAt: -1 });

    for (const iterator of authorDetails) {
        authorArray.push(iterator._id.toString())
    }

    const checkbookID = await BookMaster.findById(req.body.bookId, {
        deleted: 0
    });

    for (const iterator1 of checkbookID.authorID) {
        authorAssignedArray.push(iterator1.toString())
    }

    for (const iterator2 of authorAssignedArray) {
        const checkExistBook = authorArray.includes(iterator2);

        if (!checkExistBook) {
            authorArray.push(iterator2)
        }
    }

    const getAuthor = await AuthorMaster.find({
        _id: { $in: authorArray },
    }, {
        'first_name': 1,
        'middle_name': 1,
        'last_name': 1,
        'description': 1,
        'profile_image': 1,
        'status': 1,
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total authors count= ${ getAuthor.length }`,
        authorList: getAuthor
    });

});

exports.publisherBookList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let publisherArray = new Array();
    let publisherAssignedArray = new Array();


    const publisherDetails = await PublisherMaster.find({
        deleted: 0,
        status: 1
    }, {
        'id': 1
    }).sort({ createdAt: -1 });

    for (const iterator of publisherDetails) {
        publisherArray.push(iterator._id.toString())
    }

    const checkbookID = await BookMaster.findById(req.body.bookId, {
        deleted: 0
    });

    for (const iterator1 of checkbookID.publisherID) {
        publisherAssignedArray.push(iterator1.toString())
    }

    for (const iterator2 of publisherAssignedArray) {
        const checkExistBook = publisherArray.includes(iterator2);

        if (!checkExistBook) {
            publisherArray.push(iterator2)
        }
    }

    const getPublisher = await PublisherMaster.find({
        _id: { $in: publisherArray },
    }, {
        'title': 1,
        'status': 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total publisher count= ${ getPublisher.length }`,
        publisherList: getPublisher
    });

});

exports.genreBookList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let genreArray = new Array();

    const genreDetails = await GenreMaster.find({
        deleted: 0,
        status: 1
    }, {
        'id': 1
    }).sort({ createdAt: -1 });

    for (const iterator of genreDetails) {
        genreArray.push(iterator._id.toString())
    }

    const checkbookID = await BookMaster.findById(req.body.bookId, {
        deleted: 0
    });

    const checkExistBook = genreArray.includes(checkbookID.genreID.toString());

    if (!checkExistBook) {
        genreArray.push(checkbookID.genreID.toString())
    }

    const getGenre = await GenreMaster.find({
        _id: { $in: genreArray },
    }, {
        'title': 1
    });

    response.successResponse({
        message: `Total genre count= ${ getGenre.length }`,
        genreList: getGenre
    });

});

exports.shelfRackEditList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let rackArray = new Array();

    const rackDetails = await RackMaster.find({
        deleted: 0,
        status: 1
    }, {
        'id': 1
    }).sort({ createdAt: -1 });

    for (const iterator of rackDetails) {
        rackArray.push(iterator._id.toString())
    }

    const checkrack = await ShelfMaster.findById(req.body.rackId, {
        deleted: 0
    });

    const checkExist = rackArray.includes(checkrack.rackID.toString());

    if (!checkExist) {
        rackArray.push(checkrack.rackID.toString())
    }

    let objectIdArray = rackArray.map(s => mongoose.Types.ObjectId(s));

    const rackdata = await RackMaster.aggregate([{ $sort: { "createdAt": -1 } }, {
            $match: {
                _id: { $in: objectIdArray },
            },
        },
        {
            $lookup: {
                from: "librarymasters",
                localField: "libraryID",
                foreignField: "_id",
                as: "libraryDetails"
            },
        },
        {
            $project: {
                "rackName": 1,
                "status": 1,
                "libraryDetails.libraryName": 1
            }
        },
        { $unwind: { path: "$libraryDetails", preserveNullAndEmptyArrays: true } }
    ]);

    response.successResponse({
        message: `Total rack count= ${ rackdata.length }`,
        rackList: rackdata
    });

});

exports.designationEditList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let depArray = new Array();

    const departmentDetails = await DepartmentMaster.find({
        deleted: 0,
        status: 1
    }, {
        'id': 1
    }).sort({ createdAt: -1 });

    for (const iterator of departmentDetails) {
        depArray.push(iterator._id.toString())
    }

    const checkData = await DesignationMaster.findById(req.body.designationId, {
        deleted: 0
    });

    const checkExist = depArray.includes(checkData.departmentID.toString());

    if (!checkExist) {
        depArray.push(checkData.departmentID.toString())
    }

    const getDep = await DepartmentMaster.find({
        _id: { $in: depArray },
    }, {
        'departmentName': 1,
        'status': 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total genre count= ${ getDep.length }`,
        genreList: getDep
    });

});

exports.bookListFilter = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const books = await BookMaster.find({
        deleted: 0,
        status: 1
    }, {
        "title": 1,
        "bookType": 1,
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookList: books
    });

});

exports.employeeFilterRequest = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const empDetails = await User.find({
        deleted: 0,
        user_role: { $ne: 4 },
    }, {
        "name": 1,
        "employee_id": 1,
        "status": 1
    }).sort({ name: 1 });

    response.successResponse({
        message: `Total employee count= ${ empDetails.length }`,
        empList: empDetails
    });

});

exports.bookDamageListing = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);


    const books = await BookDamage.aggregate([{
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
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$bookdetailsmastersdetails", preserveNullAndEmptyArrays: true } },
        // {
        //     $match: filterObject
        // },
        {
            $project: {
                "bookMasterDetails.title": 1,
                "bookMasterDetails._id": 1,
                "bookMasterDetails.edition": 1,
                "bookMasterDetails.bookType": 1,
                "bookdetailsmastersdetails.bookReferenceNumber": 1,
                "remark": 1,
            }
        }
    ]).collation({ locale: "en" });

    response.successResponse({
        message: `Total damage count= ${ books.length }`,
        damageList: books
    });

});

exports.storeBulkBook = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    let genres;
    let author;
    let title;
    let language;
    let publisher;

    if (req.body.genres) {
        genres = req.body.genres;
    } else {
        new AppError("Please select category.", 400, { type: "duplicate book" })
    }

    if (req.body.author) {
        author = req.body.author;
    } else {
        new AppError("Please select author.", 400, { type: "duplicate book" })
    }

    if (req.body.title) {
        title = req.body.title;
    } else {
        new AppError("Please enter title.", 400, { type: "duplicate book" })
    }

    if (!req.body.bookType) {
        new AppError("Book type is not defined.", 400, { type: "duplicate book" })
    }

    if (req.body.language) {
        language = req.body.language;
    } else {
        new AppError("Please enter language.", 400, { type: "duplicate book" })
    }

    if (req.body.publisher) {
        publisher = req.body.publisher;
    } else {
        new AppError("Please select publisher.", 400, { type: "duplicate book" })
    }

    imgFrontData = "images/book/default-book-image.jpg";

    const existingBookByOtherDetails = await BookMaster.findOne({
        title: title,
        authorID: author,
        genreID: genres,
        publisherID: publisher,
        language: language,
        bookType: req.body.bookType
    });

    if (existingBookByOtherDetails) {
        return next(
            new AppError("Book already exists", 400, { type: "duplicate book" })
        );
    }

    try {

        const newBook = await BookMaster.create({
            bookType: req.body.bookType,
            title: title,
            authorID: author,
            genreID: genres,
            publisherID: publisher,
            language: language,
            front_image: imgFrontData,
            created_by: userId
        });

        if (newBook) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            }

            const data = {
                title: newBook.title,
                id: newBook._id,
            };
            let bookType;
            if (req.body.bookType == 1) {
                bookType = "Book"
            } else if (req.body.bookType == 2) {
                bookType = "Magazine"
            } else if (req.body.bookType == 3) {
                bookType = "Journal"
            } else {}
            
            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Add Book",
                operationType: `Book Added From Bulk Book Add- <a href='/books/book-details/${newBook._id}'>${ req.body.title }</a>`,
                userType: userType,
                created_by: userId
            });

            response.createResponse({
                message: `${bookType} successfully added`,
                book: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.bulkBookList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        userId = req.body.userId;
    }

    const books = await TempBook.find({
        deleted: 0,
        bookType: 1,
        created_by: userId
    }, {
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
        select: ['first_name', 'middle_name', 'last_name']
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).populate({
        path: 'genreID',
        select: ['title']
    }).sort({ createdAt: 1 });

    response.successResponse({
        message: `Total books count= ${ books.length }`,
        bookList: books
    });

});

exports.bulkBookSubmit = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        userId = req.body.userId;
    }

    const books = await TempBook.find({
        deleted: 0,
        bookType: 1,
        created_by: userId
    }, {
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
        "bookType": 1
    }).populate({
        path: 'authorID',
        select: ['first_name', 'middle_name', 'last_name', 'profile_image', 'description']
    }).populate({
        path: 'publisherID',
        select: ['title']
    }).populate({
        path: 'genreID',
        select: ['title']
    }).sort({ createdAt: 1 });

    let deleteIDArray = [];

    for (const iterator of books) {

        await BookMaster.create({
            bookType: iterator.bookType,
            title: iterator.title,
            authorID: iterator.authorID,
            genreID: iterator.genreID,
            edition: iterator.edition,
            pages: iterator.pages,
            publisherID: iterator.publisherID,
            publishedYear: iterator.publishedYear,
            description: iterator.description,
            language: iterator.language,
            volume: iterator.volume,
            issue: iterator.issue,
            front_image: iterator.front_image,
            created_by: userId
        });

        deleteIDArray.push(iterator._id);
    }

    await TempBook.deleteMany({
        _id: { $in: deleteIDArray }
    });

    response.successResponse({
        message: `${deleteIDArray.length} books added successfully`
    });

});

exports.bulkbookDestroy = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    let userId;
    let bookId;

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.bookId) {
        return next(new AppError("Book details not found", 500))
    } else {
        checkID = await TempBook.findById(req.body.bookId, {
            deleted: 0
        });

        if (checkID) {
            bookId = req.body.bookId;
        } else {
            return next(new AppError("Book details not found.", 500));
        }
    }

    try {

        const deleteBook = await TempBook.deleteOne({
            _id: bookId
        });

        if (deleteBook) {

            response.createResponse({
                message: "Book deleted successfully."
            });

        } else {
            return next(new AppError("Something went wrong", 500));
        }

    } catch (err) {
        return next(new AppError("Something went wrong", 500));
    }

});

exports.bookAvailability = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.bookId) {
        return next(new AppError("Book details not found", 500))
    } else {
        checkID = await BookMaster.findOne({
            _id: req.body.bookId,
            deleted: 0
        }, {
            "quantity": 1,
            "availableQuantity": 1,
            "assignedQuantity": 1
        });

        if (checkID) {
            response.successResponse({
                bookData: checkID,
            });
        } else {
            return next(new AppError("Book details not found.", 500));
        }
    }

});

exports.getAllItemStatus = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const books = await ItemStatusMaster.find({
        deleted: 0,
        status: 1,
    }, {
        "name": 1,
        "typeId": 1,
    }).sort({ createdAt: 1 });

    response.successResponse({
        message: `Total count= ${ books.length }`,
        data: books
    });

});

exports.getItemStatus = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const books = await ItemStatusMaster.find({
        typeId: { $ne: 4 },
        deleted: 0,
        status: 1,
    }, {
        "name": 1,
        "typeId": 1,
    }).sort({ createdAt: 1 });

    response.successResponse({
        message: `Total count= ${ books.length }`,
        data: books
    });

});

exports.getLostStatus = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const books = await ItemStatusMaster.find({
        deleted: 0,
        status: 1,
        typeId: { $in: [3, 4] },
    }, {
        "name": 1,
        "typeId": 1,
    }).sort({ createdAt: 1 });

    response.successResponse({
        message: `Total count= ${ books.length }`,
        data: books
    });

});

exports.lostBookSubmit = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    let bookRefNo;
    let checkID;

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.bookRefNo) {
        return next(new AppError("Book details not found", 500))
    } else {

        checkID = await BookDetailsMaster.findOne({
            bookReferenceNumber: req.body.bookRefNo,
            deleted: 0
        });

        if (checkID) {
            bookRefNo = req.body.bookRefNo;

        } else {
            return next(new AppError("Book details not found.", 500));
        }
    }

    if (req.body.status == 1 || req.body.status == 2) {
        return next(new AppError("Invalid status value.", 500));
    }


    if (!req.body.remark) {
        return next(new AppError("Please enter remark.", 500));
    }

    try {


        if (+checkID.bookIssueStatus == 1) {
            return next(new AppError("Item already issued.", 500));
        } else {

            const checkBookDamage = await BookDamage.findOne({
                bookdetailsMasterId: checkID._id,
                itemStatus: req.body.status,
                status: 1,
                deleted: 0
            });

            if (checkBookDamage && req.body.status == 3) {
                return next(new AppError("Item already reported as damaged.", 500));
            }

            if (checkBookDamage && req.body.status == 4) {
                return next(new AppError("Item already reported as lost.", 500));
            }

            const checkQuantity = await BookMaster.findById(checkID.bookID, {
                deleted: 0
            });

            let isLostorDamaged;

            if (req.body.status == 3) {

                const checkBookDamage = await BookDamage.findOne({
                    bookMasterId: checkID.bookID,
                    bookdetailsMasterId: checkID._id,
                    itemStatus: req.body.status,
                    status: 1,
                    deleted: 0
                });

                if (!checkBookDamage) {


                    await BookDamage.create({
                        bookMasterId: checkID.bookID,
                        bookdetailsMasterId: checkID._id,
                        itemStatus: req.body.status,
                        remark: req.body.remark,
                        created_by: userId
                    });

                    isLostorDamaged = "Damaged";

                    let qty;

                    if (!checkQuantity.damageQuantity) {
                        qty = 1;
                    } else {
                        qty = +checkQuantity.damageQuantity + 1;
                    }

                    await BookMaster.findByIdAndUpdate(checkQuantity._id, {
                        damageQuantity: qty,
                        updated_by: userId
                    });
                }
            }

            if (req.body.status == 4) {

                const checkBookDamage = await BookDamage.findOne({
                    bookMasterId: checkID.bookID,
                    bookdetailsMasterId: checkID._id,
                    itemStatus: req.body.status,
                    status: 1,
                    deleted: 0
                });

                if (!checkBookDamage) {

                    await BookDamage.create({
                        bookMasterId: checkID.bookID,
                        bookdetailsMasterId: checkID._id,
                        itemStatus: req.body.status,
                        remark: req.body.remark,
                        created_by: userId
                    });

                    let qtyLost;
                    let availableQuantity;

                    if (!checkQuantity.lostQuantity) {
                        qtyLost = 1;
                    } else {
                        qtyLost = +checkQuantity.lostQuantity + 1;
                    }

                    if (!checkQuantity.availableQuantity) {
                        availableQuantity = 0;
                    } else {
                        availableQuantity = +checkQuantity.availableQuantity - 1;
                    }

                    await BookMaster.findByIdAndUpdate(checkQuantity.id, {
                        lostQuantity: qtyLost,
                        availableQuantity: availableQuantity,
                        updated_by: userId
                    });

                    await BookDetailsMaster.findByIdAndUpdate(checkID._id, {
                        bookStatus: req.body.status,
                        remark: req.body.remark,
                        updated_by: userId
                    });

                    isLostorDamaged = "Lost";

                }

            }

            
            const clientIp = requestIp.getClientIp(req);

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            }

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Item Damaged/ Lost",
                operationType: `Item Damaged/ Lost - <a href="/damaged-items"><b>${ checkQuantity.title } (${req.body.bookRefNo})</b></a> has been reported as <b>${ isLostorDamaged }</b>`,
                userType: userType,
                created_by: userId
            });

            response.createResponse({
                message: "Item updated successfully"
            });

        }

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.getRequisitionStatus = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const books = await BookRequisitionStatusMaster.find({
        deleted: 0,
        status: 1,
    }, {
        "name": 1,
        "typeId": 1,
    }).sort({ createdAt: 1 });

    response.successResponse({
        message: `Total count= ${ books.length }`,
        data: books
    });

});

exports.bookRecover = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.bookId) {
        return next(new AppError("Invalid details", 500));
    }

    try {

        let bookId = req.body.bookId;
        let length = bookId.length;
        let recoveryData, lostData, checkIssue, checkID, bookDetails;

        if (length > 12) {

            recoveryData = await QrCodeDetails.findOne({
                _id: bookId,
                isAssigned: 1,
                deleted: 0
            });

        } else {

            recoveryData = await QrCodeDetails.findOne({
                bookReferenceNumber: bookId,
                isAssigned: 1,
                deleted: 0
            });

        }

        if (recoveryData) {

            lostData = await BookDamage.findOne({
                bookdetailsMasterId: recoveryData.bookDetailMasterId,
                itemStatus: 4,
                deleted: 0
            });

            if (lostData) {

                bookDetails = await BookMaster.findOne({
                    _id: lostData.bookMasterId,
                    deleted: 0,
                }, {
                    "title": 1,
                }).populate({
                    path: 'authorID',
                    select: ['first_name', 'middle_name', 'last_name']
                }).populate({
                    path: 'publisherID',
                    select: ['title']
                }).sort({ createdAt: -1 });

                response.successResponse({
                    bookDetails: bookDetails,
                    bookDetailsId: lostData.bookdetailsMasterId,
                    bookRefNo: recoveryData.bookReferenceNumber
                });

            } else {
                checkIssue = await BookIssue.findOne({
                    bookID: recoveryData.bookDetailMasterId,
                    bookReturnStatus: 0,
                    deleted: 0
                });

                if (checkIssue) {

                    checkID = await User.findById(checkIssue.employeeID, {
                        deleted: 0
                    });

                    if (checkID) {
                        return next(new AppError(`Lost details not found. Item already issue to Employee ID: ${ checkID.employee_id }`, 500));
                    } else {
                        return next(new AppError("Lost details not found.", 500));
                    }

                } else {
                    return next(new AppError("Lost details not found.", 500));
                }
            }

        } else {
            return next(new AppError("Lost details not found.", 500));
        }

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.recoverBookSubmit = catchAsync(async(req, res, next) => {
    
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.bookRefNo) {
        return next(new AppError("Book Reference not found", 500))
    }

    if (!req.body.bookId) {
        return next(new AppError("Book Id not found", 500))
    }

    if (!req.body.bookDetailsId) {
        return next(new AppError("Book Details Id not found", 500))
    }

    if (!req.body.status) {
        return next(new AppError("Please select condition", 500))
    }

    if (!req.body.remark) {
        return next(new AppError("Please enter remark", 500))
    }

    try {

        const checkQuantity = await BookMaster.findById(req.body.bookId, {
            deleted: 0
        });

        let qtyLost;
        let availableQuantity;

        if (!checkQuantity.lostQuantity) {
            qtyLost = 0;
        } else {
            qtyLost = +checkQuantity.lostQuantity - 1;
        }

        if (!checkQuantity.availableQuantity) {
            availableQuantity = 1;
        } else {
            availableQuantity = +checkQuantity.availableQuantity + 1;
        }

        await BookMaster.findByIdAndUpdate(req.body.bookId, {
            lostQuantity: qtyLost,
            availableQuantity: availableQuantity,
            updated_by: userId
        });

        await BookDetailsMaster.findByIdAndUpdate(req.body.bookDetailsId, {
            bookStatus: req.body.status,
            remark: req.body.remark,
            updated_by: userId
        });

        const lostData = await BookDamage.findOne({
            bookMasterId: req.body.bookId,
            bookdetailsMasterId: req.body.bookDetailsId,
            itemStatus: 4,
            deleted: 0
        });

        if (lostData) {
            await BookDamage.findByIdAndUpdate(lostData._id, {
                status: 0,
                deleted: 1,
                updated_by: userId
            });

            await BookRecover.create({
                bookMasterId: req.body.bookId,
                bookdetailsMasterId: req.body.bookDetailsId,
                bookRefNumber: req.body.bookRefNo,
                itemStatus: req.body.status,
                remark: req.body.remark,
                created_by: userId
            });

            if (req.body.status == 3) {

                const checkBookDamage = await BookDamage.findOne({
                    bookMasterId: req.body.bookId,
                    bookdetailsMasterId: req.body.bookDetailsId,
                    itemStatus: req.body.status,
                    status: 1,
                    deleted: 0
                });

                if (!checkBookDamage) {

                    await BookDamage.create({
                        bookMasterId: req.body.bookId,
                        bookdetailsMasterId: req.body.bookDetailsId,
                        itemStatus: req.body.status,
                        remark: req.body.remark,
                        created_by: userId
                    });

                    let qty;

                    if (!checkQuantity.damageQuantity) {
                        qty = 1;
                    } else {
                        qty = +checkQuantity.damageQuantity + 1;
                    }

                    await BookMaster.findByIdAndUpdate(req.body.bookId, {
                        damageQuantity: qty,
                        updated_by: userId
                    });
                }
            }

            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            } else {
                userType = "Employee"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Book Recover",
                operationType: `Item Reference Number: ${req.body.bookRefNo} was succcessfully recovered.`,
                userType: userType,
                created_by: userId
            });

            response.createResponse({
                message: "Item recovered successfully"
            });
        }

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.languageList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const languageList = await LanguageMaster.find({
        deleted: 0,
        status: 1
    }, {
        "name": 1,
    }).sort({ name: 1 });

    response.successResponse({
        languageList: languageList
    });

});


exports.bookRecoverList = catchAsync(async(req, res, next) => {

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

        books = await BookRecover.aggregate([
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
                        from: "bookjournalmagazinetypemasters",
                        localField: "bookMasterDetails.bookType",
                        foreignField: "typeId",
                        as: "type"
                    },
                },
                { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
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
                        "createdAt": 1,
                        "bookRefNumber": 1,
                        "itemStatus": 1,
                        "remark": 1,
                        "type.name": 1
                    }
                }
            ]).collation({ locale: "en" })
            .skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await BookRecover.aggregate([{
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
                    from: "bookjournalmagazinetypemasters",
                    localField: "bookMasterDetails.bookType",
                    foreignField: "typeId",
                    as: "type"
                },
            },
            { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
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
                    "createdAt": 1,
                    "bookRefNumber": 1,
                    "itemStatus": 1,
                    "remark": 1,
                    "type.name": 1
                }
            }
        ]).collation({ locale: "en" });

    } else {

        books = await BookRecover.aggregate([
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
                        from: "bookjournalmagazinetypemasters",
                        localField: "bookMasterDetails.bookType",
                        foreignField: "typeId",
                        as: "type"
                    },
                },
                { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        "bookMasterDetails.title": 1,
                        "bookMasterDetails._id": 1,
                        "bookMasterDetails.edition": 1,
                        "bookMasterDetails.bookType": 1,
                        "createdAt": 1,
                        "bookRefNumber": 1,
                        "itemStatus": 1,
                        "remark": 1,
                        "type.name": 1
                    }
                }
            ]).collation({ locale: "en" })
            .skip(pageSize * (currentPage - 1))
            .limit(pageSize);

        bookCount = await BookRecover.aggregate([{
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
                    from: "bookjournalmagazinetypemasters",
                    localField: "bookMasterDetails.bookType",
                    foreignField: "typeId",
                    as: "type"
                },
            },
            { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    "bookMasterDetails.title": 1,
                    "bookMasterDetails._id": 1,
                    "bookMasterDetails.edition": 1,
                    "bookMasterDetails.bookType": 1,
                    "createdAt": 1,
                    "bookRefNumber": 1,
                    "itemStatus": 1,
                    "remark": 1,
                    "type.name": 1
                }
            }
        ]).collation({ locale: "en" });
    }

    response.successResponse({
        recoverList: books,
        bookCount: bookCount.length
    });

});

exports.multiItemStatusChange = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.bookId) {
        Item
        return next(new AppError("Item details not found", 500))
    }

    arraylist = new Array();

    arraylist = req.body.bookId.split(",") ;

    
    try {

        for(const item of arraylist){

            const checkItemID = await BookMaster.findById(item, {
                deleted: 0
            });
    
            if (checkItemID.length == 0) {
                return next(
                    new AppError(
                        "Item details not found",
                        500, {
                            type: "book_not_found"
                        }
                    )
                );
            }
    
            let statusValue;
            let statusBeforeChanged;
            let statusAfterChanged;

            if(req.body.action == 'active'){
                statusValue = 1;
                statusAfterChanged = "Active";
            } else {
                statusValue = 0;
                statusAfterChanged = "Inactive";
            }
            const statusChange = await BookMaster.findByIdAndUpdate(item, {
                status: statusValue,
                updated_by: userId
            });
    
            const checkSuggested = await BookSuggested.findOne({
                bookmasterId: item,
                deleted: 0
            });
    
            if (checkSuggested) {
                await BookSuggested.findByIdAndUpdate(checkSuggested._id, {
                    status: statusValue,
                    updated_by: userId
                });
            }
    
            if (statusChange) {
    
                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                    userType = "Librarian"
                }
    
                let bookType;
    
                if(checkItemID.bookType == 1){
                    bookType = "Book";
                } else if(checkItemID.bookType == 2){
                    bookType = "Magazine";
                } else if(checkItemID.bookType == 3) {
                    bookType = "Journal";
                } else {
    
                }
    
    
                const clientIp = requestIp.getClientIp(req);
    
                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Book Status Change",
                    operationType: `${ bookType } Status Changed - <a href = "/books/book-details/${item}">${ checkItemID.title } </a> <b>Current status: </b> ${ statusAfterChanged } through bulk disable`,
                    userType: userType,
                    created_by: userId
                });
    
                
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        }

        response.createResponse({
            message: "Status changed successfully."
        });

    } catch (err) {
        return next(new AppError(err, 500));
    }
})

exports.findRack = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    // const checkDetails = await RackManagement.find({
    //     _id: req.params.id,
    // }, {
    //     "rackID": 1,
    //     "shelfID": 1,
    //     "qrCodeID": 1,
    //     "bookRefNo" : 1,

    // }).populate({
    //     path: 'BookMaster',
    //     select: ['bookType'],
    // });


    const checkDetails = await RackManagement.findById(req.params.id, {
        deleted: 0
    });

    if (checkDetails) {

        const bookDetails = await BookMaster.findById(checkDetails.bookID, {
            deleted: 0
        }, {
            "_id": 1,
            "title": 1,
            "bookType": 1
        });

        const racklist = await RackMaster.aggregate([{ $sort: { "createdAt": -1 } }, {
                $match: {
                    deleted: 0,
                    status: 1,
                    _id: checkDetails.rackID
                },
            },
            {
                $lookup: {
                    from: "librarymasters",
                    localField: "libraryID",
                    foreignField: "_id",
                    as: "libraryDetails"
                },
            },
            {
                $project: {
                    "rackName": 1,
                    "status": 1,
                    "libraryDetails.libraryName": 1
                }
            },
            { $unwind: { path: "$libraryDetails", preserveNullAndEmptyArrays: true } }
        ]);

        const shelfListDetails = await ShelfMaster.find({
            _id: checkDetails.shelfID,
            deleted: 0,
            status: 1
        }, {
            'shelfName': 1
        });

        response.successResponse({
            RackData: checkDetails,
            bookDetails: bookDetails, 
            RackList: racklist,
            shelfListDetails: shelfListDetails
        });

    } else {
        return next(new AppError("Rack details not found.", 500));
    }
});

exports.updateRackManagement = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.rackManagementId == "") {
        return next(new AppError("Rack management details not found", 500));
    }

    const checkRackManagementID = await RackManagement.findById(req.body.rackManagementId, {
        deleted: 0
    });

    if (checkRackManagementID) {
        try {

            const updateData = {
                rackID: req.body.rackID,
                shelfID: req.body.shelfID,
                updated_by: userId
            }

            const updateRackManagementData = await RackManagement.findByIdAndUpdate(req.body.rackManagementId, updateData);

            if (updateRackManagementData) {

                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2) {
                    userType = "Librarian"
                }
                
                let activity_data = [];

                if (checkRackManagementID.rackID != req.body.rackID) {

                    let oldRackTitle = await rackMaster.findById((checkRackManagementID.rackID ), {
                        "rackName": 1
                    });

                    let newRackTitle = await rackMaster.findById((req.body.rackID ), {
                        "rackName": 1
                    });

                    activity_data.push(`<b>Rack Modified :</b> "${ oldRackTitle.rackName }" to "${ newRackTitle.rackName }"`);
                }

                const clientIp = requestIp.getClientIp(req);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Update Rack Management",
                    operationType: `Rack Management Updated - <a href="/rack-management"></a> <p>${ activity_data } </p>`,
                    userType: userType,
                    created_by: userId
                });

                const data = {
                    id: updateRackManagementData._id,
                };

                response.createResponse({
                    message: "Rack management updated successfully.",
                    author: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } catch (err) {
            return next(new AppError(err, 500));
        }
    } else {
        return next(new AppError("Rack management details not found.", 500));
    }
});


// console.log(req.socket.remoteAddress);