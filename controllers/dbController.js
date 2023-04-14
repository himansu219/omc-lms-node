const catchAsync = require("../utils/catchAsync");
const AppSuccess = require("../utils/appSuccess");
const AppError = require("../utils/appError");
const BookReferenceUniqueNumberMaster = require("../models/admin/BookReferenceUniqueNumberMaster");
const BookIssue = require("../models/admin/BookIssue");
const BookRequest = require("../models/employee/BookRequest");
const BlogParent = require("../models/employee/blogParent");
const BlogComment = require("../models/employee/blogComment");
const BlogLike = require("../models/employee/blogLike");
const BookDamage = require("../models/admin/bookDamage");
const BookDetailsMaster = require("../models/admin/BookDetailsMaster");
const BookRatingHistory = require("../models/employee/bookRatingHistory");
const Bookrating = require("../models/employee/bookRating");
const BookRequisition = require("../models/employee/bookRequisition");
const BookReturnDaysHistory = require("../models/admin/bookReturnDaysHistory");
const MaximumBookIssuedHistory = require("../models/admin/maximumBookIssuedHistory");
const RackManagement = require("../models/admin/RackManagement");
const Notification = require("../models/admin/notification");
const BookSuggested = require("../models/admin/bookSuggested");
const QrCodeDetails = require("../models/admin/qrCodeDetails");
const PopularBook = require("../models/admin/popularBook");
const BookMaster = require("../models/admin/BookMaster");
const User = require("../models/auth/user");
const helper = require("../utils/helper");
const DepartmentMaster = require("../models/admin/departmentMaster");
const DesignationMaster = require("../models/admin/DesignationMaster");
const Activity = require("../models/activity/activityLog");
const OTPHistory = require("../models/auth/otp-history");
const AuthAttempt = require("../models/auth/authAttempt");
const EBookMaster = require("../models/admin/eBook");
const AuthorMaster = require("../models/admin/authorMaster");

const ItemSettings = require("../models/admin/itemSettings");

const fs = require("fs");
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);

const fastcsv = require('fast-csv');

const xlsx = require('xlsx');
const excel = require("exceljs");

exports.createInsertCollection = catchAsync(async(req, res, next) => {
    //console.log('1234');
    const response = new AppSuccess(res);
    try {
        // Magazine type add
        //BookMaster.collection.updateMany({}, {$set: {magazine_type: 0}});
        //BookMaster.collection.updateMany({bookType: 2}, {$set: {magazine_type: 1}});
        
        // User details update
        //User.collection.updateMany({}, {$set: {notification_type: 0,authorization_type: 0}});

        // Item settings update
        /* ItemSettings.collection.insertMany( [
            { itemType: 1, itemTypeType: null, returnPeriod: 15, itemIssue: 15, alertOne: 12, itemTwo: 14 },
            { itemType: 2, itemTypeType: 1, returnPeriod: 8, itemIssue: 2, alertOne: 2, itemTwo: 1 },
            { itemType: 2, itemTypeType: 2, returnPeriod: 3, itemIssue: 2, alertOne: 2, itemTwo: 1 },
            { itemType: 2, itemTypeType: 3, returnPeriod: 4, itemIssue: 2, alertOne: 2, itemTwo: 1 },
            { itemType: 3, itemTypeType: null, returnPeriod: 4, itemIssue: 2, alertOne: 2, itemTwo: 1 },
         ] ); */
         response.successResponse({
            message: `Data updated`
        });

    } catch (err) {
        return next(new AppError(err, 500));
    }

});

exports.dropCollection = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    try {
        BookReferenceUniqueNumberMaster.collection.drop();
        MaximumBookIssuedHistory.collection.drop();
        BookIssue.collection.drop();
        BookRequest.collection.drop();
        BlogParent.collection.drop();
        BlogComment.collection.drop();
        BlogLike.collection.drop();
        BookDamage.collection.drop();
        BookDetailsMaster.collection.drop();
        BookRatingHistory.collection.drop();
        Bookrating.collection.drop();
        BookRequisition.collection.drop();
        BookReturnDaysHistory.collection.drop();
        Notification.collection.drop();
        BookSuggested.collection.drop();
        QrCodeDetails.collection.drop();
        PopularBook.collection.drop();
        RackManagement.collection.drop();

        // /////**************/////
        // Activity.collection.drop();
        // OTPHistory.collection.drop();
        // AuthAttempt.collection.drop();
        // EBookMaster.collection.drop();
        // BookMaster.collection.drop();
        // DepartmentMaster.collection.drop();
        // DesignationMaster.collection.drop();
        /////**************/////
        const a = await BookMaster.updateMany({}, {
            $set: {
                quantity: null,
                availableQuantity: null,
                assignedQuantity: null,
                damageQuantity: null,
                lostQuantity: null,
                rating: 0
            }
        });

        if (a) {
            response.successResponse({
                message: `Drop Successfull`
            });
        } else {
            return next(new AppError("err", 500));
        }
    } catch (err) {
        return next(new AppError(err, 500));
    }

});

exports.store = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.file == undefined) {
        filePath = null;
    } else {
        filePath = req.file.path;
    }

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    let xlFile = xlsx.readFile(filePath);

    let sheet = xlFile.Sheets[xlFile.SheetNames[0]];

    let P_JSON = xlsx.utils.sheet_to_json(sheet);


    let uploadDetails = {};
    let successCount = 0;
    let errorCount = 0;
    let totalCount = 0;
    let deptID = "";
    let degID = "";

    let msg;
    let status;
    let error_value = [];
    for (const iterator of P_JSON) {

        let checkEmail = await User.find({
            email: iterator.Email
        });

        let validateEmail = helper.validateEmail(iterator.Email);

        let checkMobile = await User.find({
            mobile: iterator.MobileNumber
        });

        let validatePhone = helper.validatePhone(iterator.MobileNumber);

        let checkEmpCode = await User.find({
            employee_id: iterator.EmployeeCode
        });

        let error = new Array();

        if (!iterator.Name) {
            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Name field is blank"
            });
            error.push(false);
        } else if (iterator.Name.length < 4 || iterator.Name.length > 50) {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Name must be minimum 4 and maximum 50 characters"
            });
            error.push(false);
        }

        if (!iterator.MobileNumber) {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Mobile Number field is blank"
            });
            error.push(false);

        } else if (!validatePhone) {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Mobile Number is invalid"
            });
            error.push(false);

        } else if (checkMobile.length > 0) {
            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Mobile Number already exists"
            });
            error.push(false);
        }

        if (!iterator.Email) {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Email field is blank"
            });
            error.push(false);

        } else if (!validateEmail) {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Email is invalid"
            });
            error.push(false);

        } else if (checkEmail.length > 0) {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Email already exists"
            });
            error.push(false);

        } else if (iterator.Email.length < 6 || iterator.Address.length > 96) {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Email must be minimum 6 and maximum 96 characters"
            });
            error.push(false);
        }

        if (!iterator.EmployeeCode) {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Employee code field is blank"
            });

            error.push(false);
        } else if (checkEmpCode.length > 0) {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Employee Code already exists"
            });

            error.push(false);
        }

        if (!iterator.Department) {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Department field is blank"
            });
            error.push(false);

        } else {
            const checkDept = await DepartmentMaster.findOne({
                referenceNumber: iterator.Department,
                status: 1,
                deleted: 0
            });

            if (!checkDept) {

                error_value.push({
                    line_no: iterator.SlNo,
                    attribute: "Invalid Department"
                });
                error.push(false);

            } else {
                deptID = checkDept._id;

                if (!iterator.Designation) {

                    error_value.push({
                        line_no: iterator.SlNo,
                        attribute: "Designation field is blank"
                    });
                    error.push(false);

                } else {
                    const checkDeg = await DesignationMaster.findOne({
                        departmentID: deptID,
                        referenceNumber: iterator.Designation,
                        status: 1,
                        deleted: 0
                    });

                    if (!checkDeg) {

                        error_value.push({
                            line_no: iterator.SlNo,
                            attribute: "Invalid Designation"
                        });
                        error.push(false);

                    } else {

                        degID = checkDeg._id;
                    }
                }
            }
        }

        if (!iterator.Address) {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Address field is blank"
            });
            error.push(false);
        }

        if (iterator.Address.length < 10 || iterator.Address.length > 200) {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Address field must be minimum 10 and maximum 200 characters"
            });
            error.push(false);
        }

        if (!iterator.Gender) {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Gender field is blank"
            });
            error.push(false);
        } else if (iterator.Gender == 'M' || iterator.Gender == 'F' || iterator.Gender == 'O') {

        } else {

            error_value.push({
                line_no: iterator.SlNo,
                attribute: "Invalid gender field"
            });

            error.push(false);
        }


        totalCount++;

        if (error.includes(false)) {
            errorCount++;
            continue
        } else {

            await User.create({
                name: iterator.Name,
                designation: degID,
                mobile: iterator.MobileNumber,
                email: iterator.Email,
                department: deptID,
                employee_id: iterator.EmployeeCode,
                gender: iterator.Gender,
                address: iterator.Address,
                user_role: 3,
                created_by: userId
            });

            successCount++;
        }
    }

    if (error_value.length < 1) {
        error_value = [];
    }

    if (error_value.length > 0 && successCount == 0) {
        msg = "Import failed, please check the errors below.";
        status = "error";
    } else if (error_value.length > 0 && successCount > 0) {
        msg = "Import with errors, please check the errors below.";
        status = "error";
    } else {
        msg = "Successfully imported.";
        status = "success";
    }

    uploadDetails['status'] = status;
    uploadDetails['msg'] = msg
    uploadDetails['total_row'] = totalCount;
    uploadDetails['success_count'] = successCount;
    uploadDetails['error_count'] = errorCount;
    uploadDetails['error_row'] = error_value;

    response.successResponse({
        uploadDetails: uploadDetails
    });

});

exports.exportDepartment = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const departmentDetails = await DepartmentMaster.find({
        deleted: 0,
        status: 1
    }, {
        'referenceNumber': 1,
        'departmentName': 1,
    }).sort({ createdAt: -1 });

    const workbook = new excel.Workbook(); // Create a new workbook
    const worksheet = workbook.addWorksheet("Department"); // New Worksheet
    const path = "images/export"; // Path to download excel
    // Column for data in excel. key must match data key
    worksheet.columns = [
        { header: "S no.", key: "s_no", width: 10 },
        { header: "Reference Number", key: "rn", width: 25 },
        { header: "Department Name", key: "dn", width: 25 },
    ];

    // Looping through User data
    let counter = 1;
    departmentDetails.forEach((user) => {
        user.s_no = counter;
        user.rn = user.referenceNumber;
        user.dn = user.departmentName;
        worksheet.addRow(user); // Add data in worksheet
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






    // return workbook.xlsx.write(res).then(function() {
    //     res.status(200).end();
    // });


    // if (departmentDetails.length > 0) {
    //     let responseData = JSON.parse(JSON.stringify(departmentDetails));

    //     let fileName = `${Math.floor(Math.random() * 10000)}${Date.now()}.csv`;

    //     let filePath = "images/export/" + fileName;

    //     let ws = fs.createWriteStream(filePath);
    //     let i = 1;
    //     fastcsv.write(responseData, {
    //         headers: true,
    //         transform: (row) => {
    //             return {
    //                 "Sl No.": i++,
    //                 "Reference Number": row.referenceNumber,
    //                 "Department Name": row.departmentName,
    //             }
    //         }
    //     }).pipe(ws);

    //     response.successResponse({
    //         departmentList: responseData
    //     });

    // } else {
    //     return next(
    //         new AppError("No data found", 400)
    //     );
    // }

});

exports.exportDesignation = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const designationDetails = await DesignationMaster.aggregate([
        { $sort: { "createdAt": -1 } }, {
            $match: {
                deleted: 0,
                status: 1
            }
        }, {
            $lookup: {
                from: "departmentmasters",
                localField: "departmentID",
                foreignField: "_id",
                as: "departmentDetails"
            },
        },
        { $unwind: { path: "$departmentDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "designationName": 1,
                "referenceNumber": 1,
                "status": 1,
                "departmentDetails.departmentName": 1
            }
        },
    ]);

    const workbook = new excel.Workbook(); // Create a new workbook
    const worksheet = workbook.addWorksheet("Department"); // New Worksheet
    const path = "images/export"; // Path to download excel
    // Column for data in excel. key must match data key
    worksheet.columns = [
        { header: "S no.", key: "s_no", width: 10 },
        { header: "Department Name", key: "depn", width: 25 },
        { header: "Reference Number", key: "rn", width: 25 },
        { header: "Designation Name", key: "dn", width: 25 },
    ];

    // Looping through User data
    let counter = 1;
    designationDetails.forEach((user) => {
        user.s_no = counter;
        user.depn = user.departmentDetails.departmentName;
        user.rn = user.referenceNumber;
        user.dn = user.designationName;
        worksheet.addRow(user); // Add data in worksheet
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