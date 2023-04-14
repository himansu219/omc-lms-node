const express = require("express");
const authController = require("../controllers/user/auth");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/register").post(protect, authController.register);
router.route("/createNonEmpLibrarian").post(protect, authController.createNonEmpLibrarian);
router.route("/updateEmployee").post(protect, authController.updateEmployee);
router.route("/getUserRole").get(protect, authController.getUserRole);
router.route("/employee-list").get(protect, authController.employeeList);
router.route("/employee-list-librarian").post(protect, authController.employeeListLibrarian);
router.route("/employee-list-librarians").get(protect, authController.employeeListLibrarians);
router.route("/user-list").post(protect, authController.userList);
router.route("/employee-find/:id").get(protect, authController.employeeFind);
router.route("/userFind").post(protect, authController.userFind);
router.route("/unblock-account/:id").get(authController.unblockAccount);
router.route("/verify-otp/:userId").post(authController.verifyOtp);
router.route("/login").post(authController.login);
router.route("/notification").get(protect, authController.notification);
router.route("/empNotification").post(protect, authController.empNotification);
router.route("/empNotificationList").post(protect, authController.empNotificationList);
router.route("/adminNotificationList").get(protect, authController.adminNotificationList);
router.route("/profile-details").post(protect, authController.profileDetails);
router.route("/change-password").post(protect, authController.changePassword);
router.route("/checkEmail").post(authController.checkEmail);
router.route("/resetPassword").post(authController.resetPassword);
router.route("/resendOTP").post(authController.resendOTP);
router.route("/activity").post(protect, authController.activity);
router.route("/notificationRead").post(protect, authController.notificationRead);
router.route("/userStatusChange").post(protect, authController.userStatusChange);
router.route("/chooseLibrarian").post(protect, authController.chooseLibrarian);

// Mobile App

router.route("/checkEmailMobileApp").post(authController.checkEmailMobileApp);
router.route("/verifiedUser").post(authController.verifiedUser);
router.route("/unverifiedUser").post(authController.unverifiedUser);
router.route("/resendOTPMobileApp").post(authController.resendOTPMobileApp);
router.route("/forgotMpin").post(authController.forgotMpin);
router.route("/forgotMpinSubmit").post(authController.forgotMpinSubmit);
router.route("/resendOTPForgotMpin").post(authController.resendOTPForgotMpin);

module.exports = router;