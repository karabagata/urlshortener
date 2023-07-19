const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const UrlSchema = new Schema({
    long: {
        type: String,
        required: true
    },
    short: {
        type: String,
        required: true
    },
    clicks:{
        type : Number,
        default : 0
    },
    owner:{
        type: String,
        required : true
    }
})

const UrlModule = mongoose.model('UrlModule', UrlSchema );
module.exports = UrlModule;