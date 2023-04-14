const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

// // Local Database Connection

mongoose.connect('mongodb://127.0.0.1:27017/omc', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log("DB connected successfully - Local");
    })
    .catch((error) => {
        console.log(error);
    });

// Online Database Connection

// const username = "omc_db_admin";
// const password = "YVlb3sdW42NxE3o2";
// const cluster = "cluster0.o2zvsaz";
// const dbname = "omc";

// mongoose.connect(`mongodb+srv://${username}:${password}@${cluster}.mongodb.net/${dbname}?retryWrites=true&w=majority`, {
//         useNewUrlParser: true,
//         useUnifiedTopology: true
//     })
//     .then(() => {
//         console.log("DB connected successfully - Online");
//     })
//     .catch((error) => {
//         console.log(error);
//     });


module.exports = mongoose;