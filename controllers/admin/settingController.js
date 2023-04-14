const catchAsync = require("../../utils/catchAsync");
const SettingMaster = require("../../models/admin/settingMaster");
const BookReturnDaysHistory = require("../../models/admin/bookReturnDaysHistory");
const MaximumBookIssuedHistory = require("../../models/admin/maximumBookIssuedHistory");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const Activity = require("../../models/activity/activityLog");
const requestIp = require('request-ip');

exports.store = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';
    let bookReturnValue = '';

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.bookReturnDays == "" && req.body.maximumBookIssued == "") {
        return next(new AppError("Please fill atleaset one field.", 500));
    }

    if (req.body.bookReturnDays < 1) {
        return next(
            new AppError("Invalid Input", 400, { type: "returnDays" })
        );
    }

    if (!req.body.port) {
        return next(
            new AppError("Please enter port", 400, { type: "port" })
        );
    }

    if (!req.body.host) {
        return next(
            new AppError("Please enter host", 400, { type: "host" })
        );
    }

    if (!req.body.protocol) {
        return next(
            new AppError("Please select protocol", 400, { type: "protocol" })
        );
    }

    if (!req.body.username) {
        return next(
            new AppError("Please enter username", 400, { type: "username" })
        );
    }

    if (!req.body.password) {
        return next(
            new AppError("Please enter password", 400, { type: "password" })
        );
    }

    if (req.body.maximumBookIssued < 1) {
        return next(
            new AppError("Invalid Input", 400, { type: "maximumBook" })
        );
    }

    if (req.body.reminderOne) {
        if (+req.body.reminderOne < 1) {
            return next(
                new AppError("Invalid Input", 400, { type: "reminderOne" })
            );
        }
    }

    if (req.body.reminderTwo) {
        if (+req.body.reminderTwo < 1) {
            return next(
                new AppError("Invalid Input", 400, { type: "reminderTwo" })
            );
        }
    }

    const existingSettingByDetails = await SettingMaster.findOne({
        status: 1,
        deleted: 0
    });

    if (existingSettingByDetails) {
        try {

            if (req.body.reminderOne) {
                if (+req.body.reminderOne > +req.body.bookReturnDays) {
                    return next(
                        new AppError("Invalid Input. Reminder 1 can not be greater than book return days", 400, { type: "reminderOne" })
                    );
                }
            }

            if (req.body.reminderTwo) {
                if (+req.body.reminderTwo > +req.body.bookReturnDays) {
                    return next(
                        new AppError("Invalid Input. Reminder 2 can not be greater than book return days", 400, { type: "reminderTwo" })
                    );
                }
            }

            if (req.body.reminderOne && req.body.reminderTwo) {
                if (+req.body.reminderOne > +req.body.reminderTwo) {
                    return next(
                        new AppError("Invalid Input. Reminder 2 must be greater than reminder 1", 400, { type: "reminderTwo" })
                    );
                }
            }

            if (req.body.reminderOne && req.body.reminderTwo) {
                if (+req.body.reminderOne == +req.body.reminderTwo) {
                    return next(
                        new AppError("Invalid Input. Reminder 1 can not be equal with reminder 2", 400, { type: "reminderTwo" })
                    );
                }
            }

            if (existingSettingByDetails.maximumBookIssued == req.body.maximumBookIssued) {

                await SettingMaster.findByIdAndUpdate(existingSettingByDetails.id, {
                    bookReturnDays: req.body.bookReturnDays,
                    reminderOne: req.body.reminderOne,
                    reminderTwo: req.body.reminderTwo,
                    port: req.body.port,
                    host: req.body.host,
                    protocol: req.body.protocol,
                    username: req.body.username,
                    password: req.body.password,
                    reviewApproval: req.body.approveStatus,
                    updated_by: userId
                });

                await BookReturnDaysHistory.create({
                    bookReturnDays: req.body.bookReturnDays,
                    created_by: userId
                });
            }

            if (existingSettingByDetails.bookReturnDays == req.body.bookReturnDays) {

                await SettingMaster.findByIdAndUpdate(existingSettingByDetails.id, {
                    maximumBookIssued: req.body.maximumBookIssued,
                    reminderOne: req.body.reminderOne,
                    reminderTwo: req.body.reminderTwo,
                    port: req.body.port,
                    host: req.body.host,
                    protocol: req.body.protocol,
                    username: req.body.username,
                    password: req.body.password,
                    reviewApproval: req.body.approveStatus,
                    updated_by: userId
                });

                await MaximumBookIssuedHistory.create({
                    maximumBookIssued: req.body.maximumBookIssued,
                    created_by: userId
                });
            }

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            let activity_data = [];

            if (existingSettingByDetails.bookReturnDays != req.body.bookReturnDays) {
                activity_data.push(`<b>Return Period :</b> "${ existingSettingByDetails.bookReturnDays }" to "${ req.body.bookReturnDays }"`);
            }

            if (existingSettingByDetails.maximumBookIssued != req.body.maximumBookIssued) {
                activity_data.push(`<b>Maximum Book Issued :</b> "${ existingSettingByDetails.maximumBookIssued }" to "${ req.body.maximumBookIssued }"`);
            }

            if (existingSettingByDetails.reminderOne != req.body.reminderOne) {
                activity_data.push(`<b>Reminder 1 :</b> "${ existingSettingByDetails.reminderOne }" to "${ req.body.reminderOne }"`);
            }

            if (existingSettingByDetails.reminderTwo != req.body.reminderTwo) {
                activity_data.push(`<b>Reminder 2 :</b> "${ existingSettingByDetails.reminderTwo }" to "${ req.body.reminderTwo }"`);
            }

            if (existingSettingByDetails.port != req.body.port) {
                activity_data.push(`<b>Port :</b> "${ existingSettingByDetails.port }" to "${ req.body.port }"`);
            }

            if (existingSettingByDetails.host != req.body.host) {
                activity_data.push(`<b>Host :</b> "${ existingSettingByDetails.host }" to "${ req.body.host }"`);
            }

            if (existingSettingByDetails.protocol != req.body.protocol) {
                activity_data.push(`<b>Protocol :</b> "${ existingSettingByDetails.protocol }" to "${ req.body.protocol }"`);
            }

            if (existingSettingByDetails.username != req.body.username) {
                activity_data.push(`<b>Username :</b> "${ existingSettingByDetails.username }" to "${ req.body.username }"`);
            }
            let statusBeforeChange;
            let statusAfterChange;
            if (existingSettingByDetails.reviewApproval != req.body.approveStatus) {
                if(existingSettingByDetails.reviewApproval == 1){
                    statusBeforeChange = "Active";
                    statusAfterChange = "Inactive";
                } else {
                    statusBeforeChange = "Inactive";
                    statusAfterChange = "Active";
                }
                activity_data.push(`<b>Approve Status :</b> "${ statusBeforeChange }" to "${ statusAfterChange }"`);
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Setting",
                operationType: `<a href="/setting">Setting Updated</a> - <p>${activity_data}</p>`,
                userType: userType,
                created_by: userId
            });

            response.createResponse({
                message: "Setting successfully updated."
            });

        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }

    } else {

        if (req.body.bookReturnDays == null || req.body.bookReturnDays == "" || req.body.bookReturnDays == undefined) {
            bookReturnValue = "";
        } else {
            bookReturnValue = req.body.bookReturnDays;
        }

        if (req.body.maximumBookIssued == null || req.body.maximumBookIssued == "" || req.body.maximumBookIssued == undefined) {
            maximumBookIssuedValue = "";
        } else {
            maximumBookIssuedValue = req.body.maximumBookIssued;
        }

        try {

            if (req.body.reminderOne) {
                if (+req.body.reminderOne > +req.body.bookReturnDays) {
                    return next(
                        new AppError("Invalid Input. Reminder 1 can not be greater than book return days", 400, { type: "reminderOne" })
                    );
                }
            }

            if (req.body.reminderTwo) {
                if (+req.body.reminderTwo > +req.body.bookReturnDays) {
                    return next(
                        new AppError("Invalid Input. Reminder 2 can not be greater than book return days", 400, { type: "reminderTwo" })
                    );
                }
            }

            if (req.body.reminderOne && req.body.reminderTwo) {
                if (+req.body.reminderOne > +req.body.reminderTwo) {
                    return next(
                        new AppError("Invalid Input. Reminder 2 must be greater than reminder 1", 400, { type: "reminderTwo" })
                    );
                }
            }

            if (req.body.reminderOne && req.body.reminderTwo) {
                if (+req.body.reminderOne == +req.body.reminderTwo) {
                    return next(
                        new AppError("Invalid Input. Reminder 1 can not be equal with reminder 2", 400, { type: "reminderTwo" })
                    );
                }
            }

            const newSetting = await SettingMaster.create({
                bookReturnDays: bookReturnValue,
                maximumBookIssued: maximumBookIssuedValue,
                reminderOne: req.body.reminderOne,
                reminderTwo: req.body.reminderTwo,
                port: req.body.port,
                host: req.body.host,
                protocol: req.body.protocol,
                username: req.body.username,
                password: req.body.password,
                reviewApproval: req.body.approveStatus,
                created_by: userId
            });

            if (req.body.bookReturnDays) {
                await BookReturnDaysHistory.create({
                    bookReturnDays: bookReturnValue,
                    created_by: userId
                });
            }

            if (req.body.maximumBookIssued) {

                await MaximumBookIssuedHistory.create({
                    maximumBookIssued: maximumBookIssuedValue,
                    created_by: userId
                });
            }

            if (newSetting) {

                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2) {
                    userType = "Librarian"
                }

                const clientIp = requestIp.getClientIp(req);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Setting",
                    operationType: `<a href="/setting">Setting Created</a>`,
                    userType: userType,
                    created_by: userId
                });

                const data = {
                    id: newSetting._id,
                };

                response.createResponse({
                    message: "Setting successfully added",
                    setting: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }
    }

});

exports.getSetting = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const existingSettingByDetails = await SettingMaster.findOne({
        status: 1,
        deleted: 0
    }, {
        'bookReturnDays': 1,
        'maximumBookIssued': 1,
        'reminderOne': 1,
        'reminderTwo': 1,
        'host': 1,
        'password': 1,
        'port': 1,
        'service': 1,
        'username': 1,
        'protocol': 1,
        'reviewApproval': 1
    });

    let settingDetails = "";

    if (existingSettingByDetails) {
        settingDetails = existingSettingByDetails;
    } else {
        settingDetails = [];
    }

    response.successResponse({
        settingData: settingDetails
    });
});