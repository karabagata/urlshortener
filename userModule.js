const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const UserSchema = new Schema({
    username : {
        type : String,
        required : true,
    },
    password : {
        type : String,
        required : true,
    },
})

const UserModule = mongoose.model('UserModule', UserSchema );
module.exports = UserModule;