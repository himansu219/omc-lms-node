const express = require("express");

const authorController = require("../../controllers/admin/authorController");
const publisherController = require("../../controllers/admin/publisherController");
const genreController = require("../../controllers/admin/genreController");
const bookController = require("../../controllers/admin/bookController");
const eBookController = require("../../controllers/admin/ebookController");
const settingController = require("../../controllers/admin/settingController");
const libraryController = require("../../controllers/admin/libraryController");
const rackController = require("../../controllers/admin/rackController");
const shelfController = require("../../controllers/admin/shelfController");
const departmentController = require("../../controllers/admin/departmentController");
const designationController = require("../../controllers/admin/designationController");
const relatedInfoController = require("../../controllers/admin/relatedInfoController");

const { protect } = require("../../middlewares/authMiddleware");
const { uploadAuthorProfileImage } = require("../../middlewares/fileUploadMiddleware");
const { uploadBookImage } = require("../../middlewares/fileUploadMiddleware");
const { uploadEBookImage } = require("../../middlewares/fileUploadMiddleware");
const { uploadebookpdfStore } = require("../../middlewares/fileUploadMiddleware");

const router = express.Router();

// Author master module

router.route("/storeAuthor").post(protect, uploadAuthorProfileImage, authorController.store);
router.route("/authorList").post(protect, authorController.authorList);
router.route("/authorFilterList").post(protect, authorController.authorFilterList);
router.route("/authorLists").get(protect, authorController.authorLists);
router.route("/authorListByStatus").get(protect, authorController.authorListByStatus);
router.route("/authorDestroy").post(protect, authorController.authorDestroy);
router.route("/authorStatusChange").post(protect, authorController.authorStatusChange);
router.route("/authorUpdate").post(protect, uploadAuthorProfileImage, authorController.authorUpdate);
router.route("/findAuthor/:id").get(protect, authorController.findAuthor);

// Publisher master module

router.route("/storePublisher").post(protect, publisherController.store);
router.route("/publisherList").post(protect, publisherController.publisherList);
router.route("/filterPublisherList").post(protect, publisherController.filterPublisherList);
router.route("/publisherLists").get(protect, publisherController.publisherLists);
router.route("/publisherListByStatus").get(protect, publisherController.publisherListByStatus);
router.route("/publisherDestroy").post(protect, publisherController.publisherDestroy);
router.route("/publisherStatusChange").post(protect, publisherController.publisherStatusChange);
router.route("/publisherUpdate").post(protect, publisherController.publisherUpdate);
router.route("/findPublisher/:id").get(protect, publisherController.findPublisher);

//Genre master module

router.route("/storeGenre").post(protect, genreController.store);
router.route("/genreList").get(protect, genreController.genreList);
router.route("/genreListByStatus").get(protect, genreController.genreListByStatus);
router.route("/genreDestroy").post(protect, genreController.genreDestroy);
router.route("/genreUpdate").post(protect, genreController.genreUpdate);
router.route("/findGenre/:id").get(protect, genreController.findGenre);
router.route("/genreStatusChange").post(protect, genreController.genreStatusChange);
router.route("/filterGenreList").post(protect, genreController.filterGenreList);

//Book module

router.route("/storeBook").post(protect, uploadBookImage, bookController.store);
router.route("/bookList").get(protect, bookController.bookList);
router.route("/bookListByStatus").post(protect, bookController.bookListByStatus);
router.route("/bookListFilter").get(protect, bookController.bookListFilter);
router.route("/employeeFilterRequest").get(protect, bookController.employeeFilterRequest);
router.route("/bookUpdate").post(protect, uploadBookImage, bookController.bookUpdate);
router.route("/storeBookStock").post(protect, bookController.storeBookStock);
router.route("/findBook/:id").get(protect, bookController.findBook);
router.route("/findBookIssueDetails").post(protect, bookController.findBookIssueDetails);
router.route("/bookDestroy").post(protect, bookController.bookDestroy);
router.route("/bulkbookDestroy").post(protect, bookController.bulkbookDestroy);
router.route("/bookStatusChange").post(protect, bookController.bookStatusChange);
router.route("/destroyBookStock").post(protect, bookController.destroyBookStock);

//Bulk Book
router.route("/storeBulkBook").post(protect, uploadBookImage, bookController.storeBulkBook);
router.route("/bulkBookList").post(protect, bookController.bulkBookList);
router.route("/bulkBookSubmit").post(protect, bookController.bulkBookSubmit);
router.route("/multiItemStatusChange").post(protect, bookController.multiItemStatusChange);

//Setting master module

router.route("/storeSetting").post(protect, settingController.store);
router.route("/getSetting").get(protect, settingController.getSetting);

//Library master module

router.route("/storeLibrary").post(protect, libraryController.store);
router.route("/libraryList").get(protect, libraryController.libraryList);

//Rack master module

router.route("/storeRack").post(protect, rackController.store);
router.route("/rackList").post(protect, rackController.rackList);
router.route("/filterRackList").post(protect, rackController.filterRackList);
router.route("/rackListByStatus").get(protect, rackController.rackListByStatus);
router.route("/findRack/:id").get(protect, rackController.findRack);
router.route("/rackUpdate").post(protect, rackController.rackUpdate);
router.route("/rackDestroy").post(protect, rackController.rackDestroy);
router.route("/rackStatusChange").post(protect, rackController.rackStatusChange);

//Shelf master module

router.route("/storeShelf").post(protect, shelfController.store);
router.route("/shelfList").get(protect, shelfController.shelfList);
router.route("/shelfListByStatus").get(protect, shelfController.shelfListByStatus);
router.route("/findShelf/:id").get(protect, shelfController.findShelf);
router.route("/shelfDestroy").post(protect, shelfController.shelfDestroy);
router.route("/shelfUpdate").post(protect, shelfController.shelfUpdate);
router.route("/rackShelfList/:id").get(protect, shelfController.rackShelfList);
router.route("/shelfStatusChange").post(protect, shelfController.shelfStatusChange);
router.route("/filterShelfList").post(protect, shelfController.filterShelfList);

//Department master module

router.route("/storeDepartment").post(protect, departmentController.store);
router.route("/departmentList").get(protect, departmentController.departmentList);
router.route("/departmentListByStatus").get(protect, departmentController.departmentListByStatus);
router.route("/findDepartment/:id").get(protect, departmentController.findDepartment);
router.route("/departmentUpdate").post(protect, departmentController.departmentUpdate);
router.route("/departmentDestroy").post(protect, departmentController.departmentDestroy);
router.route("/departmentStatusChange").post(protect, departmentController.departmentStatusChange);
router.route("/filterDepartmentList").post(protect, departmentController.filterDepartmentList);

//Designation master module

router.route("/storeDesignation").post(protect, designationController.store);
router.route("/designationDeptList/:id").get(protect, designationController.designationDeptList);
router.route("/designationList").get(protect, designationController.designationList);
router.route("/designationListByStatus").get(protect, designationController.designationListByStatus);
router.route("/designationDestroy").post(protect, designationController.designationDestroy);
router.route("/findDesignation/:id").get(protect, designationController.findDesignation);
router.route("/designationUpdate").post(protect, designationController.designationUpdate);
router.route("/designationStatusChange").post(protect, designationController.designationStatusChange);
router.route("/filterDesignationList").post(protect, designationController.filterDesignationList);
router.route("/issueBook").post(protect, bookController.issueBook);

//E-Book module

router.route("/store-e-Book").post(protect, uploadEBookImage, eBookController.store);
router.route("/e-bookList").get(protect, eBookController.bookList);
router.route("/e-bookListByStatus").get(protect, eBookController.bookListByStatus);
router.route("/e-bookUpdate").post(protect, uploadEBookImage, eBookController.bookUpdate);

router.route("/e-findBook/:id").get(protect, eBookController.findBook);
router.route("/e-bookDestroy").post(protect, eBookController.bookDestroy);
router.route("/e-bookStatusChange").post(protect, eBookController.bookStatusChange);

//Journal

router.route("/journalList").get(protect, bookController.journalList);

// Magazine

router.route("/magazineList").get(protect, bookController.magazineList);


// Status

router.route("/authorBookList").post(protect, bookController.authorBookList);
router.route("/publisherBookList").post(protect, bookController.publisherBookList);
router.route("/genreBookList").post(protect, bookController.genreBookList);
router.route("/shelfRackEditList").post(protect, bookController.shelfRackEditList);
router.route("/designationEditList").post(protect, bookController.designationEditList);

router.route("/authoreBookList").post(protect, eBookController.authorBookList);
router.route("/publishereBookList").post(protect, eBookController.publisherBookList);
router.route("/genreeBookList").post(protect, eBookController.genreBookList);

router.route("/languageList").get(protect, bookController.languageList);

// Related Info

router.route("/storeInfo").post(protect, relatedInfoController.storeInfo);
router.route("/infoUpdate").post(protect, relatedInfoController.infoUpdate);
router.route("/infoStatusChange").post(protect, relatedInfoController.infoStatusChange);
router.route("/infoDestroy").post(protect, relatedInfoController.infoDestroy);
router.route("/infoList").post(protect, relatedInfoController.infoList);
router.route("/bookRelatedInfo").post(protect, relatedInfoController.bookRelatedInfo);
router.route("/findRelatedInfo").post(protect, relatedInfoController.findbookRelatedInfo);

module.exports = router;