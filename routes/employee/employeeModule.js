const express = require("express");

const ratingController = require("../../controllers/employee/ratingController");
const bookController = require("../../controllers/employee/bookController");
const blogController = require("../../controllers/employee/blogController");
const mobileAppController = require("../../controllers/employee/mobileAppController");
const filterController = require("../../controllers/admin/filterController");
const eBookController = require("../../controllers/admin/ebookController");
const { protect } = require("../../middlewares/authMiddleware");
const router = express.Router();

const { uploadBannerImage } = require("../../middlewares/fileUploadMiddleware");

//Rating module

router.route("/ratingStore").post(protect, ratingController.ratingStore);
router.route("/ratingDestroy").post(protect, ratingController.ratingDestroy);
router.route("/ratingReSubmitted").post(protect, ratingController.ratingReSubmitted);
router.route("/ratingReSubmittedEdit").post(protect, ratingController.ratingReSubmittedEdit);
router.route("/ratingStatus").post(protect, ratingController.ratingStatus);

//Book module

router.route("/returnBook").post(protect, bookController.returnBook);
router.route("/requestBook").post(protect, bookController.requestBook);
router.route("/bookRequestListing").post(protect, bookController.bookRequestListing);
router.route("/bookRequestFilter").post(protect, bookController.bookRequestFilter);
router.route("/bookReturnListing").post(protect, bookController.bookReturnListing);

// Employee Will Get All Transactional Book List 

router.route("/myRecords").post(protect, bookController.myRecords);
router.route("/myRecordsDetails").post(protect, bookController.myRecordsDetails);
router.route("/filterMyRecords").post(protect, filterController.filterMyRecords);

//Page Module

router.route("/recentlyAddedBooks").post(protect, bookController.recentlyAddedBooks);
router.route("/searchBookByName").post(protect, bookController.searchBookByName);
router.route("/filterBook").post(protect, bookController.filterBook);
router.route("/filterBookTopRated").post(protect, bookController.filterBookTopRated);
router.route("/filterRecommendedBook").post(protect, bookController.filterRecommendedBook);
router.route("/filterBookRecentlyAdded").post(protect, bookController.filterBookRecentlyAdded);
router.route("/filterMagazine").post(protect, bookController.filterMagazine);
router.route("/filterJournal").post(protect, bookController.filterJournal);

//Blog

router.route("/blogItemsList").post(protect, blogController.blogItemsList);
router.route("/blogItemsReferenceNo").post(protect, blogController.blogreferenceNoList);
router.route("/addBlog").post(protect, uploadBannerImage, blogController.addBlog);
router.route("/editBlog").post(protect, uploadBannerImage, blogController.editBlog);
router.route("/addComments").post(protect, blogController.addComments);
router.route("/editComment").post(protect, blogController.editComment);
router.route("/likes").post(protect, blogController.likes);
router.route("/deleteBlog").post(protect, blogController.deleteBlog);
router.route("/deleteComment").post(protect, blogController.deleteComment);
router.route("/empBlogList").post(protect, blogController.empBlogList);
router.route("/empBookWiseBlogList").post(protect, blogController.empBookWiseBlogList);
router.route("/filterBlog").post(protect, blogController.filterBlog);
router.route("/relationshipList").get(protect, blogController.relationshipList);
router.route("/blogwiseComment").post(protect, blogController.blogwiseComment);
router.route("/blogwiseLike").post(protect, blogController.blogwiseLike);
router.route("/blogFind").post(protect, blogController.blogFind);

//Requisition Module

router.route("/addBookRequisition").post(protect, bookController.addBookRequisition);
router.route("/bookRequisitionempList").post(protect, bookController.bookRequisitionempList);
router.route("/bookRequisitionempFind").post(protect, bookController.bookRequisitionempFind);
router.route("/updateBookRequisition").post(protect, bookController.updateBookRequisition);
router.route("/bookRequisitionempDestroy").post(protect, bookController.destroyBookRequisition);
router.route("/bookRequisitionList").get(protect, bookController.bookRequisitionList);

// Sorting

router.route("/recently-added-books").post(protect, bookController.recentlyAddedBook);
router.route("/featured-book-list").post(protect, bookController.featuredBookList);
router.route("/top-rated-book-listing").post(protect, bookController.topRatedBooksList);
router.route("/filterBookNameTopRated").post(protect, bookController.filterBookNameTopRated);
router.route("/filterBookNameRecentlyAdded").post(protect, bookController.filterBookNameRecentlyAdded);
router.route("/filterMagazineName").post(protect, bookController.filterMagazineName);
router.route("/filterJournalName").post(protect, bookController.filterJournalName);
router.route("/filterBookNameRecommendedBook").post(protect, bookController.filterBookNameRecommendedBook);
router.route("/filterGenreName").post(protect, bookController.filterGenreName);
router.route("/browse-category").get(protect, bookController.browseCategory);
router.route("/featured-book").post(protect, bookController.featuredBook);
router.route("/top-rated-book").post(protect, bookController.topRatedBook);
router.route("/recomended-book").get(protect, bookController.recomendedBook);
router.route("/browse-category-details").post(protect, bookController.browseCategoryDetails);
router.route("/recently-added-books-sorting").get(protect, bookController.sortRecentlyAddedBook);
router.route("/recently-added-magazine").post(protect, bookController.empMagazine);
router.route("/recently-added-journal").post(protect, bookController.empJournal);

router.route("/find-book-details").post(protect, bookController.bookDetails);
router.route("/find-e-book-details").post(protect, bookController.eBookDetails);
router.route("/recommended-book-list").post(protect, bookController.recommendedBookList);
router.route("/storeEbookView").post(protect, eBookController.storeEbookView);

router.route("/e-book-listing").post(protect, bookController.eBook);
router.route("/e-book-title-search").post(protect, bookController.eBookTitleSearch);
router.route("/e-book-filter").post(protect, bookController.eBookFilter);

router.route("/filterGenre").post(protect, filterController.filterGenre);
router.route("/filterAuthor").post(protect, filterController.filterAuthor);
router.route("/filterPublisher").post(protect, filterController.filterPublisher);
router.route("/filterBookName").post(protect, bookController.filterBookName);

router.route("/category-wise-books").post(protect, bookController.categoryWiseBook);
router.route("/categoryWiseBookFilterName").post(protect, bookController.categoryWiseBookFilterName);
router.route("/categoryWiseBookFilter").post(protect, bookController.categoryWiseBookFilter);

// Count //

router.route("/filterBookRecentlyAddedCount").post(protect, bookController.filterBookRecentlyAddedCount);
router.route("/filterRecommendedBookCount").post(protect, bookController.filterRecommendedBookCount);
router.route("/filterBookCount").post(protect, bookController.filterBookCount);
router.route("/filterBookTopRatedCount").post(protect, bookController.filterBookTopRatedCount);
router.route("/categoryWiseBookFilterCount").post(protect, bookController.categoryWiseBookFilterCount);

router.route("/filterMagazineCount").post(protect, bookController.filterMagazineCount);
router.route("/filterJournalCount").post(protect, bookController.filterJournalCount);
router.route("/e-book-filter-count").post(protect, bookController.eBookFilterCount);

// ForMobileApp

router.route("/mobileApp/bookRecentlyAdded").post(protect, mobileAppController.filterBookNameRecentlyAdded);

module.exports = router;