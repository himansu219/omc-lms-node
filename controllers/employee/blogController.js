const catchAsync = require("../../utils/catchAsync");
const BlogParent = require("../../models/employee/blogParent");
const BlogComment = require("../../models/employee/blogComment");
const BlogLike = require("../../models/employee/blogLike");
const User = require("../../models/auth/user");
const BookMaster = require("../../models/admin/BookMaster");
const BookDetailsMaster = require("../../models/admin/BookDetailsMaster");
const UserRelationMaster = require("../../models/admin/userRelationMaster");
const AppError = require("../../utils/appError");
const AppSuccess = require("../../utils/appSuccess");
const { count } = require("../../models/admin/BookMaster");
const Notification = require("../../models/admin/notification");
const requestIp = require('request-ip');
const Activity = require("../../models/activity/activityLog");

exports.blogItemsList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.data) {
        return next(new AppError("Please enter data to find", 500))
    }

    let filterObject = {};

    if (req.body.data) {
        filterObject['title'] = { $regex: req.body.data, "$options": "i" }
    }

    const item = await BookMaster.find(filterObject,{
        "title": 1,
        "bookType": 1,
    }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total items count= ${ item.length }`,
        itemList: item
    });

});

exports.blogreferenceNoList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    if (!req.body.data) {
        return next(new AppError("Please enter data to find", 500))
    }

    let filterObject = {};
    let filterObject1 = {};
    let filterObject2 = {};
    const orArray = [];
    if (req.body.data) {

        //filterObject1['bookReferenceNumber'] = { $regex: req.body.data, "$options": "i" }
        orArray.push(
            { 
                'bm.title': { $regex: req.body.data, "$options": "i" } 
            }, 
            { 
                'bookReferenceNumber': { $regex: req.body.data, "$options": "i" } 
            });
        const data = await BookDetailsMaster.find(filterObject1, {
            "_id": 1,
            "bookID": 1,
        });

        var books = await BookDetailsMaster.aggregate([{
            $match: {
                status: 1,
                deleted: 0,
                bookReferenceNumber: { $ne: null }
            },
        },
        {
            $lookup: {
                from: "bookmasters",
                localField: "bookID",
                foreignField: "_id",
                as: "bm"
            },
        },
        /* { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$employeeID", preserveNullAndEmptyArrays: true } },*/ 
        { $unwind: { path: "$bm", preserveNullAndEmptyArrays: false } },
        {
            $match: {
                $or: orArray
            }
        },{ 
            "$group": {
                "_id": "$bm.title",
                "bookReferenceNumber":{$first: "$bookReferenceNumber"},
                "bookType":{$first: "$bm.bookType"},
                count : { $sum: 1 }
            }
        }/* ,
        {
            $project: {
                "bm.title": 1,
                "bm.bookType": 1,
                "bm._id": 1,
                "bookReferenceNumber":1
            }
        } */
    ]/* ,function(err,results) {
        //if (err) throw err;
        console.log(results);
    } */);

    
        // for(const item of data){
            

        //     const checkbookData = await BookMaster.find(item.bookID, {
        //         "title": 1,
        //         "bookType": 1
        //     });

        //     let bookData = [];

        //     bookData.push(checkbookData);

            

        //     filterObject['title'] = { $regex: checkbookData.title, "$options": "i" }

        // }
    }

    // const item = await BookMaster.find(filterObject,{
    //     "title": 1,
    //     "bookType": 1,
    // }).sort({ createdAt: -1 });

    response.successResponse({
        message: `Total reference count= ${ books.length }`,
        refList: books
    });

});

exports.addBlog = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId;
    let bookId;

    try {

        if (!req.body.userId) {
            return next(new AppError("User details not found", 500))
        } else {
            userId = req.body.userId;
        }

        if (req.file == undefined) {
            imgData = null;
        } else {
            imgData = "images/blog/" + req.file.filename;
        }

        if (req.body.bookId) {

            const checkID = await BookDetailsMaster.findOne({
                bookReferenceNumber: req.body.bookId,
                deleted: 0
            });

            if (checkID) {
                bookId = checkID.bookID;
            } else {
                return next(new AppError("Invalid book reference number.", 500));
            }

        } else {
            bookId = null;
        }

        const storeBlog = await BlogParent.create({
            userId: userId,
            bookId: bookId,
            bookRefNum: req.body.bookId,
            description: req.body.description,
            img: imgData,
            relation: req.body.relation,
            created_by: userId
        });

        if (storeBlog) {

            const getUser = await User.findById(userId, {
                deleted: 0
            }, {
                "name": 1
            });

            const getUserIdFromRole = await User.find({
                user_role: { $in: [1, 2, 4] },
                deleted: 0
            }, {
                "_id": 1
            });

            for (const iterator of getUserIdFromRole) {
                await Notification.create({
                    user_id: userId,
                    notification_for: iterator,
                    notificationRole: 1,
                    notification_type: "Blog",
                    message: `${getUser.name} has posted a blog.`,
                    created_by: userId
                });
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Blog Added",
                operationType: `Blog Added - <a href="/blogs"><b>${ getUser.name }</b> has posted a blog.</a>`,
                userType: "Employee",
                created_by: userId
            });

            const data = {
                id: storeBlog._id,
            };

            response.createResponse({
                message: "Blog added successfully",
                blog: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }

    } catch (err) {
        return next(new AppError(err, 500));
    }

});

exports.editBlog = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId;
    let bookId;

    try {

        if (!req.body.userId) {
            return next(new AppError("User details not found", 500))
        } else {
            userId = req.body.userId;
        }

        if (!req.body.blogId) {
            return next(new AppError("Blog details not found", 500))
        }

        const checkID = await BlogParent.findById(req.body.blogId, {
            deleted: 0
        });

        if (checkID) {

            if (!req.file) {
                imgData = checkID.img;
            } else {
                imgData = "images/blog/" + req.file.filename;
            }

            if (req.body.bookId) {

                const checkIDs = await BookDetailsMaster.findOne({
                    bookReferenceNumber: req.body.bookId,
                    deleted: 0
                });

                if (checkIDs) {
                    bookId = checkIDs.bookID;
                } else {
                    return next(new AppError("Invalid book reference number.", 500));
                }

            } else {
                bookId = null;
            }

            const updateBlog = await BlogParent.findByIdAndUpdate(req.body.blogId, {

                userId: userId,
                bookId: bookId,
                bookRefNum: req.body.bookId,
                description: req.body.description,
                img: imgData,
                relation: req.body.relation,
                created_by: userId
            });

            const getUser = await User.findById(userId, {
                deleted: 0
            }, {
                "name": 1
            });

            if (updateBlog) {

                const clientIp = requestIp.getClientIp(req);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Blog Updated",
                    operationType: `Blog Updated - <a href="/blogs"><b>${ getUser.name }</b> has updated a blog.</a>`,
                    userType: "Employee",
                    created_by: userId
                });

                const data = {
                    id: updateBlog._id,
                };

                response.createResponse({
                    message: "Blog updated successfully.",
                    blog: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } else {
            return next(new AppError("Blog details not found.", 500));
        }

    } catch (err) {
        return next(new AppError("Something went wrong", 500));
    }

});

exports.addComments = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId;
    let storeComment;
    let checkID;

    try {

        if (!req.body.userId) {
            return next(new AppError("User details not found", 500))
        } else {
            userId = req.body.userId;
        }

        if (!req.body.blogId) {
            return next(new AppError("Blog details not found", 500))
        } else {
            checkID = await BlogParent.findById(req.body.blogId, {
                deleted: 0
            });

            if (checkID) {
                blogId = req.body.blogId;
            } else {
                return next(new AppError("Blog details not found.", 500));
            }
        }

        storeComment = await BlogComment.create({
            blogId: blogId,
            userId: userId,
            comment: req.body.comment,
            created_by: userId
        });

        if (storeComment) {

            let userIdString = userId.toString();
            let postedUserIdString = checkID.userId.toString();

            if (userIdString != postedUserIdString) {

                const empName = await User.findById(userId, {
                    deleted: 0
                });

                const blogPostedByempName = await User.findById(checkID.userId, {
                    deleted: 0
                });

                await Notification.create({
                    user_id: userId,
                    notification_for: checkID.userId,
                    notificationRole: 2,
                    notification_type: "Blog Commented",
                    message: `${empName.name} commented your blog.`,
                    created_by: userId
                });


                const clientIp = requestIp.getClientIp(req);

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Comment Added",
                    operationType: `Comment Added - <a href="/blogs"><b>${ empName.name }</b> has commented on blog posted by ${ blogPostedByempName.name }.</a>`,
                    userType: "Employee",
                    created_by: userId
                });
            }

            const data = {
                id: storeComment._id,
            };

            response.createResponse({
                message: "Comment added successfully",
                comment: data,
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }

    } catch (err) {
        return next(new AppError(err, 500));
    }

});

exports.editComment = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId;

    try {

        if (!req.body.userId) {
            return next(new AppError("User details not found", 500))
        } else {
            userId = req.body.userId;
        }

        if (!req.body.commentId) {
            return next(new AppError("Comment details not found", 500))
        }

        const checkID = await BlogComment.findById(req.body.commentId, {
            deleted: 0
        });

        if (checkID) {

            const updateComment = await BlogComment.findByIdAndUpdate(req.body.commentId, {
                comment: req.body.comment,
                updated_by: userId
            });

            if (updateComment) {
                
                const data = {
                    id: updateComment._id,
                };

                response.createResponse({
                    message: "Comment updated successfully.",
                    comment: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } else {
            return next(new AppError("Comment details not found.", 500));
        }

    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }

});

exports.likes = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let userId;
    let parentId;
    let blogId;

    if (!req.body.userId) {
        return next(new AppError("User details not found", 500))
    } else {
        userId = req.body.userId;
    }

    if (!req.body.parentBlogId) {
        return next(new AppError("Details not found", 500, {
            type: "blog_details_not_found"
        }));
    } else {
        blogId = await BlogParent.findById(req.body.parentBlogId, {
            deleted: 0
        });

        if (blogId) {
            parentId = req.body.parentBlogId;
        } else {
            return next(new AppError("Blog details not found", 500, {
                type: "blog_details_not_found"
            }));
        }
    };

    try {

        const existingData = await BlogLike.findOne({
            parentBlogId: parentId,
            userId: userId
        });

        if (existingData) {

            let status;
            if (existingData.status == 1) {
                status = 0;
            } else {
                status = 1;
            }

            const updateLike = await BlogLike.findByIdAndUpdate(existingData.id, {
                status: status,
                updated_by: userId
            });

            if (updateLike) {

                response.createResponse({
                    message: "Like successfully updated."
                });

            } else {
                return next(new AppError("Something went wrong", 500));
            }

        } else {
            const likes = await BlogLike.create({
                userId: userId,
                parentBlogId: parentId,
                created_by: userId
            });

            if (likes) {

                let userIdString = userId.toString();
                let postedUserIdString = blogId.userId.toString();

                if (userIdString != postedUserIdString) {

                    const empName = await User.findById(userId, {
                        deleted: 0
                    });

                    const blogPostedByempName = await User.findById(blogId.userId, {
                        deleted: 0
                    });

                    await Notification.create({
                        user_id: userId,
                        notification_for: blogId.userId,
                        notificationRole: 2,
                        notification_type: "Blog Liked",
                        message: `${empName.name} liked your blog.`,
                        created_by: userId
                    });

                    const clientIp = requestIp.getClientIp(req);

                    await Activity.create({
                        ipAddress: clientIp,
                        pageDetail: "Blog Liked",
                        operationType: `Blog Liked - <a href="/blogs"><b>${ empName.name }</b> has liked on blog posted by ${ blogPostedByempName.name }.</a>`,
                        userType: "Employee",
                        created_by: userId
                    });
                }

                const data = {
                    id: likes._id,
                };

                response.createResponse({
                    message: "Like successfully added",
                    comment: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        }
    } catch (err) {
        return next(new AppError(err, 500));
    }

});

exports.deleteBlog = catchAsync(async(req, res, next) => {
    
    const response = new AppSuccess(res);

    if (req.user) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.blogId) {
        return next(new AppError("Blog details not found", 500));
    }

    try {

        const blogParentId = await BlogParent.findById(req.body.blogId, {
            deleted: 0
        });

        const userDetails = await User.findById(blogParentId.userId, {
            deleted: 0,
        });

        if (blogParentId) {

            const deleteBlog = await BlogParent.findByIdAndUpdate(req.body.blogId, {
                deleted: 1,
                updated_by: userId
            });

            if (deleteBlog) {

                const data = {
                    id: deleteBlog._id,
                };

                const clientIp = requestIp.getClientIp(req);

                let userType;
                if (req.user.user_role == 1) {
                    userType = "Admin"
                } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                    userType = "Librarian"
                }

                await Activity.create({
                    ipAddress: clientIp,
                    pageDetail: "Blog Deleted",
                    operationType: `Blog Deleted - <a href="/blogs"> Blog by <b>${ userDetails.name }</b></a> has been deleted`,
                    userType: userType,
                    created_by: userId
                });

                response.createResponse({
                    message: "Blog removed successfully.",
                    blog: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } else {
            return next(new AppError("Blog details not found", 500));
        }

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.deleteComment = catchAsync(async(req, res, next) => {
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

    if (!req.body.commentId) {
        return next(new AppError("Comment details not found", 500));
    }

    try {

        const commentId = await BlogComment.findOne({
            _id: req.body.commentId,
            userId: userId,
            deleted: 0
        });

        if (commentId) {

            const deleteComment = await BlogComment.findByIdAndUpdate(req.body.commentId, {
                deleted: 1,
                updated_by: userId
            });

            if (deleteComment) {

                const data = {
                    id: deleteComment._id,
                };

                response.createResponse({
                    message: "Comment removed successfully.",
                    blog: data,
                });
            } else {
                return next(new AppError("Something went wrong", 500));
            }
        } else {
            return next(new AppError("Comment details not found", 500));
        }

    } catch (err) {
        return next(new AppError("Something went wrong", 500));
    }
});

exports.blogList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let arr = new Array();
    try {

        const blogDetails = await BlogParent.find({
            deleted: 0,
        }, {
            "description": 1,
            "createdAt": 1,
            "img": 1,
            "status": 1,
        }).populate({
            path: 'userId',
            select: ['name', 'email', 'mobile', 'employee_id']
        }).populate({
            path: 'relation',
            select: ['relation']
        }).populate({
            path: 'bookId',
            select: ['title', 'front_image']
        }).sort({ createdAt: -1 });

        if (blogDetails.length > 0) {

            for (const iterator of blogDetails) {
                const reply = await BlogComment.find({
                    status: 1,
                    deleted: 0,
                    blogId: iterator._id
                });

                const like = await BlogLike.find({
                    status: 1,
                    deleted: 0,
                    parentBlogId: iterator._id
                });

                arr.push({
                    id: iterator._id,
                    empId: iterator.userId._id,
                    empName: iterator.userId.name,
                    empEmail: iterator.userId.email,
                    empMobile: iterator.userId.mobile,
                    empId: iterator.userId.employee_id,
                    relationship: iterator.relation.relation,
                    commentCount: reply.length,
                    likeCount: like.length,
                    blogCreatedDate: iterator.createdAt,
                    blogDescription: iterator.description,
                    status: iterator.status,
                    blogimg: iterator.img,
                    bookDetails: iterator.bookId,
                });
            }
        }

        response.successResponse({
            message: `Total blog count= ${ arr.length }`,
            blogList: arr
        });

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.blogDetails = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let arr = new Array();

    const checkData = await BlogParent.findOne({
        _id: req.params.id,
        deleted: 0
    }, {
        'title': 1,
        'description': 1,
        'createdAt': 1,
        'img': 1
    }).populate({
        path: 'userId',
        select: ['name', 'email', 'phone', 'employee_id']
    }).populate({
        path: 'relation',
        select: ['relation']
    });

    if (checkData) {

        const blogLikes = await BlogLike.find({
            status: 1,
            deleted: 0,
            parentBlogId: req.params.id,
        }, {
            'createdAt': 1,
        }).populate({
            path: 'userId',
            select: ['name', 'email', 'phone', 'employee_id']
        });

        const blogComment = await BlogComment.find({
            status: 1,
            deleted: 0,
            blogId: req.params.id,
        }, {
            'comment': 1,
            'createdAt': 1,
        }).populate({
            path: 'userId',
            select: ['name', 'email', 'phone', 'employee_id']
        });

        response.successResponse({
            blogDetails: checkData,
            blogLikeCount: blogLikes.length,
            blogCommentCount: blogComment.length,
            blogLike: blogLikes,
            blogComment: blogComment,
        });
    } else {
        return next(new AppError("Blog details not found.", 500));
    }

});

// exports.empBlogList = catchAsync(async(req, res, next) => {
//     const response = new AppSuccess(res);

//     if (!req.body.userId) {
//         return next(new AppError("User details not found", 500))
//     } else {
//         const checkID = await User.findById(req.body.userId, {
//             deleted: 0
//         });

//         if (checkID) {
//             userId = req.body.userId;
//         } else {
//             return next(new AppError("User details not found.", 500));
//         }
//     }

//     let arr = new Array();
//     try {

//         const blogDetails = await BlogParent.find({
//             userId: userId,
//             deleted: 0,
//         }, {
//             "title": 1,
//             "description": 1,
//             "createdAt": 1,
//             "img": 1,
//         }).populate({
//             path: 'relation',
//             select: ['relation']
//         }).sort({ createdAt: -1 });

//         if (blogDetails.length > 0) {

//             let details = {};

//             for (const iterator of blogDetails) {
//                 const reply = await BlogComment.find({
//                     status: 1,
//                     deleted: 0,
//                     blogId: iterator._id
//                 });

//                 const like = await BlogLike.find({
//                     status: 1,
//                     deleted: 0,
//                     parentBlogId: iterator._id
//                 });

//                 details['data'] = iterator;
//                 details['commentCount'] = reply.length;
//                 details['likeCount'] = like.length;
//                 arr.push(details);
//             }
//         }

//         response.successResponse({
//             message: `Total blog count= ${ blogDetails.length }`,
//             blogList: arr
//         });

//     } catch (err) {
//         return next(new AppError(err, 500));
//     }
// });

// exports.blogCommentReply = catchAsync(async(req, res, next) => {
//     const response = new AppSuccess(res);
//     let arr = new Array();

//     const checkData = await BlogComment.find({
//         status: 1,
//         deleted: 0,
//         parentId: req.params.id
//     }, {
//         'comment': 1,
//         'createdAt': 1,
//     }).populate({
//         path: 'userId',
//         select: ['name', 'email', 'phone', 'employee_id']
//     });

//     if (checkData.length > 0) {

//         for (const iterator of checkData) {

//             const commentLike = await BlogLike.find({
//                 status: 1,
//                 deleted: 0,
//                 commentBlogId: iterator._id
//             });

//             let details = {};
//             details['data'] = iterator;
//             details['replyLikeCount'] = commentLike.length;
//             arr.push(details);
//         }

//         response.successResponse({
//             commentReplyList: arr
//         });
//     } else {
//         return next(new AppError("Blog details not found.", 500));
//     }

// });

// exports.likeList = catchAsync(async(req, res, next) => {

//     const response = new AppSuccess(res);

//     if (req.params.type == "blog") {

//         const likeDetails = await BlogLike.find({
//             parentBlogId: req.params.id,
//             status: 1,
//             deleted: 0,
//         }, {
//             "userId": 1,
//             "_id": 0
//         }).populate({
//             path: 'userId',
//             select: ['name']
//         }).sort({ createdAt: -1 });

//         response.successResponse({
//             parameter: req.params.type,
//             likeCount: likeDetails.length,
//             likeDetails: likeDetails
//         });

//     } else if (req.params.type == "comment") {

//         const likeDetails = await BlogLike.find({
//             commentBlogId: req.params.id,
//             status: 1,
//             deleted: 0,
//         }, {
//             "userId": 1,
//             "_id": 0
//         }).populate({
//             path: 'userId',
//             select: ['name']
//         }).sort({ createdAt: -1 });

//         response.successResponse({
//             parameter: req.params.type,
//             likeCount: likeDetails.length,
//             likeDetails: likeDetails
//         });

//     } else {
//         return next(new AppError("Invalid Parameter", 500));
//     }

// });

exports.relationshipList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    const userRelationData = await UserRelationMaster.find({
        deleted: 0,
        status: 1
    }, {
        'relation': 1,
        'status': 1
    }).sort({ createdAt: -1 });

    response.successResponse({
        relationCount: userRelationData.length,
        relationData: userRelationData
    });

});

exports.filterBlog = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);
    let arr = new Array();

    if (req.body.userId) {
        userId = req.body.userId;
    } else {
        userId = null;
    }

    const filterObject = {};

    if (req.body.title) {
        filterObject['description'] = { $regex: req.body.title, "$options": "i" }
    }

    filterObject["deleted"] = 0;

    filterObject["status"] = 1;

    try {

        const blogDetails = await BlogParent.find(filterObject, {
            "description": 1,
            "createdAt": 1,
            "img": 1,
        }).populate({
            path: 'userId',
            select: ['name', 'email', 'mobile', 'employee_id', '_id']
        }).populate({
            path: 'relation',
            select: ['relation']
        }).populate({
            path: 'bookId',
            select: ['title', 'front_image']
        }).sort({ createdAt: -1 });

        if (blogDetails.length > 0) {

            for (const iterator of blogDetails) {
                const reply = await BlogComment.find({
                    status: 1,
                    deleted: 0,
                    blogId: iterator._id
                });

                const replyCheck = await BlogComment.find({
                    status: 1,
                    deleted: 0,
                    blogId: iterator._id,
                    userId: userId
                });

                if (replyCheck.length > 0) {
                    isComment = true;
                } else {
                    isComment = false;
                }

                const like = await BlogLike.find({
                    status: 1,
                    deleted: 0,
                    parentBlogId: iterator._id
                });

                const likeCheck = await BlogLike.find({
                    status: 1,
                    deleted: 0,
                    parentBlogId: iterator._id,
                    userId: userId
                });

                if (likeCheck.length > 0) {
                    isLike = true;
                } else {
                    isLike = false;
                }

                arr.push({
                    id: iterator._id,
                    empId: iterator.userId._id,
                    empName: iterator.userId.name,
                    empEmail: iterator.userId.email,
                    empMobile: iterator.userId.mobile,
                    empId: iterator.userId._id,
                    relationship: iterator.relation.relation,
                    commentCount: reply.length,
                    likeCount: like.length,
                    blogCreatedDate: iterator.createdAt,
                    blogDescription: iterator.description,
                    blogimg: iterator.img,
                    bookDetails: iterator.bookId,
                    isLiked: isLike,
                    isCommented: isComment
                });
            }
        }

        response.successResponse({
            message: `Total blog count= ${ arr.length }`,
            blogList: arr
        });

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.blogwiseComment = catchAsync(async(req, res, next) => {
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

    try {

        if (!req.body.blogId) {
            return next(new AppError("Blog details not found", 500))
        }

        const checkID = await BlogParent.findById(req.body.blogId, {
            deleted: 0
        });

        if (checkID) {

            const blogComment = await BlogComment.find({
                    status: 1,
                    deleted: 0,
                    blogId: req.body.blogId,
                }, {
                    'comment': 1,
                    'createdAt': 1,
                }).populate({
                    path: 'userId',
                    select: ['name', 'email', 'phone', 'employee_id']
                }).skip(pageSize * (currentPage - 1))
                .limit(pageSize);

            const count = await BlogComment.find({
                status: 1,
                deleted: 0,
                blogId: req.body.blogId,
            });


            response.createResponse({
                totalBlog: count.length,
                loadedBlog: blogComment.length,
                todayDate: new Date(),
                comments: blogComment
            });

        } else {
            return next(new AppError("Blog details not found.", 500));
        }

    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }

});

exports.blogwiseLike = catchAsync(async(req, res, next) => {
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

    try {

        if (!req.body.blogId) {
            return next(new AppError("Blog details not found", 500))
        }

        const checkID = await BlogParent.findById(req.body.blogId, {
            deleted: 0
        });

        if (checkID) {

            const blogLikes = await BlogLike.find({
                    status: 1,
                    deleted: 0,
                    parentBlogId: req.body.blogId
                }, {
                    'createdAt': 1,
                }).populate({
                    path: 'userId',
                    select: ['name', 'email', 'phone', 'employee_id']
                }).skip(pageSize * (currentPage - 1))
                .limit(pageSize);

            const count = await BlogLike.find({
                status: 1,
                deleted: 0,
                parentBlogId: req.body.blogId
            });

            response.createResponse({
                totalLike: count.length,
                loadedLike: blogLikes.length,
                todayDate: new Date(),
                comments: blogLikes,
            });

        } else {
            return next(new AppError("Blog details not found.", 500));
        }

    } catch (err) {
        return next(new AppError("Something went wrong.", 500));
    }

});

exports.empBlogList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let isComment;
    let isLike;

    // if (!req.body.userId) {
    //     return next(new AppError("User details not found", 500))
    // } else {
    //     const checkID = await User.findById(req.body.userId, {
    //         deleted: 0
    //     });

    //     if (checkID) {
    //         userId = req.body.userId;
    //     } else {
    //         return next(new AppError("User details not found.", 500));
    //     }
    // }
    if (req.body.userId) {
        userId = req.body.userId;
    } else {
        userId = null;
    }

    let arr = new Array();
    try {

        const blogDetails = await BlogParent.find({
            status: 1,
            deleted: 0,
        }, {
            "description": 1,
            "createdAt": 1,
            "img": 1,
        }).populate({
            path: 'userId',
            select: ['name', 'email', 'mobile', 'employee_id', '_id']
        }).populate({
            path: 'relation',
            select: ['relation']
        }).populate({
            path: 'bookId',
            select: ['title', 'front_image']
        }).sort({ createdAt: -1 });

        if (blogDetails.length > 0) {

            for (const iterator of blogDetails) {
                const reply = await BlogComment.find({
                    status: 1,
                    deleted: 0,
                    blogId: iterator._id
                });

                const replyCheck = await BlogComment.find({
                    status: 1,
                    deleted: 0,
                    blogId: iterator._id,
                    userId: userId
                });

                if (replyCheck.length > 0) {
                    isComment = true;
                } else {
                    isComment = false;
                }

                const like = await BlogLike.find({
                    status: 1,
                    deleted: 0,
                    parentBlogId: iterator._id
                });

                const likeCheck = await BlogLike.find({
                    status: 1,
                    deleted: 0,
                    parentBlogId: iterator._id,
                    userId: userId
                });

                if (likeCheck.length > 0) {
                    isLike = true;
                } else {
                    isLike = false;
                }

                arr.push({
                    id: iterator._id,
                    empId: iterator.userId._id,
                    empName: iterator.userId.name,
                    empEmail: iterator.userId.email,
                    empMobile: iterator.userId.mobile,
                    empId: iterator.userId._id,
                    relationship: iterator.relation.relation,
                    commentCount: reply.length,
                    likeCount: like.length,
                    blogCreatedDate: iterator.createdAt,
                    blogDescription: iterator.description,
                    blogimg: iterator.img,
                    bookDetails: iterator.bookId,
                    isLiked: isLike,
                    isCommented: isComment,
                });
            }
        }

        response.successResponse({
            message: `Total blog count= ${ arr.length }`,
            blogList: arr
        });

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.empBookWiseBlogList = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let isComment;
    let isLike;
    if (req.body.userId) {
        userId = req.body.userId;
    } else {
        userId = null;
    }

    let arr = new Array();
    try {

        const blogDetails = await BlogParent.find({
            status: 1,
            deleted: 0,
            bookId: req.body.bookId,
        }, {
            "description": 1,
            "createdAt": 1,
            "img": 1,
        }).populate({
            path: 'userId',
            select: ['name', 'email', 'mobile', 'employee_id', '_id']
        }).populate({
            path: 'relation',
            select: ['relation']
        }).populate({
            path: 'bookId',
            select: ['title', 'front_image']
        }).sort({ createdAt: -1 });

        if (blogDetails.length > 0) {

            for (const iterator of blogDetails) {
                const reply = await BlogComment.find({
                    status: 1,
                    deleted: 0,
                    blogId: iterator._id
                });

                const replyCheck = await BlogComment.find({
                    status: 1,
                    deleted: 0,
                    blogId: iterator._id,
                    userId: userId
                });

                if (replyCheck.length > 0) {
                    isComment = true;
                } else {
                    isComment = false;
                }

                const like = await BlogLike.find({
                    status: 1,
                    deleted: 0,
                    parentBlogId: iterator._id
                });

                const likeCheck = await BlogLike.find({
                    status: 1,
                    deleted: 0,
                    parentBlogId: iterator._id,
                    userId: userId
                });

                if (likeCheck.length > 0) {
                    isLike = true;
                } else {
                    isLike = false;
                }

                arr.push({
                    id: iterator._id,
                    empId: iterator.userId._id,
                    empName: iterator.userId.name,
                    empEmail: iterator.userId.email,
                    empMobile: iterator.userId.mobile,
                    empId: iterator.userId._id,
                    relationship: iterator.relation.relation,
                    commentCount: reply.length,
                    likeCount: like.length,
                    blogCreatedDate: iterator.createdAt,
                    blogDescription: iterator.description,
                    blogimg: iterator.img,
                    bookDetails: iterator.bookId,
                    isLiked: isLike,
                    isCommented: isComment,
                });
            }
        }

        response.successResponse({
            message: `Total blog count= ${ arr.length }`,
            blogList: arr
        });

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.blogFind = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let blogId;

    if (req.body.userId) {
        userId = req.body.userId;
    } else {
        userId = null;
    }

    if (!req.body.blogId) {
        return next(new AppError("Blog details not found", 500))
    } else {
        checkID = await BlogParent.findById(req.body.blogId, {
            deleted: 0
        });

        if (checkID) {
            blogId = req.body.blogId;
        } else {
            return next(new AppError("Blog details not found.", 500));
        }
    }

    try {

        const blogDetails = await BlogParent.findOne({
            deleted: 0,
            _id: blogId
        }, {
            "description": 1,
            "createdAt": 1,
            "bookRefNum": 1,
            "img": 1,
        }).populate({
            path: 'userId',
            select: ['name', 'email', 'mobile', 'employee_id', '_id']
        }).populate({
            path: 'relation',
            select: ['relation', 'status']
        }).populate({
            path: 'bookId',
            select: ['title', 'front_image']
        }).sort({ createdAt: -1 });

        response.successResponse({
            blogList: blogDetails
        });

    } catch (err) {
        return next(new AppError(err, 500));
    }
});

exports.blogStatusChange = catchAsync(async(req, res, next) => {

    const response = new AppSuccess(res);

    if (req.user._id) {
        userId = req.user._id;
    } else {
        userId = "";
    }

    if (!req.body.blogId) {
        return next(new AppError("Blog details not found", 500))
    }

    if (!req.body.status) {
        return next(new AppError("Blog status not found", 500))
    }

    try {

        const checkDetailsMasterDataId = await BlogParent.find({
            _id: req.body.blogId
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

        const statusChange = await BlogParent.findByIdAndUpdate(req.body.blogId, {
            status: statusValue,
            updated_by: userId
        });

        if (statusChange) {

            let userType;
            if (req.user.user_role == 1) {
                userType = "Admin"
            } else if (req.user.user_role == 2 || req.user.user_role == 4) {
                userType = "Librarian"
            }

            const clientIp = requestIp.getClientIp(req);

            await Activity.create({
                ipAddress: clientIp,
                pageDetail: "Blog Status Change",
                operationType: "Blog Status Change",
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

exports.blogViewDetails = catchAsync(async(req, res, next) => {
    const response = new AppSuccess(res);

    let userId;
    let isComment;
    let isLike;
    let arr = new Array();

    if (req.body.userId) {
        userId = req.body.userId;
    } else {
        userId = null;
    }

    try {

        if (!req.body.blogId) {
            return next(new AppError("Blog details not found", 500))
        } else {

            const blogDetails = await BlogParent.find({
                _id: req.body.blogId,
                deleted: 0,
            }, {
                "description": 1,
                "createdAt": 1,
                "img": 1,
            }).populate({
                path: 'userId',
                select: ['name', 'email', 'mobile', 'employee_id', '_id']
            }).populate({
                path: 'relation',
                select: ['relation']
            }).populate({
                path: 'bookId',
                select: ['title', 'front_image', 'bookType']
            });

            if (blogDetails.length > 0) {
                for (const iterator of blogDetails) {
                    const reply = await BlogComment.find({
                        status: 1,
                        deleted: 0,
                        blogId: iterator._id
                    });

                    const like = await BlogLike.find({
                        status: 1,
                        deleted: 0,
                        parentBlogId: iterator._id
                    });

                    arr.push({
                        id: iterator._id,
                        empId: iterator.userId._id,
                        empName: iterator.userId.name,
                        empEmail: iterator.userId.email,
                        empMobile: iterator.userId.mobile,
                        empId: iterator.userId._id,
                        relationship: iterator.relation.relation,
                        commentCount: reply.length,
                        likeCount: like.length,
                        blogCreatedDate: iterator.createdAt,
                        blogDescription: iterator.description,
                        blogimg: iterator.img,
                        bookDetails: iterator.bookId,
                        bookType: iterator.bookType,
                    });

                    response.successResponse({
                        blogList: arr[0]
                    });
                }
            } else {
                return next(new AppError("Blog details not found.", 500));
            }
        }

    } catch (err) {
        return next(new AppError(err, 500));
    }
});