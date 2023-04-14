const multer = require('multer');
const path = require('path');
const AppError = require('../utils/appError')

// Image Filter
const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('Not an image! Please upload an image.', 400), false);
    }
};

// Excel Filter
const excelFilter = (req, file, cb) => {

    if (file.mimetype.startsWith('xlsx')) {
        cb(null, true);
    } else {
        cb(new AppError('Not an excel! Please upload an excel.', 400), false);
    }
};


// Handle Author Profile Images
const authorProfileImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../', 'images', 'author/'));
    },
    filename: (req, file, cb) => {
        const ext = file.mimetype.split('/')[1];
        cb(null, `${Date.now()}.${ext}`);
    },
});

const authorProfile = multer({
    fileFilter: multerFilter,
    storage: authorProfileImageStorage,
});

// Handle Category Images

const ebookpdf = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../', 'images', 'e-book-pdf/'));
    },
    filename: (req, file, cb) => {
        const ext = file.mimetype.split('/')[1];
        cb(null, `${Date.now()}.${ext}`);
    },
});

const ebookpdfStore = multer({
    storage: ebookpdf,
});

// Handle Book Images

const BookImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../', 'images', 'book/'));
    },
    filename: (req, file, cb) => {
        const ext = file.mimetype.split('/')[1];
        cb(null, `${Math.floor(Math.random() * 10000)}${Date.now()}.${ext}`);
    },
});

const BookImage = multer({
    fileFilter: multerFilter,
    storage: BookImageStorage,
});

// Handle excel

const importExcel = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../', 'images', 'excel/'));
    },
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.')[1];
        cb(null, `${Math.floor(Math.random() * 10000)}${Date.now()}.${ext}`);
    },
});

const excelImport = multer({
    // fileFilter: excelFilter,
    storage: importExcel
});

// Handle Banner Images
const bannerImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../', 'images', 'blog/'));
    },
    filename: (req, file, cb) => {
        const ext = file.mimetype.split('/')[1];
        cb(null, `${Date.now()}.${ext}`);
    },
});

const bannerImage = multer({
    fileFilter: multerFilter,
    storage: bannerImageStorage,
});

// Handle E Book Images

const EBookImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../', 'images', 'e-book/'));
    },
    filename: (req, file, cb) => {
        const ext = file.mimetype.split('/')[1];
        cb(null, `${Math.floor(Math.random() * 10000)}${Date.now()}.${ext}`);
    },
});

const EBookImage = multer({
    // fileFilter: multerFilter,
    storage: EBookImageStorage,
});

exports.uploadBannerImage = bannerImage.single('img');

exports.uploadAuthorProfileImage = authorProfile.single('profile_photo');

exports.uploadebookpdfStore = ebookpdfStore.single('pdf');

exports.importExcelData = excelImport.single('import_file');

exports.uploadBookImage = BookImage.fields([
    { name: 'f_image', maxCount: 1 },
    { name: 'b_image', maxCount: 1 },
]);

exports.uploadEBookImage = EBookImage.fields([
    { name: 'f_image', maxCount: 1 },
    { name: 'b_image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 },
]);