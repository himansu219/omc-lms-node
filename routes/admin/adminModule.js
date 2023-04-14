const express = require("express");

const ratingController = require("../../controllers/admin/ratingController");
const dashboardController = require("../../controllers/admin/dashboardController");
const filterController = require("../../controllers/admin/filterController");
const bookController = require("../../controllers/admin/bookController");
const dbController = require("../../controllers/dbController");
const { protect } = require("../../middlewares/authMiddleware");
const router = express.Router();
const { importExcelData } = require("../../middlewares/fileUploadMiddleware");
const { uploadBannerImage } = require("../../middlewares/fileUploadMiddleware");
const blogController = require("../../controllers/employee/blogController");
const reportController = require("../../controllers/admin/reportController");

//Dashboard and filter module

router.route("/dashboardCard").get(protect, dashboardController.cardDetails);
// Dashboard API
router.route("/dashboardStatisticsDetails").get(protect, dashboardController.statisticsDetails);
router.route("/dashboardlastIssuedBooksDetailsCard").get(protect, dashboardController.lastIssuedBooksDetails);
router.route("/dashboardOverDueBookDetails").get(protect, dashboardController.overDueBookDetails);
router.route("/dashboardPopularBookDetails").get(protect, dashboardController.popularBookDetails);
router.route("/dashboardRequestBookDetails").get(protect, dashboardController.requestBookDetails);


router.route("/filterBook").post(protect, filterController.filterBook);
router.route("/filterEBook").post(protect, filterController.filterEBook);
router.route("/filterJournal").post(protect, filterController.filterJournal);
router.route("/filterMagazine").post(protect, filterController.filterMagazine);
router.route("/filterEmployee").post(protect, filterController.filterEmployee);
router.route("/filterUser").post(protect, filterController.filterUser);
router.route("/filterQrCodeManagement").post(protect, filterController.filterQrCodeManagement);
router.route("/filterRackManagementListing").post(protect, filterController.filterRackManagementListing);
router.route("/requestFilter").post(protect, filterController.requestFilter);
router.route("/issueFilter").post(protect, filterController.issueFilter);
router.route("/returnFilter").post(protect, filterController.returnFilter);
router.route("/suggestedFilter").post(protect, filterController.suggestedFilter);
router.route("/suggestedHistoryFilter").post(protect, filterController.suggestedHistoryFilter);
router.route("/damageFilter").post(protect, filterController.damageFilter);
router.route("/requisitionFilter").post(protect, filterController.requisitionFilter);
router.route("/reviewFilter").post(protect, filterController.reviewFilter);
router.route("/findBookIssueDetailsFilter").post(protect, filterController.findBookIssueDetailsFilter);
router.route("/qrCodeFilter").post(protect, filterController.qrCodeFilter);
router.route("/blogAdminFilter").post(protect, filterController.blogAdminFilter);

//Suggested Book

router.route("/createSuggestedBook").post(protect, bookController.createSuggestedBook);
router.route("/suggestedBooksList").post(protect, bookController.suggestedBooksList);
router.route("/removeSuggestedBook").post(protect, bookController.removeSuggestedBook);
router.route("/suggestedBooksAddList").get(protect, bookController.suggestedBooksAddList);

//Review 

router.route("/changeRating").post(protect, ratingController.changeRating);
router.route("/reviewList").get(protect, ratingController.reviewList);
router.route("/reviewDetails/:id").get(protect, ratingController.reviewDetails);
router.route("/reviewHistoryList/:id").get(protect, ratingController.reviewHistoryList);

//Blog

router.route("/blogList").get(protect, blogController.blogList);
router.route("/blogStatusChange").post(protect, blogController.blogStatusChange);
router.route("/blogDetails/:id").get(protect, blogController.blogDetails);
router.route("/blogViewDetails").post(protect, blogController.blogViewDetails);
// router.route("/blogCommentReply/:id").get(protect, blogController.blogCommentReply);
// router.route("/likeList/:type/:id").get(protect, blogController.likeList);

//Custom route for collection update
router.route("/insert-item-settings").get(dbController.createInsertCollection);

// Drop Collection

router.route("/dropCollection").get(protect, dbController.dropCollection);
router.route("/import").post(protect, importExcelData, dbController.store);
router.route("/export-department").get(protect, dbController.exportDepartment);
router.route("/export-designation").get(protect, dbController.exportDesignation);

router.route("/bookAvailability").post(protect, bookController.bookAvailability);
router.route("/getRequisitionStatus").get(protect, bookController.getRequisitionStatus);

router.route("/requestReport").post(protect, reportController.requestReport);
router.route("/exportRequestReport").post(protect, reportController.exportRequestReport);

router.route("/issueReport").post(protect, reportController.issueReport);
router.route("/issueReportExport").post(protect, reportController.issueReportExport);

router.route("/returnReport").post(protect, reportController.returnReport);
router.route("/returnReportExport").post(protect, reportController.returnReportExport);

router.route("/bookReport").post(protect, reportController.bookReport);
router.route("/exportBookReport").post(protect, reportController.exportBookReport);

router.route("/ratingStatusChange").post(protect, ratingController.ratingStatusChange);

router.route("/bookRecoverList").post(protect, bookController.bookRecoverList);

module.exports = router;