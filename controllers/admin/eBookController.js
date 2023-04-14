const catchAsync = require("../../utils/catchAsync");
const BookMaster = require("../../models/admin/eBook");
const User = require("../../models/auth/user");
const Activity = require("../../models/activity/activityLog");
const requestIp = require('request-ip');
const helper = require("../../utils/helper");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const GenreMaster = require("../../models/admin/genreMaster");
const AuthorMaster = require("../../models/admin/authorMaster");
const PublisherMaster = require("../../models/admin/publisherMaster");
const eBookViewers = require("../../models/admin/eBookViewers");

let userId = '';
let imgFrontData = '';
let imgBackData = '';
let downloadURL = '';

exports.store = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    const existingBookByOtherDetails = await BookMaster.findOne({
        title: req.body.title,
        authorID: req.body.author,
        genreID: req.body.genres,
        edition: req.body.edition,
        publisherID: req.body.publisher,
        downloadURL: req.body.downloadURL,
        //status: 1,
        deleted: 0
    });

    if (existingBookByOtherDetails) {
        return next(
            new AppError("E-Book already exists", 400, { type: "duplicate e book" })
        );
    }

    const existingBookByUrl = await BookMaster.findOne({
        downloadURL: req.body.downloadURL,
        deleted: 0
    });

    if (existingBookByUrl) {
        return next(
            new AppError("URL already exists", 400, { type: "duplicate e book" })
        );
    }

    if (req.files.f_image == undefined) {
        imgFrontData = null;
    } else {
        imgFrontData = "images/e-book/" + req.files.f_image[0].filename;
    }

    if (req.files.b_image == undefined) {
        imgBackData = null;
    } else {
        imgBackData = "images/e-book/" + req.files.b_image[0].filename;
    }

    if (req.body.type == 1) {
        if (req.files.pdf == undefined) {
            downloadURL = null;
        } else {
            downloadURL = "images/e-book/" + req.files.pdf[0].filename;
        }
    } else {
        downloadURL = req.body.downloadURL
    }


    try {

        const newBook = await BookMaster.create({
            title: req.body.title,
            isbn: req.body.isbn,
            authorID: req.body.author,
            genreID: req.body.genres,
            edition: req.body.edition,
            pages: req.body.pages,
            publisherID: req.body.publisher,
            publishedYear: req.body.publishedYear,
            description: req.body.description,
            type: req.body.type,
            downloadURL: downloadURL,
            language: req.body.language,
            front_image: imgFrontData,
            back_image: imgBackData,
            created_by: userId
        });

        if (newBook) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Add E-Book",
                operationType: `Add E-Book - <a href="/e-book/e-book-details/${ newBook._id }"><b>${ req.body.title }</b></a>`,
                userType: userType,
                created_by: userId
            });

            const data = {
                title: newBook.title,
                id: newBook._id,
            };

            response.createResponse({
                message: "E-Book successfully added",
                book: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.bookUpdate = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let downloadURL = '';

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.bookId == "") {
        return next(new AppError("E Book details not found", 500));
    }

    const checkbookID = await BookMaster.findById(req.body.bookId, {
        deleted: 0
    });

    if (checkbookID) {
        try {

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
                    new AppError("E-Book already exists", 400, { type: "duplicate e book" })
                );
            }

            if (req.files.f_image == undefined) {
                imgFrontData = null;
            } else {
                imgFrontData = "images/e-book/" + req.files.f_image[0].filename;
            }

            if (req.files.b_image == undefined) {
                imgBackData = null;
            } else {
                imgBackData = "images/e-book/" + req.files.b_image[0].filename;
            }

            if (req.body.type == 1) {
                if (req.files.pdf == undefined) {
                    downloadURL = null;
                } else {
                    downloadURL = "images/e-book/" + req.files.pdf[0].filename;
                }
            } else {
                downloadURL = req.body.downloadURL
            }

            const updateData = {
                title: req.body.title,
                isbn: req.body.isbn,
                authorID: req.body.author,
                genreID: req.body.genres,
                edition: req.body.edition,
                pages: req.body.pages,
                publisherID: req.body.publisher,
                type: req.body.type,
                publishedYear: req.body.publishedYear,
                description: req.body.description,
                language: req.body.language,
                updated_by: userId
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

            if (downloadURL) {
                updateData.downloadURL = downloadURL;
            }

            const updateBook = await BookMaster.findByIdAndUpdate(req.body.bookId, updateData);

            if (updateBook) {

                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2) {
                    userType = "Librarian"
                }

                const clientIp = requestIp.getClientIp(req);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Update e-Book",
                    operationType: "Update e-Book",
                    userType: userType,
                    created_by: userId
                });

                const data = {
                    id: updateBook._id,
                };

                response.createResponse({
                    message: "E-book details updated successfully.",
                    book: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }
    } else {
        return next(new AppError("E-Book details not found.", 500));
    }
});

exports.bookList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const books = await BookMaster.find({
        deleted: 0,
    }, {
        "title": 1,
        "edition": 1,
        "status": 1,
        "pages": 1,
        "type": 1,
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
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total ebooks count= ${ books.length }`,
        ebookList: books
    });

});

exports.bookListByStatus = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const books = await BookMaster.find({
        deleted: 0,
        status: 1
    }, {
        "title": 1,
        "type": 1,
        "downloadURL": 1,
    }).sort({ createdAt: -1 });


    response.successResponse({
        message: `Total books count= ${ books.length }`,
        ebookList: books
    });

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
        "type": 1,
        "front_image": 1,
        "back_image": 1,
        "language": 1,
        "downloadURL": 1,
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

        response.successResponse({
            message: `Book Details`,
            bookData: bookDetails,
        });
    } else {
        return next(new AppError("Book details not found.", 500));
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
        return next(new AppError("Book details not found", 500))
    }

    try {

        const deleteBook = await BookMaster.findByIdAndUpdate(req.body.bookId, {
            deleted: 1,
            updated_by: userId
        });

        if (deleteBook) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "E-Book Delete",
                operationType: `E-Book Deleted - <b>${ deleteBook.title }</b>`,
                userType: userType,
                created_by: userId
            });

            const data = {
                id: deleteBook._id,
            };

            response.createResponse({
                message: "E-Book deleted successfully.",
                book: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }

    } catch (err) {
        return next(new AppError("Something went wrong", 500));
    }

});

exports.bookStatusChange = catchAsync(async(req, res, next) => {

    // BookMaster.updateMany({}, { $push: { type: 2 } }, { upsert: true }, function(err) {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         console.log("Successfully added");
    //     }
    // });

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.bookId) {
        return next(new AppError("E-Book details not found", 500))
    }

    if (!req.body.status) {
        return next(new AppError("E-Book status not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await BookMaster.find({
            _id: req.body.bookId
        });

        if (checkDetailsMasterDataId.length == 0) {
            return next(
                new AppError(
                    "E-Book details not found",
                    500, {
                        type: "e_book_not_found"
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

        const statusChange = await BookMaster.findByIdAndUpdate(req.body.bookId, {
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
                pageDetail: "E-Book Status Change",
                operationType: `E-Book Status Changed - <a href="/e-book"><b>${ statusChange.title }</b></a> <b>Status: </b> ${ statusBeforeChange } to ${ statusAfterChange }`,
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

exports.storeEbookView = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    const checkEmployeeViewedOrNot = await eBookViewers.findOne({
        employeeID: req.body.empId,
        ebookID: req.body.bookId,
    });

    console.log(req.body.bookId, req.body.empId);
   
    if(!checkEmployeeViewedOrNot || checkEmployeeViewedOrNot.length == 0){
        try {

            const eBookUpdate = await eBookViewers.create({
                ebookID: req.body.bookId,
                employeeID: req.body.empId,
                created_by: userId
            });

        } catch (err) {
            return next(new AppError(err, 500));
        }
    }

});