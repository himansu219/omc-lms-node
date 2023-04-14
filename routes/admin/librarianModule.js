const express = require("express");

const bookController = require("../../controllers/admin/bookController");

const { protect } = require("../../middlewares/authMiddleware");

const router = express.Router();

//Book module

router.route("/issueBook").post(protect, bookController.issueBook);
router.route("/bookIssueListing").post(protect, bookController.bookIssueListing);
router.route("/bookIssueHistoryListing").get(protect, bookController.bookIssueHistoryListing);
router.route("/bookIssueDetails/:id/:parameter").get(protect, bookController.bookIssueDetails);
router.route("/bookReturnDetails/:id").get(protect, bookController.bookIssueDetails);
router.route("/bookQrCodeIssueDetails/:id").get(protect, bookController.bookQrCodeIssueDetails);
router.route("/addQrCodeQuantity").post(protect, bookController.addQrCodeQuantity);
router.route("/qrCodeList").post(protect, bookController.qrCodeList);
router.route("/getQuantityAdd").get(protect, bookController.getQuantityAdd);

router.route("/addRackManagement").post(protect, bookController.addRackManagement);
router.route("/findRack/:id").get(protect, bookController.findRack);
router.route("/updateRackManagement").post(protect, bookController.updateRackManagement);
router.route("/bookDamaged").post(protect, bookController.bookDamaged);
router.route("/bookRequestListing").post(protect, bookController.bookRequestListing);
router.route("/bookDamageListing").get(protect, bookController.bookDamageListing);
router.route("/bookRequestDetails/:id").get(protect, bookController.bookRequestDetails);
router.route("/bookReturnListing").post(protect, bookController.bookReturnListing);
router.route("/rackManagementListing").get(protect, bookController.rackManagementListing);
router.route("/bookStockList/:id").get(protect, bookController.bookStockList);
router.route("/bookStockDamage").get(protect, bookController.bookStockDamage);
router.route("/bookIssueLocationDetails").post(protect, bookController.bookIssueLocationDetails);
router.route("/empDetails").post(protect, bookController.empDetails);
router.route("/getQrCode").post(protect, bookController.getQrCode);
router.route("/getQrCodeForIssue").post(protect, bookController.getQrCodeForIssue);
router.route("/getQrCodeForReturn").post(protect, bookController.getQrCodeForReturn);
router.route("/getBookRefNo").post(protect, bookController.getBookRefNo);
router.route("/getBookRefNoForIssue").post(protect, bookController.getBookRefNoForIssue);
router.route("/getBookRefNoForReturn").post(protect, bookController.getBookRefNoForReturn);

router.route("/notifyRequisition").post(protect, bookController.notifyRequisition);
router.route("/notifyRequest").post(protect, bookController.notifyRequest);
router.route("/notificationRequest").post(protect, bookController.notificationRequest);
router.route("/notifyOverDue").post(protect, bookController.notifyOverDue);

router.route("/getBookJourMagType").get(protect, bookController.getBookJourMagType);
router.route("/getAllItemStatus").get(protect, bookController.getAllItemStatus);
router.route("/getLostStatus").get(protect, bookController.getLostStatus);
router.route("/lostBookSubmit").post(protect, bookController.lostBookSubmit);

router.route("/bookRecover").post(protect, bookController.bookRecover);
router.route("/recoverBookSubmit").post(protect, bookController.recoverBookSubmit);
router.route("/getItemStatus").get(protect, bookController.getItemStatus);

module.exports = router;