const mongoose = require('mongoose');
const Schema = mongoose.Schema

const kayttaja_schema = new Schema({
    nimi: {
        type: String,
        required: true
    },
    kauppalistat: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'kauppalista',
        req: true
    }]
});
const kayttaja_model = mongoose.model('user', kayttaja_schema);


module.exports = kayttaja_model;