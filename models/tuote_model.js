const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tuote_schema = new Schema({
    text: {
        type: String,
        required: true
    },
    maara:{
        type: String,
        required: true
    },
    kuva_url:{
        type: String,
        required: false
    }
});
const tuote_model = new mongoose.model('tuote', tuote_schema);

module.exports = tuote_model;