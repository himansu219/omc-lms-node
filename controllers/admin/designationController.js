const catchAsync = require("../../utils/catchAsync");
const DesignationMaster = require("../../models/admin/DesignationMaster");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const User = require("../../models/auth/user");
const Activity = require("../../models/activity/activityLog");
const requestIp = require('request-ip');
const departmentMaster = require("../../models/admin/departmentMaster");

let userId = '';

exports.store = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    const existingDesignationByName = await DesignationMaster.findOne({
        departmentID: req.body.departmentID,
        designationName: req.body.designationName,
        //status: 1,
        deleted: 0
    });

    if (existingDesignationByName) {
        return next(
            new AppError("Designation already exists", 400, { type: "duplicate designation name" })
        );
    }

    const degCheck = await DesignationMaster.find({});

    if (degCheck.length > 0) {

        let lastRecordDetails = await DesignationMaster.findOne({}, {
            'referenceNumber': 1
        }).sort({ createdAt: -1 });

        refNumber = (+lastRecordDetails.referenceNumber) + 1;

    } else {
        refNumber = 1111;
    }

    const newDesignation = await DesignationMaster.create({
        departmentID: req.body.departmentID,
        designationName: req.body.designationName,
        referenceNumber: refNumber,
        created_by: userId
    });

    if (newDesignation) {

        let userType;
        if (req.user.user_role == 1) {
            userType = "Admin"
        } else if (req.user.user_role == 2) {
            userType = "Librarian"
        }

        const clientIp = requestIp.getClientIp(req);

        await Activity.create({
            ipAddress: clientIp,
            pageDetail: "Designation Add",
            operationType: `Designation Added - <a href="/designations"><b>${ req.body.designationName }</b></a>`,
            userType: userType,
            created_by: userId
        });

        const data = {
            designationName: newDesignation.designationName,
            id: newDesignation._id,
        };

        response.createResponse({
            message: "Designation successfully added",
            designation: data,
        });
    } else {
        return next(new AppError("Something went wrong", 500));
    }
});

exports.designationDeptList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const designationDetails = await DesignationMaster.find({
        departmentID: req.params.id,
        status: 1,
        deleted: 0
    }, {
        'designationName': 1,
        'status': 1
    });

    if (designationDetails.length > 0) {
        response.successResponse({
            message: `Designation Details`,
            designationData: designationDetails
        });
    } else {
        response.successResponse({
            message: `No Designation Details`,
            designationData: []
        });
    }

});

exports.designationList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const designationDetails = await DesignationMaster.aggregate([
        { $sort: { "createdAt": -1 } }, {
            $match: {
                deleted: 0,
            }
        }, {
            $lookup: {
                from: "departmentmasters",
                localField: "departmentID",
                foreignField: "_id",
                as: "departmentDetails"
            },
        },
        {
            $project: {
                "designationName": 1,
                "status": 1,
                "departmentDetails.departmentName": 1
            }
        },
    ]);


    response.successResponse({
        message: `Total designation count= ${ designationDetails.length }`,
        designationList: designationDetails
    });

});

exports.designationDestroy = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.designationID == "") {
        return next(new AppError("Designation details not found", 500));
    }

    try {

        const checkDesignationTransactionData = await User.find({
            designation: req.body.designationID,
            deleted: 0
        });

        if (checkDesignationTransactionData && checkDesignationTransactionData.length > 0) {

            return next(
                new AppError(
                    "Unable to delete the data. Transactional data already exist",
                    500, {
                        type: "designation_transaction_exist",
                    }
                )
            );
        }

        const deleteDesignation = await DesignationMaster.findByIdAndUpdate(req.body.designationID, {
            deleted: 1,
            updated_by: userId
        });

        if (deleteDesignation) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Designation Delete",
                operationType: `Designation Deleted - <a href="/designations"><b>${ deleteDesignation.designationName }</b></a>`,
                userType: userType,
                created_by: userId
            });


            const data = {
                id: deleteDesignation._id,
            };

            response.createResponse({
                message: "Designation deleted successfully.",
                designation: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.findDesignation = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const designationDetails = await DesignationMaster.find({
        _id: req.params.id,
        deleted: 0
    }, {
        "designationName": 1,
    }).populate({
        path: 'departmentID',
        select: ['departmentName']
    }).sort({ createdAt: -1 });

    if (designationDetails.length > 0) {
        response.successResponse({
            message: `Designation Details`,
            designationData: designationDetails
        });
    } else {
        return next(new AppError("Designation details not found.", 500));
    }

});

exports.designationUpdate = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.designationID == "") {
        return next(new AppError("Designation details not found", 500));
    }

    const checkdesignationID = await DesignationMaster.findById(req.body.designationID, {
        deleted: 0
    });

    const checkDuplicateDesignation = await DesignationMaster.find({
        _id: { $ne: req.body.designationID },
        departmentID: req.body.departmentID,
        designationName: req.body.designationName,
        deleted: 0
    });

    if (checkDuplicateDesignation.length > 0) {
        return next(
            new AppError("Designation name already exists", 400, { type: "duplicate designation name" })
        );
    }

    if (checkdesignationID) {
        try {

            const updateDesignation = await DesignationMaster.findByIdAndUpdate(req.body.designationID, {
                departmentID: req.body.departmentID,
                designationName: req.body.designationName,
                updated_by: userId
            });

            if (updateDesignation) {

                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2) {
                    userType = "Librarian"
                }

                const clientIp = requestIp.getClientIp(req);

                let activity_data = [];

                if((checkdesignationID.departmentID.toString()).includes(req.body.departmentID.toString()) == false){

                    let oldDepartment = await departmentMaster.findById((checkdesignationID.departmentID ), {
                        "departmentName": 1
                    });

                    let newDepartment = await departmentMaster.findById((req.body.departmentID ), {
                        "departmentName": 1
                    });

                    activity_data.push(`<b>Department Name:</b> "${ oldDepartment.departmentName }" to "${ newDepartment.departmentName }"`)

                } 

                if(checkdesignationID.designationName != req.body.designationName){
                    activity_data.push(`<b>Designation Name:</b> "${ checkdesignationID.designationName }" to "${ req.body.designationName }"`)
                }

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Designation Update",
                    operationType: `Designation Updated - <a href="/designations"><b>${ checkdesignationID.designationName}</b></a> <p> ${ activity_data } </p>`,
                    userType: userType,
                    created_by: userId
                });

                const data = {
                    id: updateDesignation._id,
                };

                response.createResponse({
                    message: "Designation details updated successfully.",
                    designation: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }
    } else {
        return next(new AppError("Designation details not found.", 500));
    }
});

exports.designationStatusChange = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.degID) {
        return next(new AppError("Designation details not found", 500))
    }

    if (!req.body.status) {
        return next(new AppError("Designation status not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await DesignationMaster.find({
            _id: req.body.degID
        });

        if (checkDetailsMasterDataId.length == 0) {
            return next(
                new AppError(
                    "Designation details not found",
                    500, {
                        type: "designation_not_found"
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

        const statusChange = await DesignationMaster.findByIdAndUpdate(req.body.degID, {
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
                pageDetail: "Designation Status Change",
                operationType: `Designation Status Changed - <a href="/designations"><b>${ statusChange.designationName }</b></a> <b>Status: </b> ${ statusBeforeChange } to ${ statusAfterChange }`,
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

exports.designationListByStatus = catchAsync(async(req, res, next) => {
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
        {
            $project: {
                "designationName": 1,
                "status": 1,
                "departmentDetails.departmentName": 1
            }
        },
    ]);


    response.successResponse({
        message: `Total designation count= ${ designationDetails.length }`,
        designationList: designationDetails
    });

});

exports.filterDesignationList = catchAsync(async(req, res, next) => {
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
        filterObject['designationName'] = { $regex: req.body.title, "$options": "i" }
    }

    if (req.body.title) {
        filterObject1['departmentDetails.departmentName'] = { $regex: req.body.title, "$options": "i" }
    }

    const match_filter = { $or: [filterObject, filterObject1] };

    const designationDetails = await DesignationMaster.aggregate([
            { $sort: { "createdAt": -1 } }, {
                $match: {
                    deleted: 0,
                }
            }, {
                $lookup: {
                    from: "departmentmasters",
                    localField: "departmentID",
                    foreignField: "_id",
                    as: "departmentDetails"
                },
            },
            {
                $match: match_filter
            },
            {
                $project: {
                    "designationName": 1,
                    "status": 1,
                    "departmentDetails.departmentName": 1
                }
            },
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const designationCount = await DesignationMaster.aggregate([
        { $sort: { "createdAt": -1 } }, {
            $match: {
                deleted: 0,
            }
        }, {
            $lookup: {
                from: "departmentmasters",
                localField: "departmentID",
                foreignField: "_id",
                as: "departmentDetails"
            },
        },
        {
            $match: match_filter
        },
        {
            $project: {
                "designationName": 1,
                "status": 1,
                "departmentDetails.departmentName": 1
            }
        },
    ]);


    response.successResponse({
        message: `Total designation count= ${ designationDetails.length }`,
        designationList: designationDetails,
        designationCount: designationCount.length
    });

});