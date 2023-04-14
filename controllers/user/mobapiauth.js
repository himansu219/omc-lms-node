const catchAsync = require("../../utils/catchAsync");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const OTPHistory = require("../../models/auth/otp-history");
const AuthAttempt = require("../../models/auth/authAttempt");
const User = require("../../models/auth/user");
const Role = require("../../models/admin/userRoleMaster");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const MobAppSuccess = require("../../utils/mobAppSuccess");
const MobAppError = require("../../utils/mobAppError");
const helper = require("../../utils/helper");
const Notification = require("../../models/admin/notification");
const Activity = require("../../models/activity/activityLog");
const requestIp = require('request-ip');

exports.register = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = req.user._id;
    const existingUserByEmail = await User.findOne({
        email: req.body.empEmail,
        status: 1,
        deleted: 0,
    });

    if (existingUserByEmail) {
        return next(new AppError("Email already exists", 400, { type: "email" }));
    }

    const existingUserByMobile = await User.findOne({
        mobile: req.body.empMobile,
        status: 1,
        deleted: 0
    });

    if (existingUserByMobile) {
        return next(
            new AppError("Mobile number already exists", 400, { type: "phone" })
        );
    }

    const existingUserByEmpId = await User.findOne({
        employee_id: req.body.empId,
        status: 1,
        deleted: 0
    });

    if (existingUserByEmpId) {
        return next(
            new AppError("Employee ID already exists", 400, { type: "emp_id" })
        );
    }

    const newuser = await User.create({
        name: req.body.empName,
        designation: req.body.empDesignation,
        mobile: req.body.empMobile,
        email: req.body.empEmail,
        gender: req.body.gender,
        department: req.body.empDepartment,
        employee_id: req.body.empId,
        address: req.body.empAddress,
        user_role: req.body.empUserType,
        created_by: userId
    });

    if (newuser) {

        let userType;
        if (req.user.user_role == 1) {
            userType = "Admin"
        } else if (req.user.user_role == 2) {
            userType = "Librarian"
        }

        let userTypeRole;
        if (req.body.empUserType == 2) {
            userTypeRole = "Add User"
        } else if (req.body.empUserType == 3) {
            userTypeRole = "Add Employee"
        }

        const clientIp = requestIp.getClientIp(req);

        await Activity.create({
            ipAddress: clientIp,
            pageDetail: userTypeRole,
            operationType: userTypeRole,
            userType: userType,
            created_by: userId
        });

        let subject;
        let textContent;

        if (req.body.empUserType == 2) {
            subject = 'User Registration | OMC LMS';
            textContent = 'User Registration';
        } else {
            subject = 'Employee Registration | OMC LMS';
            textContent = 'Employee Registration';
        }

        const name = newuser.name;
        const email = newuser.email;
        const html = `<p>You have been successfully registered in the OMC Reads.</p><br/>`;

        helper.sendMail(subject, textContent, name, email, html);

        const userNewData = {
            id: newuser._id,
            name: newuser.name,
            email: newuser.email
        };

        response.createResponse({
            message: "User successfully created",
            user: userNewData,
        });
    } else {
        return next(new AppError("Something went wrong", 500));
    }

});

exports.login = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    // TODO: Business logic goes here
    let fetchedUser;

    const clientIp = requestIp.getClientIp(req);

    User.findOne({
            email: req.body.UserId,
            deleted: 0,
            verified: true,
            user_role: { $in: [1, 2] },
        })
        .then(async(user) => {
            if (!user) {

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Login Page",
                    operationType: `Login failed with ${req.body.UserId}`,
                    userType: "Invalid User",
                });

                return next(new AppError("User not found.", 400));
            }

            if (user && user.status == 0) {

                let expireTime = new Date(user.block_expiry_time).getTime();

                let currentTime = new Date().getTime();

                if (currentTime > expireTime) {

                    await AuthAttempt.updateMany({
                        user: user._id,
                        status: 1,
                        deleted: 0,
                    }, { $set: { "deleted": 1 } });

                    await User.findByIdAndUpdate(user._id, {
                        status: 1,
                        block_expiry_time: null
                    });

                } else {
                    let minuteValue = "";

                    let timeLeft = Math.trunc((expireTime - currentTime) / 3600000);

                    if (timeLeft === 1) {
                        minuteValue = "hour";
                    } else {
                        minuteValue = "hours";
                    }

                    if (timeLeft === 0) {

                        timeLeft = Math.trunc(((expireTime - currentTime) / 3600000) * 60);

                        if (timeLeft === 1) {
                            minuteValue = "minute";
                        } else {
                            minuteValue = "minutes";
                        }
                    }

                    if (timeLeft === 0) {

                        timeLeft = Math.trunc(((expireTime - currentTime) / 3600000) * 60 * 60);

                        if (timeLeft === 1) {
                            minuteValue = "second";
                        } else {
                            minuteValue = "seconds";
                        }
                    }

                    return next(new AppError(`Your account has been blocked for ${timeLeft} ${minuteValue}.`, 400));
                }

            }
            fetchedUser = user;
            let userType;
            if (fetchedUser.user_role == 1) {
                userType = "Admin"
            } else if (fetchedUser.user_role == 2) {
                userType = "Librarian"
            }
            bcrypt.compare(req.body.Password, user.password, async(err, ret) => {
                if (ret) {
                    const data = {
                        email: fetchedUser.email,
                        name: fetchedUser.name,
                        id: fetchedUser._id,
                        user_role: fetchedUser.user_role,
                    };
                    req["user_details"] = {
                        ...data,
                        role: fetchedUser.user_role
                    };

                    const token = jwt.sign(data, "secret_this_should_be_longer", {
                        expiresIn: "10d",
                    });

                    Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Login Page",
                        operationType: `Login Successfull - ${fetchedUser.email}`,
                        userType: userType,
                        created_by: fetchedUser._id
                    });

                    response.successResponse({
                        message: "Login Successful.",
                        user_info: data,
                        token: token,
                    });
                } else {

                    await AuthAttempt.create({
                        user: user.id,
                        ipAddress: clientIp,
                    });

                    await Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Login Page",
                        operationType: `Invalid Credentials - ${fetchedUser.email}`,
                        userType: userType,
                        created_by: fetchedUser._id
                    });

                    const checkLogin = await AuthAttempt.find({
                        user: user.id,
                        status: 1,
                        deleted: 0,
                        createdAt: {
                            // 1 day ago (from now)
                            $gte: new Date(new Date().getTime() - 1000 * 60 * 60 * 24),
                        },
                    });

                    let msg;

                    if (checkLogin.length == 5) {

                        msg = "Invalid Credentials. You have been blocked for 24 hours. Please check your mail for unblock";

                        await User.findByIdAndUpdate(user.id, {
                            status: 0,
                            block_expiry_time: new Date(new Date().getTime() + 1000 * 60 * 60 * 24)
                        });

                        const subject = "Unblock Account | OMC Reads";
                        const textContent = "Unblock Account";
                        const name = user.name;
                        const email = user.email;

                        const url = req.protocol + "://" + req.get("host");

                        const sendUrl = url + "/api/v1/user/unblock-account/" + user.id;

                        const html = `<p>Your account has been blocked for 24 hours due to too many login attempts.</p>
                        <p>To unblock the account please follow the below link.</p>
                        <p><a href="${sendUrl}">Click here</a> to unblock the account</p><br>`;

                        helper.sendMail(subject, textContent, name, email, html);

                    } else {
                        msg = `Invalid Credentials. Attempts remaining for today: ${5 - checkLogin.length}`;

                    }

                    return next(new AppError(msg, 400));
                }
            });

        })
        .catch((err) => {
            return next(new AppError(err, 400));
        });
});

exports.verifyOtp = catchAsync(async(req, res, next) => {
    const userId = "";
    await User.findByIdAndUpdate();
});

exports.employeeList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;

    // const employeeFind = await User.find({
    //         user_role: 3,
    //         deleted: 0
    //     }).sort({ createdAt: -1 })
    //     .skip(pageSize * (currentPage - 1))
    //     .limit(pageSize);

    const empDetails = await User.find({
        deleted: 0,
        user_role: { $in: [1, 2, 3] },
    }, {
        "name": 1,
        "employee_id": 1,
        "status": 1
    }).populate({
        path: 'department',
        select: ['departmentName']
    }).populate({
        path: 'designation',
        select: ['designationName']
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total employee count= ${ empDetails.length }`,
        empList: empDetails
    });

});

exports.employeeFind = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const empDetails = await User.aggregate([{
            $match: {
                deleted: 0,
                $expr: { $eq: ['$_id', { $toObjectId: req.params.id }] }
            },
        },
        {
            $lookup: {
                from: "departmentmasters",
                localField: "department",
                foreignField: "_id",
                as: "department"
            },
        },
        {
            $lookup: {
                from: "designationmasters",
                localField: "designation",
                foreignField: "_id",
                as: "designation"
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
        { $unwind: { path: "$designation", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "createdAt": 1,
                "email": 1,
                "name": 1,
                "mobile": 1,
                "id": 1,
                "gender": 1,
                "address": 1,
                "employee_id": 1,
                "department.departmentName": 1,
                "department._id": 1,
                "department.id": 1,
                "department.status": 1,
                "designation.designationName": 1,
                "designation._id": 1,
                "designation.id": 1,
                "designation.status": 1,
                "user_role": 1,
                "userRole.name": 1,
                "userRole.userRoleId": 1,
                "userRole._id": 1,
            }
        }
    ]);


    if (empDetails.length > 0) {
        response.successResponse({
            message: `Employee Details`,
            employeeData: empDetails
        });
    } else {
        return next(new AppError("Employee details not found.", 500));
    }

});

exports.updateEmployee = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);
    let userId = req.user._id;
    const clientIp = requestIp.getClientIp(req);

    const existingUserByEmail = await User.findOne({
        _id: { $ne: req.body.empUserID },
        email: req.body.empEmail,
        status: 1,
        deleted: 0,
    });

    if (existingUserByEmail) {
        return next(new AppError("Email already exists", 400, { type: "email" }));
    }

    const existingUserByMobile = await User.findOne({
        _id: { $ne: req.body.empUserID },
        mobile: req.body.empMobile,
        status: 1,
        deleted: 0
    });

    if (existingUserByMobile) {
        return next(
            new AppError("Mobile number already exists", 400, { type: "phone" })
        );
    }

    if (req.body.empUserType == 2 || req.body.empUserType == 3) {
        const existingUserByEmpId = await User.findOne({
            _id: { $ne: req.body.empUserID },
            employee_id: req.body.empId,
            status: 1,
            deleted: 0
        });

        if (existingUserByEmpId) {
            return next(
                new AppError("Employee ID already exists", 400, { type: "emp_id" })
            );
        }

        const updateUser = await User.findByIdAndUpdate(req.body.empUserID, {
            name: req.body.empName,
            designation: req.body.empDesignation,
            mobile: req.body.empMobile,
            email: req.body.empEmail,
            gender: req.body.gender,
            department: req.body.empDepartment,
            employee_id: req.body.empId,
            address: req.body.empAddress,
            user_role: req.body.empUserType,
            updated_by: userId
        });

        if (updateUser) {
            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Update Employee",
                operationType: "Update Employee",
                userType: userType,
                created_by: userId
            });

            const userNewData = {
                id: updateUser._id,
                name: updateUser.name,
                email: updateUser.email
            };

            response.createResponse({
                message: "User updated successfully",
                user: userNewData,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } else {

        const updateUser = await User.findByIdAndUpdate(req.body.empUserID, {
            name: req.body.empName,
            mobile: req.body.empMobile,
            email: req.body.empEmail,
            gender: req.body.gender,
            address: req.body.empAddress,
            updated_by: userId
        });

        if (updateUser) {
            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Update User",
                operationType: "Update User",
                userType: userType,
                created_by: userId
            });

            const userNewData = {
                id: updateUser._id,
                name: updateUser.name,
                email: updateUser.email
            };

            response.createResponse({
                message: "User updated successfully",
                user: userNewData,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }

    }
});

exports.notification = catchAsync(async(req, res, next) => {
    const userId = req.user._id;
    const response = new AppSuccess(res);

    try {
        const notificationDetails = await Notification.find({
            notification_for: userId,
            deleted: 0,
            notificationRole: 1,
            is_read: 0
        }, {
            "notification_type": 1,
            "message": 1,
            "is_read": 1,
            "createdAt": 1,
        }).sort({
            createdAt: -1
        }).limit(5);

        const notificationUnread = await Notification.find({
            notification_for: userId,
            deleted: 0,
            notificationRole: 1,
            is_read: 0
        });

        let arr = new Array();

        if (notificationDetails.length > 0) {

            let currentTime = new Date().getTime();

            for (const iterator of notificationDetails) {

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

                arr.push({
                    id: iterator._id,
                    notification_type: iterator.notification_type,
                    message: iterator.message,
                    is_read: iterator.is_read,
                    createdAt: iterator.createdAt,
                    time: `${timeLeft} ${minuteValue} ago`
                });
            }
        }


        if (notificationDetails.length > 0) {
            response.successResponse({
                message: `Notification Details`,
                total_unread: notificationUnread.length,
                notification: arr
            });
        } else {
            response.successResponse({
                message: `Notification details not found.`,
                notification: arr
            });
        }

    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.profileDetails = catchAsync(async(req, res, next) => {
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

    const checkUserData = await User.findOne({
        _id: userId,
        deleted: 0,
        verified: true
    }, {
        "name": 1,
        "email": 1,
        "mobile": 1,
        "address": 1,
        "gender": 1,
        "user_role": 1,
        "employee_id": 1
    }).populate({
        path: 'department',
        select: ['departmentName']
    }).populate({
        path: 'designation',
        select: ['designationName']
    }).sort({ createdAt: -1 });

    if (!checkUserData) {
        return next(
            new AppError(
                "User details not found",
                500, {
                    type: "user_not_found"
                }
            )
        );
    } else {
        response.createResponse({
            userDetails: checkUserData
        });
    }

});

exports.changePassword = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = req.user._id;

    const checkUserData = await User.find({
        _id: userId,
        deleted: 0
    }, {
        "password": 1
    });

    if (checkUserData.length == 0) {
        return next(
            new AppError(
                "User details not found",
                500, {
                    type: "user_not_found"
                }
            )
        );
    } else {

        bcrypt.compare(req.body.oldPassword, checkUserData[0].password, async(err, ret) => {
            if (ret) {

                if (req.body.newPassword === req.body.confirmNewPassword) {

                    if (req.body.oldPassword === req.body.newPassword) {
                        return next(new AppError("New password can not be matched with old password.", 400, { type: "new_password" }));
                    } else {
                        const updatePassword = await User.findByIdAndUpdate(checkUserData[0]._id, {
                            password: await bcrypt.hash(req.body.newPassword, 10),
                            updated_by: checkUserData[0]._id
                        });

                        if (updatePassword) {

                            let userType;

                            if (req.user.user_role == 1) {
                                userType = "Admin"
                            } else if (req.user.user_role == 2) {
                                userType = "Librarian"
                            }

                            const clientIp = requestIp.getClientIp(req);

                            await Activity.create({
                                ipAddress: clientIp,
                                pageDetail: "Change Password",
                                operationType: "Change MPIN",
                                userType: userType,
                                created_by: userId
                            });

                            response.createResponse({
                                message: "MPIN changed successfully"
                            });
                        } else {
                            return next(new AppError("Something went wrong", 400));
                        }
                    }
                } else {
                    return next(
                        new AppError("MPIN does not matched", 400, { type: "confirm_password" })
                    );
                }
            } else {
                return next(new AppError("Invalid MPIN.", 400, { type: "old_password" }));
            }
        });
    }

});

exports.checkEmail = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const response_error = new MobAppError(res);
    // TODO: Business logic goes here
    console.log('test1');
    const randomNumber = helper.createRandomNumber();
    const user = User.findOne({
            email: req.body.UserId,
            status: 1,
            deleted: 0,
            // verified: true,
            user_role: { $in: [1, 2] },
        })
        .then(async(user) => {
            if (!user) {
                //return next(new AppError("User not found.", 400));
                mob_response.errorResponse({
                    message: "User not found.",
                    user_info: req.body.UserId
                });
            } else {

                try {

                    const otpHistories = await OTPHistory.find({
                        user: user.id,
                        createdAt: {
                            // 15 minutes ago (from now)
                            $gte: new Date(new Date().getTime() - 1000 * 60 * 15),
                        },
                    });

                    if (otpHistories && otpHistories.length >= 3) {
                        const expireTime = new Date(user.otp_created_time).getMinutes() + 15;

                        const currentTime = new Date().getMinutes();

                        let minuteValue = "";

                        timeLeft = expireTime - currentTime;

                        if (timeLeft === 1) minuteValue = "minute";
                        else minuteValue = "minutes";

                        return next(
                            new AppError(
                                `Maximum OTP limit exceed. Please try after ${timeLeft} ${minuteValue}`,
                                400, {
                                    type: "otp",
                                }
                            )
                        );
                    }

                    const historyData = await OTPHistory.create({
                        user: user.id,
                        otp: randomNumber,
                    });

                    await User.findByIdAndUpdate(user.id, {
                        otp_value: randomNumber,
                        otp_created_time: historyData.createdAt,
                    });

                    const subject = "Reset Password | OMC Reads";
                    const textContent = "Reset Password";
                    const name = user.name;
                    const email = user.email;

                    const html = `<p>You have requested for reset password.</p>
                            <p><strong>${randomNumber}</strong> is the verification code to reset password. This OTP is valid for 15 minutes. Please do not share this OTP with anyone.</p>`;

                    helper.sendMail(subject, textContent, name, email, html);


                    const userExistingData = {
                        id: user.id,
                        name: user.email
                    };

                    response.successResponse({
                        message: "OTP sent successfully to your registered email ID.",
                        user_info: userExistingData
                    });

                } catch (err) {
                    return next(new AppError(err, 400));
                };
            }
        })
        .catch((err) => {
            return next(new AppError("Authentication failed.", 400));
        });
});

exports.resetPassword = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500));
    }

    User.findOne({
            _id: req.body.userId,
            status: 1,
            deleted: 0,
            // verified: true,
            user_role: { $in: [1, 2] },
        })
        .then(async(user) => {
            if (!user) {
                return next(new AppError("User not found.", 400, { type: "user" }));
            } else {
                if (user.otp_value == req.body.otp) {
                    const expireTime = new Date(user.otp_created_time).getTime() + 1000 * 60 * 15;
                    const currentTime = new Date().getTime();
                    if (currentTime > expireTime) {
                        return next(new AppError("OTP expired.", 400, { type: "otp" }));
                    } else {
                        if (req.body.newPassword === req.body.confirmNewPassword) {

                            const updatePassword = await User.findByIdAndUpdate(req.body.userId, {
                                password: await bcrypt.hash(req.body.newPassword, 10),
                                verified: true,
                                updated_by: req.body.userId
                            });

                            if (updatePassword) {

                                let userType;

                                if (user.user_role == 1) {
                                    userType = "Admin"
                                } else if (user.user_role == 2) {
                                    userType = "Librarian"
                                }

                                const clientIp = requestIp.getClientIp(req);

                                await Activity.create({
                                    ipAddress: clientIp,
                                    pageDetail: "Reset Password",
                                    operationType: "Reset Password",
                                    userType: userType,
                                    created_by: req.body.userId
                                });

                                response.createResponse({
                                    message: "Password changed successfully"
                                });
                            } else {
                                return next(new AppError("Something went wrong", 400));
                            }

                        } else {
                            return next(
                                new AppError("Password does not matched", 400, { type: "confirm_password" })
                            );
                        }
                    }
                } else {
                    return next(new AppError("Invalid OTP.", 400, { type: "otp" }));
                }
            }
        })
        .catch((err) => {
            return next(new AppError("Authentication failed.", 400));
        });
});

exports.resendOTP = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    // TODO: Business logic goes here

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500));
    }

    const randomNumber = helper.createRandomNumber();

    const user = User.findOne({
            _id: req.body.userId,
            status: 1,
            deleted: 0,
            user_role: { $in: [1, 2] },
        })
        .then(async(user) => {
            if (!user) {
                return next(new AppError("User not found.", 400));
            } else {

                const otpHistories = await OTPHistory.find({
                    user: user.id,
                    createdAt: {
                        // 15 minutes ago (from now)
                        $gte: new Date(new Date().getTime() - 1000 * 60 * 15),
                    },
                });

                if (otpHistories && otpHistories.length >= 3) {
                    const expireTime = new Date(user.otp_created_time).getMinutes() + 15;

                    const currentTime = new Date().getMinutes();

                    let minuteValue = "";

                    const timeLeft = expireTime - currentTime;

                    if (timeLeft === 1) minuteValue = "minute";
                    else minuteValue = "minutes";

                    return next(
                        new AppError(
                            `Maximum OTP limit exceed. Please try after ${timeLeft} ${minuteValue}`,
                            400, {
                                type: "otp",
                            }
                        )
                    );
                }

                const historyData = await OTPHistory.create({
                    user: user.id,
                    otp: randomNumber,
                });

                await User.findByIdAndUpdate(user.id, {
                    otp_value: randomNumber,
                    otp_created_time: historyData.createdAt,
                });

                const subject = "Reset Password | OMC Reads";
                const textContent = "Reset Password";
                const name = user.name;
                const email = user.email;

                const html = `<p>You have requested for reset password.</p>
                            <p><strong>${randomNumber}</strong> is the verification code to reset password. This OTP is valid for 15 minutes. Please do not share this OTP with anyone.</p>`;

                helper.sendMail(subject, textContent, name, email, html);

                const userExistingData = {
                    id: user.id,
                    name: user.email
                };

                response.successResponse({
                    message: "OTP sent successfully to your registered email ID.",
                    user_info: userExistingData
                });
            }
        })
        .catch((err) => {
            return next(new AppError(err, 400));
        });
});

exports.activity = catchAsync(async(req, res, next) => {
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

    const activities = await Activity.find({}, {
            "ipAddress": 1,
            "pageDetail": 1,
            "operationType": 1,
            "createdAt": 1,
            "created_by": 1
        }).sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    let list = {};
    let arr = new Array();

    for (const iterator of activities) {

        if (iterator.created_by) {

            const checkID = await User.findById(iterator.created_by, {
                deleted: 0
            });

            arr.push({
                data: iterator,
                created_by: checkID.name
            });

        } else {

            arr.push({
                data: iterator,
                created_by: "Invalid User"
            });

        }

    }

    const activityCount = await Activity.find({}, {
        "ipAddress": 1,
        "pageDetail": 1,
        "operationType": 1,
        "createdAt": 1,
        "created_by": 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total activity count= ${ arr.length }`,
        activityList: arr,
        activityCount: activityCount.length
    });
});

exports.userList = catchAsync(async(req, res, next) => {
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

    const empDetails = await User.find({
            deleted: 0,
            user_role: { $in: [2, 4] },
        }, {
            "name": 1,
            "email": 1,
            "mobile": 1,
            "user_role": 1,
            "status": 1
        }).sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await User.find({
        deleted: 0,
        user_role: { $in: [2, 4] }
    });

    response.successResponse({
        message: `Total user count= ${ empDetails.length }`,
        empList: empDetails,
        bookCount: bookCount.length
    });

});

exports.notificationRead = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.notificationId == "") {
        return next(new AppError("Notification details not found", 500));
    }

    const checkNotificationId = await Notification.findById(req.body.notificationId, {
        deleted: 0
    });

    if (checkNotificationId) {

        try {


            const markRead = await Notification.findByIdAndUpdate(req.body.notificationId, {
                is_read: 1,
                updated_by: userId
            });

            if (markRead) {

                response.createResponse({
                    message: "Notification read successfully."
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }

        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }
    } else {
        return next(new AppError("Notification details not found", 500));
    }
});

exports.userStatusChange = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.empId) {
        return next(new AppError("Employee details not found", 500))
    }

    if (!req.body.status) {
        return next(new AppError("Employee status not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await User.find({
            _id: req.body.empId
        });

        if (checkDetailsMasterDataId.length == 0) {
            return next(
                new AppError(
                    "Employee details not found",
                    500, {
                        type: "user_not_found"
                    }
                )
            );
        }

        let statusValue;

        if (req.body.status == 1) {
            statusValue = 0;
        } else if (req.body.status == 0) {
            statusValue = 1;
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

        const statusChange = await User.findByIdAndUpdate(req.body.empId, {
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
                pageDetail: "User Status Change",
                operationType: "User Status Change",
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
        return next(new AppError(err, 500));
    }

});

exports.checkEmailMobileApp = catchAsync(async(req, res, next) => {
    const response = new MobAppSuccess(res);
    const response_error = new MobAppError(res);
    // TODO: Business logic goes here
    const randomNumber = helper.createRandomNumber();
    const clientIp = requestIp.getClientIp(req);

    const user = User.findOne({
            $or: [{ email: req.body.UserId },
                { mobile: req.body.UserId }
            ],
            deleted: 0,
        })
        .then(async(user) => {
            if (!user) {

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Login Page",
                    operationType: `Login failed with ${req.body.UserId}`,
                    userType: "Invalid User",
                });

                response_error.errorResponse({
                    message: "User not found.",
                    user_info: req.body.UserId
                });
                //return next(new AppError("User not found.", 400));
            } else {

                let userStatus = user.block_status;

                if (user.verified && user.password && !user.status) {

                    await Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Login Page",
                        operationType: `Login failed with ${req.body.UserId}`,
                        userType: "Invalid User",
                    });
                    response_error.errorResponse({
                        message: "You have been blocked by the admin.",
                        user_info: req.body.UserId
                    });
                    //return next(new AppError(`You have been blocked by the admin.`, 400));
                }

                if (user.verified && user.password && userStatus) {

                    let expireTime = new Date(user.block_expiry_time).getTime();

                    let currentTime = new Date().getTime();

                    if (currentTime > expireTime) {

                        await AuthAttempt.updateMany({
                            user: user._id,
                            status: 1,
                            deleted: 0,
                        }, { $set: { "deleted": 1 } });

                        await User.findByIdAndUpdate(user._id, {
                            status: 1,
                            block_expiry_time: null
                        });

                        userStatus = 0;

                    } else {
                        let minuteValue = "";

                        let timeLeft = Math.trunc((expireTime - currentTime) / 3600000);

                        if (timeLeft === 1) {
                            minuteValue = "hour";
                        } else {
                            minuteValue = "hours";
                        }

                        if (timeLeft === 0) {

                            timeLeft = Math.trunc(((expireTime - currentTime) / 3600000) * 60);

                            if (timeLeft === 1) {
                                minuteValue = "minute";
                            } else {
                                minuteValue = "minutes";
                            }
                        }

                        if (timeLeft === 0) {

                            timeLeft = Math.trunc(((expireTime - currentTime) / 3600000) * 60 * 60);

                            if (timeLeft === 1) {
                                minuteValue = "second";
                            } else {
                                minuteValue = "seconds";
                            }
                        }

                        await Activity.create({
                            ipAddress: clientIp,
                            pageDetail: "Login Page",
                            operationType: `Login failed with ${req.body.UserId}`,
                            userType: "Invalid User",
                        });

                        const error_message = `Your account has been blocked for ${timeLeft} ${minuteValue}.`;
                        response_error.errorResponse({
                            message: error_message,
                            user_info: req.body.UserId
                        });
                        //return next(new AppError(`Your account has been blocked for ${timeLeft} ${minuteValue}.`, 400));
                    }

                }

                if (user.verified && user.password) {

                    const userExistingData = {
                        id: user.id,
                        name: user.email,
                        verified: user.verified
                    };

                    response.successResponse({
                        message: "Verified User",
                        user_info: userExistingData
                    });

                } else {
                    const otpHistories = await OTPHistory.find({
                        user: user.id,
                        createdAt: {
                            // 15 minutes ago (from now)
                            $gte: new Date(new Date().getTime() - 1000 * 60 * 15),
                        },
                    });

                    if (otpHistories && otpHistories.length >= 3) {
                        const expireTime = new Date(user.otp_created_time).getMinutes() + 15;

                        const currentTime = new Date().getMinutes();

                        let minuteValue = "";

                        const timeLeft = expireTime - currentTime;

                        if (timeLeft === 1) minuteValue = "minute";
                        else minuteValue = "minutes";

                        response_error.errorResponse({
                            message: `Maximum OTP limit exceed. Please try after ${timeLeft} ${minuteValue}`,
                            type: "otp"
                        });

                        /* return next(
                            new AppError(
                                `Maximum OTP limit exceed. Please try after ${timeLeft} ${minuteValue}`,
                                400, {
                                    type: "otp",
                                }
                            )
                        ); */
                    }

                    const historyData = await OTPHistory.create({
                        user: user.id,
                        otp: randomNumber,
                    });

                    await User.findByIdAndUpdate(user.id, {
                        otp_value: randomNumber,
                        otp_created_time: historyData.createdAt,
                    });

                    const subject = "Set MPIN | OMC Reads";
                    const textContent = "Registration";
                    const name = user.name;
                    const email = user.email;

                    const html = `<p>You have requested for creating the MPIN in OMC Reads.</p>
                            <p><strong>${randomNumber}</strong> is the verification code for creating MPIN. This OTP is valid for 15 minutes. Please do not share this OTP with anyone.</p>`;

                    helper.sendMail(subject, textContent, name, email, html);

                    const userExistingData = {
                        id: user.id,
                        name: user.email,
                        verified: user.verified
                    };

                    response.successResponse({
                        message: "OTP sent successfully to your registered email ID.",
                        user_info: userExistingData
                    });
                }
            }
        })
        .catch((err) => {
            return next(new AppError("Authentication failed.", 400));
        });
});

exports.verifiedUser = catchAsync(async(req, res, next) => {
    const response = new MobAppSuccess(res);
    const response_error = new MobAppError(res);

    // TODO: Business logic goes here
    let fetchedUser;
    const clientIp = requestIp.getClientIp(req);

    User.findOne({
            _id: req.body.userId,
            deleted: 0,
            verified: true,
        })
        .then(async(user) => {
            if (!user) {

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Login Page",
                    operationType: `Login failed with ${req.body.userId}`,
                    userType: "Invalid User",
                });
                response_error.errorResponse({
                    message: "User not found.",
                    userType: "Invalid User",
                });
                //return next(new AppError("User not found.", 200));
            }

            if (user && user.status == 0) {
                response_error.errorResponse({
                    message: "You have been blocked by the admin.",
                    userType: "Invalid User",
                });
                //return next(new AppError(`You have been blocked by the admin.`, 400));
            }

            if (user && user.block_status == 1) {

                let expireTime = new Date(user.block_expiry_time).getTime();

                let currentTime = new Date().getTime();

                if (currentTime > expireTime) {

                    await AuthAttempt.updateMany({
                        user: user._id,
                        status: 1,
                        deleted: 0,
                    }, { $set: { "deleted": 1 } });

                    await User.findByIdAndUpdate(user._id, {
                        block_status: 0,
                        block_expiry_time: null
                    });

                } else {
                    let minuteValue = "";

                    let timeLeft = Math.trunc((expireTime - currentTime) / 3600000);

                    if (timeLeft === 1) {
                        minuteValue = "hour";
                    } else {
                        minuteValue = "hours";
                    }

                    if (timeLeft === 0) {

                        timeLeft = Math.trunc(((expireTime - currentTime) / 3600000) * 60);

                        if (timeLeft === 1) {
                            minuteValue = "minute";
                        } else {
                            minuteValue = "minutes";
                        }
                    }

                    if (timeLeft === 0) {

                        timeLeft = Math.trunc(((expireTime - currentTime) / 3600000) * 60 * 60);

                        if (timeLeft === 1) {
                            minuteValue = "second";
                        } else {
                            minuteValue = "seconds";
                        }
                    }
                    response_error.errorResponse({
                        message: `Your account has been blocked for ${timeLeft} ${minuteValue}.`,
                        userType: "Invalid User",
                    });
                    //return next(new AppError(`Your account has been blocked for ${timeLeft} ${minuteValue}.`, 400));
                }

            }


            let userType;

            fetchedUser = user;

            if (fetchedUser.user_role == 1) {
                userType = "Admin"
            } else if (fetchedUser.user_role == 2) {
                userType = "Librarian"
            }

            bcrypt.compare(req.body.Password, user.password, async(err, ret) => {
                if (ret) {

                    const randomtoken = helper.makeid(25);
                    const encrypttoken = await bcrypt.hash(randomtoken, 10);

                    await User.findByIdAndUpdate(user.id, {
                        token: encrypttoken,
                        api_block_time: new Date(new Date().getTime() + 1000 * 60 * 30) // update the api expire time to next 30 minutes
                    });

                    const data = {
                        email: fetchedUser.email,
                        name: fetchedUser.name,
                        id: fetchedUser._id,
                        user_role: fetchedUser.user_role,
                        encrypttoken: encrypttoken,
                    };
                    req["user_details"] = {
                        ...data,
                        role: fetchedUser.user_role
                    };

                    const token = jwt.sign(data, "secret_this_should_be_longer", {
                        expiresIn: "10d",
                    });

                    await AuthAttempt.updateMany({
                        user: fetchedUser._id,
                        status: 1,
                        deleted: 0,
                    }, { $set: { "deleted": 1 } });

                    Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Login Page",
                        operationType: `Login Successfull - ${fetchedUser.email}`,
                        userType: userType,
                        created_by: fetchedUser._id
                    });

                    response.successResponse({
                        message: "Login Successful.",
                        user_info: data,
                        token: token,
                    });
                } else {

                    await AuthAttempt.create({
                        user: user.id,
                        ipAddress: clientIp,
                    });

                    await Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Login Page",
                        operationType: `Invalid Credentials - ${fetchedUser.email}`,
                        userType: userType,
                        created_by: fetchedUser._id
                    });

                    const checkLogin = await AuthAttempt.find({
                        user: user.id,
                        status: 1,
                        deleted: 0,
                        createdAt: {
                            // 1 day ago (from now)
                            //$gte: new Date(new Date().getTime() - 1000 * 60 * 60 * 24),
                            // 15 minutes ago (from now)
                            $gte: new Date(new Date().getTime() - 1000 * 60 * 15),
                        },
                    });

                    let msg;


                    if (checkLogin.length == 5) {

                        msg = "Invalid Credentials. You have been blocked for 24 hours. Please check your mail for unblock";

                        await User.findByIdAndUpdate(user.id, {
                            block_status: 1,
                            block_expiry_time: new Date(new Date().getTime() + 1000 * 60 * 60 * 24)
                        });

                        const subject = "Unblock Account | OMC Reads";
                        const textContent = "Unblock Account";
                        const name = user.name;
                        const email = user.email;

                        const url = req.protocol + "://" + req.get("host");

                        // // Local Server

                        // const sendUrl = url + "/api/v1/user/unblock-account/" + user.id;

                        // // Online Server

                        const sendUrl = "https://demo.ntspl.co.in/omc-cms-api/api/v1/user/unblock-account/" + user.id;

                        const html = `<p>Your account has been blocked for 24 hours due to too many login attempts.</p>
                        <p>To unblock the account please follow the below link.</p>
                        <p><a href="${sendUrl}">Click here</a> to unblock the account</p><br>`;

                        helper.sendMail(subject, textContent, name, email, html);

                    } else {
                        msg = `Invalid Credentials. Attempts remaining for today: ${5 - checkLogin.length}`;

                    }
                    response_error.errorResponse({
                        message: `Invalid Credentials. Attempts remaining for today: ${5 - checkLogin.length}`,
                        userType: "Invalid User",
                    });
                    //return next(new AppError(msg, 400));
                }
            });
        })
        .catch((err) => {
            response_error.errorResponse({
                message: err,
                userType: "Invalid User",
            });
            //return next(new AppError(err, 400));
        });
});

exports.unverifiedUser = catchAsync(async(req, res, next) => {
    const response = new MobAppSuccess(res);
    const response_error = new MobAppError(res);

    if (!req.body.userId) {
        response_error.errorResponse({
            message: "User details not found",
            userType: "Invalid User",
        });
        //return next(new AppError("User details not found", 500));
    }

    User.findOne({
            _id: req.body.userId,
            status: 1,
            deleted: 0,
            verified: false,
        })
        .then(async(user) => {
            if (!user) {
                response_error.errorResponse({
                    message: "User not found.",
                    type: "user"
                });
                //return next(new AppError("User not found.", 400, { type: "user" }));
            } else {
                if (user.otp_value == req.body.otp) {
                    const expireTime = new Date(user.otp_created_time).getTime() + 1000 * 60 * 15;
                    const currentTime = new Date().getTime();
                    if (currentTime > expireTime) {
                        response_error.errorResponse({
                            message: "OTP expired.",
                            type: "otp"
                        });
                        //return next(new AppError("OTP expired.", 400, { type: "otp" }));
                    } else {
                        if (req.body.newPassword === req.body.confirmNewPassword) {

                            const updatePassword = await User.findByIdAndUpdate(req.body.userId, {
                                password: await bcrypt.hash(req.body.newPassword, 10),
                                verified: true,
                                updated_by: req.body.userId
                            });

                            if (updatePassword) {

                                response.createResponse({
                                    message: "MPIN created successfully"
                                });
                            } else {
                                response_error.errorResponse({
                                    message: "Something went wrong",
                                    type: "MPIN"
                                });
                                //return next(new AppError("Something went wrong", 400));
                            }

                        } else {
                            response_error.errorResponse({
                                message: "MPIN does not matched",
                                type: "confirm_mpin"
                            });
                            /* return next(
                                new AppError("MPIN does not matched", 400, { type: "confirm_mpin" })
                            ); */
                        }
                    }
                } else {
                    response_error.errorResponse({
                        message: "Invalid OTP.",
                        type: "otp"
                    });
                    //return next(new AppError("Invalid OTP.", 400, { type: "otp" }));
                }
            }
        })
        .catch((err) => {
            response_error.errorResponse({
                message: err,
                type: "Authentication"
            });
            //return next(new AppError("Authentication failed.", 400));
        });
});

exports.resendOTPMobileApp = catchAsync(async(req, res, next) => {
    const response = new MobAppSuccess(res);
    const response_error = new MobAppError(res);
    // TODO: Business logic goes here

    if (!req.body.userId) {
        response_error.errorResponse({
            message: "User details not found",
            userType: "Invalid User",
        });
        //return next(new AppError("User details not found", 500));
    }

    const randomNumber = helper.createRandomNumber();

    const user = User.findOne({
            _id: req.body.userId,
            status: 1,
            deleted: 0,
            verified: false,
        })
        .then(async(user) => {
            if (!user) {
                response_error.errorResponse({
                    message: "User not found",
                    userType: "Invalid User",
                });
                //return next(new AppError("User not found.", 400));
            } else {

                const otpHistories = await OTPHistory.find({
                    user: user.id,
                    createdAt: {
                        // 15 minutes ago (from now)
                        $gte: new Date(new Date().getTime() - 1000 * 60 * 15),
                    },
                });

                if (otpHistories && otpHistories.length >= 3) {
                    const expireTime = new Date(user.otp_created_time).getMinutes() + 15;

                    const currentTime = new Date().getMinutes();

                    let minuteValue = "";

                    const timeLeft = expireTime - currentTime;

                    if (timeLeft === 1) minuteValue = "minute";
                    else minuteValue = "minutes";

                    response_error.errorResponse({
                        message: `Maximum OTP limit exceed. Please try after ${timeLeft} ${minuteValue}`,
                        type: "otp"
                    });
                    /* return next(
                        new AppError(
                            `Maximum OTP limit exceed. Please try after ${timeLeft} ${minuteValue}`,
                            400, {
                                type: "otp",
                            }
                        )
                    ); */
                }

                const historyData = await OTPHistory.create({
                    user: user.id,
                    otp: randomNumber,
                });

                await User.findByIdAndUpdate(user.id, {
                    otp_value: randomNumber,
                    otp_created_time: historyData.createdAt,
                });

                const subject = "Set MPIN | OMC Reads";
                const textContent = "Registration";
                const name = user.name;
                const email = user.email;

                const html = `<p>You have requested for creating the MPIN in OMC Reads.</p>
                            <p><strong>${randomNumber}</strong> is the verification code for creating MPIN. This OTP is valid for 15 minutes. Please do not share this OTP with anyone.</p>`;

                helper.sendMail(subject, textContent, name, email, html);

                const userExistingData = {
                    id: user.id,
                    name: user.email,
                    verified: user.verified
                };

                response.successResponse({
                    message: "OTP sent successfully to your registered email ID.",
                    user_info: userExistingData
                });
            }
        })
        .catch((err) => {
            response_error.errorResponse({
                message: err,
                type: "Authentication"
            });
            //return next(new AppError("Authentication failed.", 400));
        });
});

exports.forgotMpin = catchAsync(async(req, res, next) => {
    const response = new MobAppSuccess(res);
    const response_error = new MobAppError(res);
    // TODO: Business logic goes here
    const randomNumber = helper.createRandomNumber();

    const user = User.findOne({
            _id: req.body.userId,
            deleted: 0,
            verified: true,
        })
        .then(async(user) => {
            if (!user) {
                response_error.errorResponse({
                    message: "User not found.",
                    userType: "Invalid User",
                });
                /* return next(new AppError("User not found.", 400, {
                    type: "otp",
                })); */
            } else {

                if (user.verified && user.password && user.block_status) {

                    let expireTime = new Date(user.block_expiry_time).getTime();

                    let currentTime = new Date().getTime();

                    if (currentTime > expireTime) {

                        await AuthAttempt.updateMany({
                            user: user._id,
                            status: 1,
                            deleted: 0,
                        }, { $set: { "deleted": 1 } });

                        await User.findByIdAndUpdate(user._id, {
                            status: 1,
                            block_expiry_time: null
                        });

                    } else {
                        let minuteValue = "";

                        let timeLeft = Math.trunc((expireTime - currentTime) / 3600000);

                        if (timeLeft === 1) {
                            minuteValue = "hour";
                        } else {
                            minuteValue = "hours";
                        }

                        if (timeLeft === 0) {

                            timeLeft = Math.trunc(((expireTime - currentTime) / 3600000) * 60);

                            if (timeLeft === 1) {
                                minuteValue = "minute";
                            } else {
                                minuteValue = "minutes";
                            }
                        }

                        if (timeLeft === 0) {

                            timeLeft = Math.trunc(((expireTime - currentTime) / 3600000) * 60 * 60);

                            if (timeLeft === 1) {
                                minuteValue = "second";
                            } else {
                                minuteValue = "seconds";
                            }
                        }

                        // return next(new AppError(`Your account has been blocked for ${timeLeft} ${minuteValue}.`, 400));
                        response_error.errorResponse({
                            message: `Your account has been blocked for ${timeLeft} ${minuteValue}.`,
                            type: "otp"
                        });
                        /* return next(
                            new AppError(
                                `Your account has been blocked for ${timeLeft} ${minuteValue}.`,
                                400, {
                                    type: "otp",
                                }
                            )
                        ); */
                    }

                }

                const otpHistories = await OTPHistory.find({
                    user: user.id,
                    createdAt: {
                        // 15 minutes ago (from now)
                        $gte: new Date(new Date().getTime() - 1000 * 60 * 15),
                    },
                });

                if (otpHistories && otpHistories.length >= 3) {
                    const expireTime = new Date(user.otp_created_time).getMinutes() + 15;

                    const currentTime = new Date().getMinutes();

                    let minuteValue = "";

                    const timeLeft = expireTime - currentTime;

                    if (timeLeft === 1) minuteValue = "minute";
                    else minuteValue = "minutes";

                    response_error.errorResponse({
                        message: `Maximum OTP limit exceed. Please try after ${timeLeft} ${minuteValue}`,
                        type: "otp"
                    });
                    /* return next(
                        new AppError(
                            `Maximum OTP limit exceed. Please try after ${timeLeft} ${minuteValue}`,
                            400, {
                                type: "otp",
                            }
                        )
                    ); */
                }

                const historyData = await OTPHistory.create({
                    user: user.id,
                    otp: randomNumber,
                });

                await User.findByIdAndUpdate(user.id, {
                    otp_value: randomNumber,
                    otp_created_time: historyData.createdAt,
                });

                const subject = "Forgot MPIN | OMC Reads";
                const textContent = "Forgot MPIN";
                const name = user.name;
                const email = user.email;

                const html = `<p>You have requested for reset MPIN.</p>
                            <p><strong>${randomNumber}</strong> is the verification code for creating MPIN. This OTP is valid for 15 minutes. Please do not share this OTP with anyone.</p>`;

                helper.sendMail(subject, textContent, name, email, html);

                const userExistingData = {
                    id: user.id,
                    name: user.email,
                    verified: user.verified
                };

                response.successResponse({
                    message: "OTP sent successfully to your registered email ID.",
                    user_info: userExistingData
                });

            }
        })
        .catch((err) => {
            response_error.errorResponse({
                message: err,
                type: "otp"
            });

            /* return next(new AppError(err, 400, {
                type: "otp",
            })); */
        });
});

exports.forgotMpinSubmit = catchAsync(async(req, res, next) => {
    const response = new MobAppSuccess(res);
    const response_error = new MobAppError(res);

    if (!req.body.userId) {
        response_error.errorResponse({
            message: "User details not found",
            type: "MPIN"
        });
        //return next(new AppError("User details not found", 500, { type: "user" }));
    }

    User.findOne({
            _id: req.body.userId,
            status: 1,
            deleted: 0,
            verified: true,
        })
        .then(async(user) => {
            if (!user) {
                response_error.errorResponse({
                    message: "User not found.",
                    type: "user"
                });
                //return next(new AppError("User not found.", 400, { type: "user" }));
            } else {
                if (user.otp_value == req.body.otp) {
                    const expireTime = new Date(user.otp_created_time).getTime() + 1000 * 60 * 15;
                    const currentTime = new Date().getTime();
                    if (currentTime > expireTime) {
                        return next(new AppError("OTP expired.", 400, { type: "otp" }));
                    } else {
                        if (req.body.newPassword === req.body.confirmNewPassword) {

                            const updatePassword = await User.findByIdAndUpdate(req.body.userId, {
                                password: await bcrypt.hash(req.body.newPassword, 10),
                                verified: true,
                                updated_by: req.body.userId
                            });

                            if (updatePassword) {

                                response.createResponse({
                                    message: "MPIN reset successfully"
                                });
                            } else {
                                response_error.errorResponse({
                                    message: "Something went wrong",
                                    type: "user"
                                });
                                //return next(new AppError("Something went wrong", 400, { type: "user" }));
                            }

                        } else {
                            response_error.errorResponse({
                                message: "MPIN does not matched",
                                type: "MPIN"
                            });
                            /* return next(
                                new AppError("MPIN does not matched", 400, { type: "confirm_mpin" })
                            ); */
                        }
                    }
                } else {
                    response_error.errorResponse({
                        message: "Invalid OTP.",
                        type: "otp"
                    });
                    //return next(new AppError("Invalid OTP.", 400, { type: "otp" }));
                }
            }
        })
        .catch((err) => {
            response_error.errorResponse({
                message: err,
                type: "Authentication"
            });
            //return next(new AppError("Authentication failed.", 400, { type: "user" }));
        });
});

exports.resendOTPForgotMpin = catchAsync(async(req, res, next) => {
    const response = new MobAppSuccess(res);
    const response_error = new MobAppError(res);
    // TODO: Business logic goes here

    if (!req.body.userId) {
        response_error.errorResponse({
            message: "User not found",
            userType: "Invalid User",
        });
        //return next(new AppError("User details not found", 500));
    }

    const randomNumber = helper.createRandomNumber();

    const user = User.findOne({
            _id: req.body.userId,
            status: 1,
            deleted: 0,
            verified: true,
        })
        .then(async(user) => {
            if (!user) {
                response_error.errorResponse({
                    message: "User not found",
                    userType: "Invalid User",
                });
                //return next(new AppError("User not found.", 400));
            } else {

                const otpHistories = await OTPHistory.find({
                    user: user.id,
                    createdAt: {
                        // 15 minutes ago (from now)
                        $gte: new Date(new Date().getTime() - 1000 * 60 * 15),
                    },
                });

                if (otpHistories && otpHistories.length >= 3) {
                    const expireTime = new Date(user.otp_created_time).getMinutes() + 15;

                    const currentTime = new Date().getMinutes();

                    let minuteValue = "";

                    const timeLeft = expireTime - currentTime;

                    if (timeLeft === 1) minuteValue = "minute";
                    else minuteValue = "minutes";

                    response_error.errorResponse({
                        message: `Maximum OTP limit exceed. Please try after ${timeLeft} ${minuteValue}`,
                        userType: "otp",
                    });

                    /* return next(
                        new AppError(
                            `Maximum OTP limit exceed. Please try after ${timeLeft} ${minuteValue}`,
                            400, {
                                type: "otp",
                            }
                        )
                    ); */
                }

                const historyData = await OTPHistory.create({
                    user: user.id,
                    otp: randomNumber,
                });

                await User.findByIdAndUpdate(user.id, {
                    otp_value: randomNumber,
                    otp_created_time: historyData.createdAt,
                });

                const subject = "Forgot MPIN | OMC Reads";
                const textContent = "Forgot MPIN";
                const name = user.name;
                const email = user.email;

                const html = `<p>You have requested for reset MPIN.</p>
                            <p><strong>${randomNumber}</strong> is the verification code for creating MPIN. This OTP is valid for 15 minutes. Please do not share this OTP with anyone.</p>`;

                helper.sendMail(subject, textContent, name, email, html);

                const userExistingData = {
                    id: user.id,
                    name: user.email,
                    verified: user.verified
                };

                response.successResponse({
                    message: "OTP sent successfully to your registered email ID.",
                    user_info: userExistingData
                });
            }
        })
        .catch((err) => {
            response_error.errorResponse({
                message: err,
                userType: "otp",
            });
            //return next(new AppError("Authentication failed.", 400));
        });
});

exports.unblockAccount = catchAsync(async(req, res, next) => {

    if (!req.params.id) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.params.id, {
            deleted: 0
        });

        if (checkID && checkID.block_status == 1) {
            let userId = req.params.id;

            await AuthAttempt.updateMany({
                user: userId,
                status: 1,
                deleted: 0,
            }, { $set: { "deleted": 1 } });

            await User.findByIdAndUpdate(userId, {
                block_status: 0,
                block_expiry_time: null
            });
            const unblock_url = process.env.unblock_url;

            res.redirect(unblock_url);
        } else {
            return next(new AppError("User details not found.", 500));
        }
    }
});

exports.chooseLibrarian = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);
    let userId;
    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.empId) {
        return next(new AppError("Employee details not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await User.findOne({
            _id: req.body.empId,
            status: 1,
            deleted: 0,
            user_role: { $ne: 1 }
        });

        if (!checkDetailsMasterDataId) {
            return next(
                new AppError(
                    "Employee details not found",
                    500, {
                        type: "user_not_found"
                    }
                )
            );
        }

        if (checkDetailsMasterDataId && checkDetailsMasterDataId.user_role == 2) {
            return next(
                new AppError(
                    "Employee already assigned as librarian",
                    500, {
                        type: "user_not_found"
                    }
                )
            );
        }

        const change = await User.findByIdAndUpdate(req.body.empId, {
            user_role: 2,
            updated_by: userId
        });

        if (change) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "User",
                operationType: "Librarian Assigned",
                userType: userType,
                created_by: userId
            });

            response.createResponse({
                message: "Librarian successfully assigned."
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }

    } catch (err) {
        return next(new AppError(err, 500));
    }

});

exports.createNonEmpLibrarian = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = req.user._id;
    const existingUserByEmail = await User.findOne({
        email: req.body.empEmail,
        status: 1,
        deleted: 0,
    });

    if (existingUserByEmail) {
        return next(new AppError("Email already exists", 400, { type: "email" }));
    }

    const existingUserByMobile = await User.findOne({
        mobile: req.body.empMobile,
        status: 1,
        deleted: 0
    });

    if (existingUserByMobile) {
        return next(
            new AppError("Mobile number already exists", 400, { type: "phone" })
        );
    }

    const newuser = await User.create({
        name: req.body.empName,
        mobile: req.body.empMobile,
        email: req.body.empEmail,
        gender: req.body.gender,
        address: req.body.empAddress,
        user_role: req.body.empUserType,
        created_by: userId
    });

    if (newuser) {

        let userType;
        if (req.user.user_role == 1) {
            userType = "Admin"
        } else if (req.user.user_role == 2) {
            userType = "Librarian"
        }

        const clientIp = requestIp.getClientIp(req);

        await Activity.create({
            ipAddress: clientIp,
            pageDetail: "Add User",
            operationType: "Add non-employee librarian",
            userType: userType,
            created_by: userId
        });

        let subject = 'User Registration | OMC LMS';
        let textContent = 'User Registration';

        const name = newuser.name;
        const email = newuser.email;
        const html = `<p>You have been successfully registered in the OMC Reads.</p><br/>`;

        helper.sendMail(subject, textContent, name, email, html);

        const userNewData = {
            id: newuser._id,
            name: newuser.name,
            email: newuser.email
        };

        response.createResponse({
            message: "User successfully created",
            user: userNewData,
        });
    } else {
        return next(new AppError("Something went wrong", 500));
    }

});

exports.empNotification = catchAsync(async(req, res, next) => {

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

    try {
        const notificationDetails = await Notification.find({
                notification_for: userId,
                deleted: 0,
                notificationRole: 2,
                is_read: 0
            }, {
                "notification_type": 1,
                "message": 1,
                "is_read": 1,
                "createdAt": 1,
            }).sort({ createdAt: -1 })
            .limit(5);

        const notificationUnread = await Notification.find({
            notification_for: userId,
            deleted: 0,
            notificationRole: 2,
            is_read: 0
        });

        let arr = new Array();

        if (notificationDetails.length > 0) {

            let currentTime = new Date().getTime();

            for (const iterator of notificationDetails) {

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

                arr.push({
                    id: iterator._id,
                    notification_type: iterator.notification_type,
                    message: iterator.message,
                    is_read: iterator.is_read,
                    createdAt: iterator.createdAt,
                    time: `${timeLeft} ${minuteValue} ago`
                });
            }
        }

        if (notificationDetails.length > 0) {
            response.successResponse({
                message: `Notification Details`,
                total_unread: notificationUnread.length,
                notification: arr,
                todayDate: new Date()
            });
        } else {
            response.successResponse({
                message: `Notification details not found.`,
                notification: notificationDetails
            });
        }

    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.empNotificationList = catchAsync(async(req, res, next) => {

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

    try {
        const notificationDetails = await Notification.find({
            notification_for: userId,
            deleted: 0,
            notificationRole: 2,
        }, {
            "notification_type": 1,
            "message": 1,
            "is_read": 1,
            "createdAt": 1,
        }).sort({ createdAt: -1 });

        const notificationUnread = await Notification.find({
            notification_for: userId,
            deleted: 0,
            notificationRole: 2,
        });

        let arr = new Array();

        if (notificationDetails.length > 0) {

            let currentTime = new Date().getTime();

            for (const iterator of notificationDetails) {

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

                arr.push({
                    id: iterator._id,
                    notification_type: iterator.notification_type,
                    message: iterator.message,
                    is_read: iterator.is_read,
                    createdAt: iterator.createdAt,
                    time: `${timeLeft} ${minuteValue} ago`
                });
            }
        }

        if (notificationDetails.length > 0) {
            response.successResponse({
                message: `Notification Details`,
                total_unread: notificationUnread.length,
                notification: arr
            });
        } else {
            response.successResponse({
                message: `Notification details not found.`,
                notification: notificationDetails
            });
        }

    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.adminNotificationList = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    const userId = req.user._id;

    try {
        const notificationDetails = await Notification.find({
            notification_for: userId,
            deleted: 0,
            notificationRole: 1,
        }, {
            "notification_type": 1,
            "message": 1,
            "is_read": 1,
            "createdAt": 1,
        }).sort({ createdAt: -1 });

        const notificationUnread = await Notification.find({
            notification_for: userId,
            deleted: 0,
            notificationRole: 1
        });

        let arr = new Array();

        if (notificationDetails.length > 0) {

            let currentTime = new Date().getTime();

            for (const iterator of notificationDetails) {

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

                arr.push({
                    id: iterator._id,
                    notification_type: iterator.notification_type,
                    message: iterator.message,
                    is_read: iterator.is_read,
                    createdAt: iterator.createdAt,
                    time: `${timeLeft} ${minuteValue} ago`
                });
            }
        }

        if (notificationDetails.length > 0) {
            response.successResponse({
                message: `Notification Details`,
                total_unread: notificationUnread.length,
                notification: arr
            });
        } else {
            response.successResponse({
                message: `Notification details not found.`,
                notification: notificationDetails
            });
        }

    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.employeeListLibrarian = catchAsync(async(req, res, next) => {
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

    const empDetails = await User.find({
            deleted: 0,
            user_role: { $in: [2, 3] }
        }, {
            "name": 1,
            "employee_id": 1,
            "user_role": 1,
            "status": 1
        }).populate({
            path: 'department',
            select: ['departmentName']
        }).populate({
            path: 'designation',
            select: ['designationName']
        }).sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const bookCount = await User.find({
        deleted: 0,
        user_role: { $in: [2, 3] }
    });

    response.successResponse({
        message: `Total employee count= ${ empDetails.length }`,
        empList: empDetails,
        bookCount: bookCount.length
    });

});

exports.employeeListLibrarians = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const empDetails = await User.find({
        deleted: 0,
        user_role: { $in: [2, 3] },
    }, {
        "name": 1,
        "employee_id": 1,
        "status": 1
    }).populate({
        path: 'department',
        select: ['departmentName']
    }).populate({
        path: 'designation',
        select: ['designationName']
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total employee count= ${ empDetails.length }`,
        empList: empDetails
    });

});

exports.userFind = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        const checkID = await User.findById(req.body.userId, {
            deleted: 0
        });

        if (checkID) {
            const empDetails = await User.findOne({
                _id: req.body.userId,
                deleted: 0
            }, {
                "name": 1,
                "email": 1,
                "mobile": 1,
                "address": 1,
                "gender": 1,
                "user_role": 1,
                "employee_id": 1
            }).populate({
                path: 'department',
                select: ['departmentName']
            }).populate({
                path: 'designation',
                select: ['designationName']
            }).sort({ createdAt: -1 });


            response.successResponse({
                userData: empDetails
            });


        } else {
            return next(new AppError("User details not found.", 500));
        }
    }
});

exports.getUserRole = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    const role = await Role.find({
        deleted: 0,
        status: 1,
        userRoleId: { $in: [2, 3] },
    }, {
        "name": 1,
        "userRoleId": 1,
    }).sort({ createdAt: 1 });

    response.successResponse({
        role: role
    });

});