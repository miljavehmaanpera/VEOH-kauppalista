const mongoose = require('mongoose');
const Schema = mongoose.Schema

const kauppalista_schema = new Schema({
    nimi: {
        type: String,
        required: true
    },
    tuotteet: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tuote',
        req: true
    }]
});
const kauppalista_model = new mongoose.model('kauppalista', kauppalista_schema);

module.exports = kauppalista_model;