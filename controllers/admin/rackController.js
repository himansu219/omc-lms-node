const catchAsync = require("../../utils/catchAsync");
const RackMaster = require("../../models/admin/rackMaster");
const ShelfMaster = require("../../models/admin/shelfMaster");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
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

    const existingRackByName = await RackMaster.findOne({
        rackName: req.body.rack_name,
        libraryID: req.body.library_name,
        deleted: 0
    });

    if (existingRackByName) {
        return next(
            new AppError("Rack already exists", 400, { type: "duplicate rack name" })
        );
    }

    const newRack = await RackMaster.create({
        rackName: req.body.rack_name,
        libraryID: req.body.library_name,
        created_by: userId
    });

    if (newRack) {

        let userType;
        if (req.user.user_role == 1) {
            userType = "Admin"
        } else if (req.user.user_role == 2) {
            userType = "Librarian"
        }

        const clientIp = requestIp.getClientIp(req);

        await Activity.create({
            ipAddress: clientIp,
            pageDetail: "Rack Add",
            operationType: `Rack Added - <a href="/racks"><b>${ req.body.rack_name }</b></a>`,
            userType: userType,
            created_by: userId
        });

        const data = {
            title: newRack.rackName,
            id: newRack._id,
        };

        response.createResponse({
            message: "Rack successfully added",
            rack: data,
        });
    } else {
        return next(new AppError("Something went wrong", 500));
    }
});

exports.rackList = catchAsync(async(req, res, next) => {
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

    const rackDetails = await RackMaster.aggregate([{ $sort: { "createdAt": -1 } }, {
                $match: {
                    deleted: 0
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
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const rackCount = await RackMaster.aggregate([{ $sort: { "createdAt": -1 } }, {
            $match: {
                deleted: 0
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
        message: `Total rack count= ${ rackDetails.length }`,
        rackList: rackDetails,
        rackCount: rackCount.length
    });

});

exports.findRack = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    const rackDetails = await RackMaster.aggregate([{
            $match: {
                status: 1,
                deleted: 0,
                $expr: { $eq: ['$_id', { $toObjectId: req.params.id }] }
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
                "libraryDetails.libraryName": 1
            }
        }
    ]);

    if (rackDetails) {
        response.successResponse({
            rackDetails: rackDetails
        });
    } else {
        return next(new AppError("Rack details not found.", 500));
    }

});

exports.rackUpdate = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.rackID == "") {
        return next(new AppError("Rack details not found", 500));
    }

    const checkrackID = await RackMaster.findById(req.body.rackID, {
        deleted: 0
    });

    const checkDuplicateRack = await RackMaster.find({
        _id: { $ne: req.body.rackID },
        rackName: req.body.rack_name,
        libraryID: req.body.library_name,
        deleted: 0
    });

    if (checkDuplicateRack.length > 0) {
        return next(
            new AppError("Rack name already exists", 400, { type: "duplicate rack" })
        );
    }

    if (checkrackID) {
        try {

            const updateRack = await RackMaster.findByIdAndUpdate(req.body.rackID, {
                rackName: req.body.rack_name,
                updated_by: userId
            });

            if (updateRack) {

                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2) {
                    userType = "Librarian"
                }
                
                
                const clientIp = requestIp.getClientIp(req);

                let activity_data = [];

                if (checkDuplicateRack.rackName != req.body.rack_name) {
                    activity_data.push(`<b>Rack Name :</b> "${ updateRack.rackName }" to "${ req.body.rack_name }"`);
                }

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Rack Update",
                    operationType: `Rack Updated - <a href="/racks"><b>${ updateRack.rackName }</b></a> <p>${activity_data}</p>`,
                    userType: userType,
                    created_by: userId
                });

                const data = {
                    id: updateRack._id,
                };

                response.createResponse({
                    message: "Rack details updated successfully.",
                    rack: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }
    } else {
        return next(new AppError("Rack details not found.", 500));
    }
});

exports.rackDestroy = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    console.log(req.body);
    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.rackID == "") {
        return next(new AppError("Rack details not found", 500));
    }

    try {

        const checkRackTransactionData = await ShelfMaster.find({
            rackID: req.body.rackID,
            deleted: 0
        });

        if (checkRackTransactionData && checkRackTransactionData.length > 0) {

            return next(
                new AppError(
                    "Unable to delete the data. Transactional data already exist",
                    500, {
                        type: "rack_transaction_exist",
                    }
                )
            );
        }

        const deleteRack = await RackMaster.findByIdAndUpdate(req.body.rackID, {
            deleted: 1,
            updated_by: userId
        });

        if (deleteRack) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Rack Delete",
                operationType: `Rack Deleted - <a href="/racks"><b>${ deleteRack.rackName}</b></a>`,
                userType: userType,
                created_by: userId
            });

            const data = {
                id: deleteRack._id,
            };

            response.createResponse({
                message: "Rack deleted successfully.",
                rack: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.rackStatusChange = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.rackID) {
        return next(new AppError("Rack details not found", 500))
    }

    if (!req.body.status) {
        return next(new AppError("Rack status not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await RackMaster.find({
            _id: req.body.rackID
        });

        if (checkDetailsMasterDataId.length == 0) {
            return next(
                new AppError(
                    "Rack details not found",
                    500, {
                        type: "rack_not_found"
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

        const statusChange = await RackMaster.findByIdAndUpdate(req.body.rackID, {
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
                pageDetail: "Rack Status Change",
                operationType: `Rack Status Changed - <a href="/racks"><b>${ statusChange.rackName }</b></a> <b>Status: </b> ${ statusBeforeChange } to ${ statusAfterChange }`,
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

exports.rackListByStatus = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const rackDetails = await RackMaster.aggregate([{ $sort: { "createdAt": -1 } }, {
            $match: {
                deleted: 0,
                status: 1
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
        message: `Total rack count= ${ rackDetails.length }`,
        rackList: rackDetails
    });

});

exports.filterRackList = catchAsync(async(req, res, next) => {
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
        filterObject['rackName'] = { $regex: req.body.title, "$options": "i" }
    }

    const rackDetails = await RackMaster.aggregate([{ $sort: { "createdAt": -1 } }, {
                $match: {
                    deleted: 0
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
                $match: filterObject
            },
            {
                $project: {
                    "rackName": 1,
                    "status": 1,
                    "libraryDetails.libraryName": 1
                }
            },
            { $unwind: { path: "$libraryDetails", preserveNullAndEmptyArrays: true } }
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const rackCount = await RackMaster.aggregate([{ $sort: { "createdAt": -1 } }, {
            $match: {
                deleted: 0
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
            $match: filterObject
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
        message: `Total rack count= ${ rackDetails.length }`,
        rackList: rackDetails,
        rackCount: rackCount.length
    });

});