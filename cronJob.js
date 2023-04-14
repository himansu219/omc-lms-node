var cron = require('node-cron');
const SettingMaster = require("./models/admin/settingMaster");
const BookIssue = require("./models/admin/BookIssue");
const BookMaster = require("./models/admin/BookMaster");
const BookDetailsMaster = require("./models/admin/BookDetailsMaster");
const BookRequest = require("./models/employee/BookRequest");
const Bookrating = require("./models/employee/bookRating");
const PopularBook = require("./models/admin/popularBook");
const helper = require("./utils/helper");
const fsExtra = require('fs-extra');

const backupCron = require('./mongodb_backup.js');

// Cron for Reminder 1

cron.schedule('30 10 * * * ', async() => {
    //cron.schedule('*/25 * * * * * ', async() => {

    // Get reminder date from setting collection

    const existingSettingByDetails = await SettingMaster.findOne({
        status: 1,
        deleted: 0
    }, {
        'bookReturnDays': 1,
        'maximumBookIssued': 1,
        'reminderOne': 1,
        'reminderTwo': 1
    });

    if (existingSettingByDetails && existingSettingByDetails.reminderOne) {
        const reminderOne = existingSettingByDetails.reminderOne;

        const issueDetails = await BookIssue.find({
            bookReturnStatus: 0,
            status: 1,
            deleted: 0
        }, {
            "issueDate": 1,
            "bookID": 1
        }).populate({
            path: 'employeeID',
            select: ['name', 'email', 'employee_id']
        });

        if (issueDetails.length > 0) {
            for (const iterator of issueDetails) {

                const currentDate = new Date();
                const issueDate = iterator.issueDate;
                const reminderOneDate = new Date(issueDate.getTime() + (reminderOne * 24 * 60 * 60 * 1000));

                if (currentDate == reminderOneDate) {

                    const checkbookName = await BookDetailsMaster.findOne({
                        deleted: 0
                    }, {
                        "_id": 1,
                    }).populate({
                        path: 'bookID',
                        select: ['title']
                    });

                    const subject = "Reminder 1 | OMC Reads";
                    const textContent = "Reminder 1";
                    const name = iterator.employeeID.name;
                    const email = iterator.employeeID.email;

                    const html = `<p>This is your first reminder for returning the book ${checkbookName.bookID.title}.</p>`;

                    helper.sendMail(subject, textContent, name, email, html);
                }
            }
        }
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

// Cron for Reminder 2

cron.schedule('30 10 * * * ', async() => {
    //cron.schedule('*/10 * * * * * ', async() => {

    const existingSettingByDetails = await SettingMaster.findOne({
        status: 1,
        deleted: 0
    }, {
        'bookReturnDays': 1,
        'maximumBookIssued': 1,
        'reminderOne': 1,
        'reminderTwo': 1
    });

    if (existingSettingByDetails && existingSettingByDetails.reminderTwo) {
        const reminderTwo = existingSettingByDetails.reminderTwo;

        const issueDetails = await BookIssue.find({
            bookReturnStatus: 0,
            status: 1,
            deleted: 0
        }, {
            "issueDate": 1,
            "bookID": 1
        }).populate({
            path: 'employeeID',
            select: ['name', 'email', 'employee_id']
        });

        if (issueDetails.length > 0) {
            for (const iterator of issueDetails) {

                const currentDate = new Date();
                const issueDate = iterator.issueDate;
                const reminderTwoDate = new Date(issueDate.getTime() + (reminderTwo * 24 * 60 * 60 * 1000));

                if (currentDate == reminderTwoDate) {

                    const checkbookName = await BookDetailsMaster.findOne({
                        deleted: 0
                    }, {
                        "_id": 1,
                    }).populate({
                        path: 'bookID',
                        select: ['title']
                    });

                    const subject = "Reminder 2 | OMC Reads";
                    const textContent = "Reminder 2";
                    const name = iterator.employeeID.name;
                    //const email = iterator.employeeID.email;
                    const email = "pinaki.dash@ntspl.co.in";

                    const html = `<p>This is your second reminder for returning the book ${checkbookName.bookID.title}.</p>`;

                    helper.sendMail(subject, textContent, name, email, html);

                }

            }
        }
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

// Cron for popular book

cron.schedule('* * * * * *', async() => {

    const popularBook = await BookIssue.aggregate([{
            $match: {
                deleted: 0
            }
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
            $project: {
                "bookDetails.bookID": 1
            }
        },
        { $unwind: { path: "$bookDetails", preserveNullAndEmptyArrays: true } },
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
                "bookMasterDetails._id": 1,
            }
        },
        { $unwind: { path: "$bookMasterDetails", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: { bookID: "$bookMasterDetails._id" },
                issue: { $sum: 1 },
                doc: {
                    $push: "$$ROOT"
                }
            }
        },
        {
            $project: {
                issue: "$issue"
            }
        }
    ]);

    for (const iterator of popularBook) {
        const reqBook = await BookRequest.find({
            bookID: iterator._id.bookID,
            deleted: 0,
            bookRequestStatus: 1
        });

        const bookData = await PopularBook.findOne({
            bookMasterID: iterator._id.bookID,
            deleted: 0,
        });

        if (bookData) {

            try {

                await PopularBook.findByIdAndUpdate(bookData.id, {
                    noOfIssue: iterator.issue,
                    noOfRequest: reqBook.length
                });

                //console.log("updated");

            } catch (err) {

                console.log("updated" + err);
                return next(new AppError("Something went wrong.", 500));
            }

        } else {

            try {
                await PopularBook.create({
                    bookMasterID: iterator._id.bookID,
                    noOfIssue: iterator.issue,
                    noOfRequest: reqBook.length
                });
                //console.log("insert");

            } catch (err) {
                console.log("insert" + err);
            }
        }
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

// Cron for updating book average rating

cron.schedule('* * * * * *', async() => {

    await BookMaster.updateMany({}, {
        $set: {
            rating: 0
        }
    });

    const bookrating = await Bookrating.aggregate([{
            $match: {
                active: 1,
                status: 1,
                deleted: 0
            }
        },
        {
            $group: {
                _id: "$bookMasterID",
                avgRating: { $avg: "$rating" }
            }

        }
    ]);

    if (bookrating.length > 0) {

        try {

            for (const iterator of bookrating) {
                await BookMaster.findByIdAndUpdate(iterator._id, {
                    rating: iterator.avgRating.toFixed(1)
                });
                //console.log("success");
            }
        } catch (err) {
            console.log(err);
        }
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

// Cron for deleting export files at everyday midnight 00.00

cron.schedule('0 0 * * *', async() => {

    try {
        await fsExtra.emptyDir('images/export');
        console.log('Done!');
    } catch (err) {
        console.log(err);
    }


}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

// Cron for sending email to employees after availability of book

cron.schedule('*/10 * * * * *', async() => {

    const books = await BookRequest.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
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
                from: "bookjournalmagazinetypemasters",
                localField: "bookID.bookType",
                foreignField: "typeId",
                as: "type"
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
        { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$bookID", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$employeeID", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "bookID.title": 1,
                "bookID.bookType": 1,
                "bookID.availableQuantity": 1,
                "type.name": 1,
                "employeeID.email": 1,
                "employeeID.name": 1,
            }
        }
    ]);

    if (books.length > 0) {
        for (const iterator of books) {
            if (iterator.bookID.availableQuantity && iterator.bookID.availableQuantity > 0) {
                const subject = `${iterator.type.name} Available | OMC Reads`;
                const textContent = `${iterator.type.name} Available`;
                const name = iterator.employeeID.name;
                const email = iterator.employeeID.email;

                const html = `<p>${iterator.bookID.title} ${iterator.type.name} is now available.</p><p>Available Quantity: ${iterator.bookID.availableQuantity}</p>`;

                helper.sendMail(subject, textContent, name, email, html);

            }
        }
    }
}, {
    scheduled: false,
    timezone: "Asia/Kolkata"
});

// Cron for autobackup

cron.schedule('*/10 * * * * *', async() => {
    backupCron.dbAutoBackUp();
}, {
    scheduled: false,
    timezone: "Asia/Kolkata"
});