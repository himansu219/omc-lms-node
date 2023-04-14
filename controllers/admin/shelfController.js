const catchAsync = require("../../utils/catchAsync");
const ShelfMaster = require("../../models/admin/shelfMaster");
const RackManagement = require("../../models/admin/RackManagement");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const Activity = require("../../models/activity/activityLog");
const requestIp = require('request-ip');
const { ObjectID } = require("mongodb");
const rackMaster = require("../../models/admin/rackMaster");

exports.store = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId = '';

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    const existingShelfByName = await ShelfMaster.findOne({
        shelfName: req.body.shelf_name,
        rackID: req.body.rack_name,
        //status: 1,
        deleted: 0
    });

    if (existingShelfByName) {
        return next(
            new AppError("Shelf already exists", 400, { type: "duplicate shelf name" })
        );
    }

    const newShelf = await ShelfMaster.create({
        shelfName: req.body.shelf_name,
        rackID: req.body.rack_name,
        libraryID: req.body.library_name,
        created_by: userId
    });

    if (newShelf) {

        let userType;
        if (req.user.user_role == 1) {
            userType = "Admin"
        } else if (req.user.user_role == 2) {
            userType = "Librarian"
        }

        const clientIp = requestIp.getClientIp(req);

        await Activity.create({
            ipAddress: clientIp,
            pageDetail: "Shelf Add",
            operationType: `Shelf Added - <b><a href="/shelfs">${ req.body.shelf_name }</b></a>`,
            userType: userType,
            created_by: userId
        });

        const data = {
            shelfName: newShelf.shelfName,
            id: newShelf._id,
        };

        response.createResponse({
            message: "Shelf successfully added",
            shelf: data,
        });
    } else {
        return next(new AppError("Something went wrong", 500));
    }
});

exports.shelfList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const shelfDetails = await ShelfMaster.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                deleted: 0,
            }
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
                from: "librarymasters",
                localField: "libraryID",
                foreignField: "_id",
                as: "libraryDetails"
            },
        },
        {
            $project: {
                "shelfName": 1,
                "rackDetails.rackName": 1,
                "libraryDetails.libraryName": 1,
                "status": 1,
            }
        },
        { $unwind: { path: "$rackDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$libraryDetails", preserveNullAndEmptyArrays: true } },
    ]);

    response.successResponse({
        message: `Total rack count= ${ shelfDetails.length }`,
        shelfList: shelfDetails
    });

});

exports.findShelf = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const shelfDetails = await ShelfMaster.find({
        _id: req.params.id,
        deleted: 0
    }, {
        "shelfName": 1,
    }).populate({
        path: 'rackID',
        select: ['rackName']
    }).sort({ createdAt: -1 });

    if (shelfDetails.length > 0) {
        response.successResponse({
            message: `Shelf Details`,
            shelfData: shelfDetails
        });
    } else {
        return next(new AppError("Shelf details not found.", 500));
    }

});

exports.shelfDestroy = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.shelfID == "") {
        return next(new AppError("Shelf details not found", 500));
    }

    try {

        const checkShelfTransactionData = await RackManagement.find({
            shelfID: req.body.shelfID,
            deleted: 0
        });

        if (checkShelfTransactionData && checkShelfTransactionData.length > 0) {

            return next(
                new AppError(
                    "Unable to delete the data. Transactional data already exist",
                    500, {
                        type: "shelf_transaction_exist",
                    }
                )
            );
        }

        const deleteShelf = await ShelfMaster.findByIdAndUpdate(req.body.shelfID, {
            deleted: 1,
            updated_by: userId
        });

        if (deleteShelf) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Shelf Delete",
                operationType: `Shelf Deleted - <b><a href="/shelfs">${ deleteShelf.shelfName }</b></a>`,
                userType: userType,
                created_by: userId
            });

            const data = {
                id: deleteShelf._id,
            };

            response.createResponse({
                message: "Shelf deleted successfully.",
                rack: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }
});

exports.shelfUpdate = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (req.body.shelfID == "") {
        return next(new AppError("Shelf details not found", 500));
    }

    const checkshelfID = await ShelfMaster.findById(req.body.shelfID, {
        deleted: 0
    });

    const checkDuplicateShelf = await ShelfMaster.find({
        _id: { $ne: req.body.shelfID },
        rackID: req.body.rackID,
        shelfName: req.body.shelf_name,
        deleted: 0
    });

    if (checkDuplicateShelf.length > 0) {
        return next(
            new AppError("Shelf name already exists", 400, { type: "duplicate shelf name" })
        );
    }

    if (checkshelfID) {
        try {

            const updateShelf = await ShelfMaster.findByIdAndUpdate(req.body.shelfID, {
                rackID: req.body.rackID,
                shelfName: req.body.shelf_name,
                updated_by: userId
            });

            if (updateShelf) {
                
                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2) {
                    userType = "Librarian"
                }

                let activity_data = [];

                if((checkshelfID.rackID.toString()).includes(req.body.rackID.toString()) == false){

                    let oldRackTitle = await rackMaster.findById((checkshelfID.rackID ), {
                        "rackName": 1
                    });

                    let newRackTitle = await rackMaster.findById((req.body.rackID ), {
                        "rackName": 1
                    });

                    activity_data.push(`<b>Rack Name:</b> "${ oldRackTitle.rackName }" to "${ newRackTitle.rackName }"`)

                } 

                if(checkshelfID.shelfName != req.body.shelf_name){
                    activity_data.push(`<b>Shelf Name:</b> "${ checkshelfID.shelfName }" to "${ req.body.shelf_name }"`)
                }

                const clientIp = requestIp.getClientIp(req);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Shelf Update",
                    operationType: `Shelf Updated - <a href="/shelfs"><b>${ checkshelfID.shelfName }</b></a> <p>${ activity_data } </p>`,
                    userType: userType,
                    created_by: userId
                });

                const data = {
                    id: updateShelf._id,
                };

                response.createResponse({
                    message: "Shelf details updated successfully.",
                    shelf: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } catch (err) {
            return next(new AppError("Something went wrong.", 500));
        }
    } else {
        return next(new AppError("Shelf details not found.", 500));
    }


});

exports.rackShelfList = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    const shelfListDetails = await ShelfMaster.find({
        rackID: req.params.id,
        deleted: 0,
        status: 1
    }, {
        'shelfName': 1
    });

    if (shelfListDetails.length > 0) {
        response.successResponse({
            message: `shelfList Details`,
            shelfListData: shelfListDetails
        });
    } else {
        response.successResponse({
            message: `No shelfList Details`,
            shelfListData: []
        });
    }

});

exports.shelfStatusChange = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.shelfID) {
        return next(new AppError("Shelf details not found", 500))
    }

    if (!req.body.status) {
        return next(new AppError("Shelf status not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await ShelfMaster.find({
            _id: req.body.shelfID
        });

        if (checkDetailsMasterDataId.length == 0) {
            return next(
                new AppError(
                    "Shelf details not found",
                    500, {
                        type: "shelf_not_found"
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

        const statusChange = await ShelfMaster.findByIdAndUpdate(req.body.shelfID, {
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
                pageDetail: "Shelf Status Change",
                operationType: `Shelf Status Changed <a href="/shelfs"><b>${ statusChange.shelfName }</b></a> <b>Status: </b> ${ statusBeforeChange } to ${ statusAfterChange }`,
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

exports.shelfListByStatus = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const shelfDetails = await ShelfMaster.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                deleted: 0,
                status: 1
            }
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
                from: "librarymasters",
                localField: "libraryID",
                foreignField: "_id",
                as: "libraryDetails"
            },
        },
        {
            $project: {
                "shelfName": 1,
                "rackDetails.rackName": 1,
                "libraryDetails.libraryName": 1,
                "status": 1,
            }
        },
        { $unwind: { path: "$rackDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$libraryDetails", preserveNullAndEmptyArrays: true } },
    ]);

    response.successResponse({
        message: `Total rack count= ${ shelfDetails.length }`,
        shelfList: shelfDetails
    });

});

exports.filterShelfList = catchAsync(async(req, res, next) => {
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
        filterObject['shelfName'] = { $regex: req.body.title, "$options": "i" }
    }

    if (req.body.title) {
        filterObject1['rackDetails.rackName'] = { $regex: req.body.title, "$options": "i" }
    }

    const match_filter = { $or: [filterObject, filterObject1] };

    const shelfDetails = await ShelfMaster.aggregate([
            { $sort: { "createdAt": -1 } },
            {
                $match: {
                    deleted: 0,
                }
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
                    from: "librarymasters",
                    localField: "libraryID",
                    foreignField: "_id",
                    as: "libraryDetails"
                },
            },
            {
                $match: match_filter
            },
            {
                $project: {
                    "shelfName": 1,
                    "rackDetails.rackName": 1,
                    "libraryDetails.libraryName": 1,
                    "status": 1,
                }
            },
            { $unwind: { path: "$rackDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$libraryDetails", preserveNullAndEmptyArrays: true } },
        ]).skip(pageSize * (currentPage - 1))
        .limit(pageSize);

    const shelfCount = await ShelfMaster.aggregate([
        { $sort: { "createdAt": -1 } },
        {
            $match: {
                deleted: 0,
            }
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
                from: "librarymasters",
                localField: "libraryID",
                foreignField: "_id",
                as: "libraryDetails"
            },
        },
        {
            $match: match_filter
        },
        {
            $project: {
                "shelfName": 1,
                "rackDetails.rackName": 1,
                "libraryDetails.libraryName": 1,
                "status": 1,
            }
        },
        { $unwind: { path: "$rackDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$libraryDetails", preserveNullAndEmptyArrays: true } },
    ]);

    response.successResponse({
        message: `Total rack count= ${ shelfDetails.length }`,
        shelfList: shelfDetails,
        shelfCount: shelfCount.length
    });

});