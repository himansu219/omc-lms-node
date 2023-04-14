const express = require("express");
const authController = require("../controllers/user/mobapiauth");

const router = express.Router();

router.route("/checkEmailMobileApp").post(authController.checkEmailMobileApp);
router.route("/verifiedUser").post(authController.verifiedUser);
router.route("/unverifiedUser").post(authController.unverifiedUser);
router.route("/resendOTPMobileApp").post(authController.resendOTPMobileApp);
router.route("/forgotMpin").post(authController.forgotMpin);
router.route("/forgotMpinSubmit").post(authController.forgotMpinSubmit);
router.route("/resendOTPForgotMpin").post(authController.resendOTPForgotMpin);

module.exports = router;