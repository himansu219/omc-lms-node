const catchAsync = require("../../utils/catchAsync");
const DepartmentMaster = require("../../models/admin/departmentMaster");
const DesignationMaster = require("../../models/admin/DesignationMaster");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const User = require("../../models/auth/user");
const Activity = require("../../models/activity/activityLog");
const requestIp = require('request-ip');

exports.store = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    const existingDepartmentByName = await DepartmentMaster.findOne({
        departmentName: req.body.departmentName,
        //status: 1,
        deleted: 0
    });

    if (existingDepartmentByName) {
        return next(
            new AppError("Department already exists", 400, { type: "duplicate department name" })
        );
    }

    const deptCheck = await DepartmentMaster.find({});

    if (deptCheck.length > 0) {

        let lastRecordDetails = await DepartmentMaster.findOne({}, {
            'referenceNumber': 1
        }).sort({ createdAt: -1 });

        refNumber = (+lastRecordDetails.referenceNumber) + 1;

    } else {
        refNumber = 1111;
    }

    const newDepartment = await DepartmentMaster.create({
        departmentName: req.body.departmentName,
        referenceNumber: refNumber,
        created_by: userId
    });

    if (newDepartment) {

        let userType;
        if (req.user.user_role == 1) {
            userType = "Admin"
        } else if (req.user.user_role == 2) {
            userType = "Librarian"
        }

        const clientIp = requestIp.getClientIp(req);

        await Activity.create({
            ipAddress: clientIp,
            pageDetail: "Department Add",
            operationType: `Department Added - <a href="/departments"><b>${ req.body.departmentName }</b></a>`,
            userType: userType,
            created_by: userId
        });

        const data = {
            name: newDepartment.departmentName,
            id: newDepartment._id,
        };

        response.createResponse({
            message: "Department successfully added",
            department: data,
        });
    } else {
        return next(new AppError("Something went wrong", 500));
    }
});

exports.departmentList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const departmentDetails = await DepartmentMaster.find({
        deleted: 0,
    }, {
        'departmentName': 1,
        'status': 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total department count= ${ departmentDetails.length }`,
        departmentList: departmentDetails
    });

});

exports.findDepartment = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const departmentDetails = await DepartmentMaster.find({
        _id: req.params.id,
        deleted: 0
    }, {
        'departmentName': 1
    });

    if (departmentDetails.length > 0) {
        response.successResponse({
            message: `Department Details`,
            departmentData: departmentDetails
        });
    } else {
        return next(new AppError("Department details not found.", 500));
    }

});

exports.departmentUpdate = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.departmentID == "") {
        return next(new AppError("Department details not found", 500));
    }

    const checkDeptID = await DepartmentMaster.findById(req.body.departmentID, {
        deleted: 0
    });

    const checkDuplicateDepartment = await DepartmentMaster.find({
        _id: { $ne: req.body.departmentID },
        departmentName: req.body.departmentName,
        deleted: 0
    });

    if (checkDuplicateDepartment.length > 0) {
        return next(
            new AppError("Department name already exists", 400, { type: "duplicate department" })
        );
    }

    if (checkDeptID) {
        try {

            const updateDepartment = await DepartmentMaster.findByIdAndUpdate(req.body.departmentID, {
                departmentName: req.body.departmentName,
                updated_by: userId
            });

            if (updateDepartment) {

                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2) {
                    userType = "Librarian"
                }

                const clientIp = requestIp.getClientIp(req);

                let activity_data = [];

                if (checkDeptID.departmentName != req.body.departmentName) {
                    activity_data.push(`<b>Department Name :</b> "${ checkDeptID.departmentName }" to "${ req.body.departmentName }"`);
                }

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Department Update",
                    operationType: `Department Updated - <b><a href="/departments">${checkDeptID.departmentName}</a></b> <p>${ activity_data }</p>`,
                    userType: userType,
                    created_by: userId
                });

                const data = {
                    id: updateDepartment._id,
                };

                response.createResponse({
                    message: "Department details updated successfully.",
                    genre: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }
    } else {
        return next(new AppError("Department details not found.", 500));
    }
});

exports.departmentDestroy = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.departmentID == "") {
        return next(new AppError("Department details not found", 500));
    }

    try {

        const checkDepartmentTransactionData = await User.find({
            department: req.body.departmentID,
            deleted: 0
        });

        const checkDepartmentTransactionDegData = await DesignationMaster.find({
            departmentID: req.body.departmentID,
            deleted: 0
        });

        if (checkDepartmentTransactionData && checkDepartmentTransactionData.length > 0) {

            return next(
                new AppError(
                    "Unable to delete the data. Transactional data already exist",
                    500, {
                        type: "department_transaction_exist",
                    }
                )
            );
        }

        if (checkDepartmentTransactionDegData && checkDepartmentTransactionDegData.length > 0) {

            return next(
                new AppError(
                    "Unable to delete the data. Transactional data already exist",
                    500, {
                        type: "department_transaction_exist",
                    }
                )
            );
        }

        const deleteDepartment = await DepartmentMaster.findByIdAndUpdate(req.body.departmentID, {
            deleted: 1,
            updated_by: userId
        });

        if (deleteDepartment) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Department Delete",
                operationType: `Department Deleted - <a href="/departments"><b>${ deleteDepartment.departmentName }</b></a>`,
                userType: userType,
                created_by: userId
            });

            const data = {
                id: deleteDepartment._id,
            };

            response.createResponse({
                message: "Department deleted successfully.",
                department: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.departmentStatusChange = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.deptID) {
        return next(new AppError("Department details not found", 500))
    }

    if (!req.body.status) {
        return next(new AppError("Department status not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await DepartmentMaster.find({
            _id: req.body.deptID
        });

        if (checkDetailsMasterDataId.length == 0) {
            return next(
                new AppError(
                    "Department details not found",
                    500, {
                        type: "department_not_found"
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

        const statusChange = await DepartmentMaster.findByIdAndUpdate(req.body.deptID, {
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
                pageDetail: "Department Status Change",
                operationType: `Department Status Changed - <a href="/departments"><b>${ statusChange.departmentName }</b></a> <b>Status: </b> ${ statusBeforeChange } to ${ statusAfterChange }`,
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

exports.departmentListByStatus = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const departmentDetails = await DepartmentMaster.find({
        deleted: 0,
        status: 1
    }, {
        'departmentName': 1,
        'status': 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total department count= ${ departmentDetails.length }`,
        departmentList: departmentDetails
    });

});

exports.filterDepartmentList = catchAsync(async(req, res, next) => {
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

    if (req.body.title) {
        filterObject['departmentName'] = { $regex: req.body.title, "$options": "i" }
    }

    filterObject["deleted"] = 0;

    const departmentDetails = await DepartmentMaster.find(filterObject, {
            'departmentName': 1,
            'status': 1
        }).sort({ createdAt: -1 })
        .skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const departmentCount = await DepartmentMaster.find(filterObject, {
        'departmentName': 1,
        'status': 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total department count= ${ departmentDetails.length }`,
        departmentList: departmentDetails,
        departmentCount: departmentCount.length
    });

});