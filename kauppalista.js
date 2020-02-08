const express = require('express');
const PORT = process.env.PORT || 8080;
const body_parser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//schemat ja modelit
const kayttaja_schema = new Schema({
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

const kayttaja_model = mongoose.model('kayttaja', kayttaja_schema);


const tuote_schema = new Schema({
    nimi:{
        type: String,
        required: true
    },
    maara:{
        type: Number,
        required: true
    },
    kuva_url:{
        type: String,
        required: false
    }
});

const tuote_model = mongoose.model('tuote', tuote_schema);

// yleiset alkulöpinät
let app = express();

app.use(body_parser.urlencoded({
    extended: true
}));

app.use(session({
    secret: '1234qwerty',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000000
    }
}));


//alkaa
//let users = [];
//tämä ok:
app.use((req, res, next) => {
    console.log(`path: ${req.path}`);
    next();
});

//tämä ok:
const onkoKirjautunut = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};
//tämä ok:
app.use((req,res,next)=>{
    if(!req.session.user){
        return next();
    }
    kayttaja_model.findById(req.session.user._id).then((kayttaja)=>{
        req.kayttaja = kayttaja;
        next();
    }).catch((virhe)=>{
        console.log(virhe);
        res.redirect('/login');
    });
});

//tämä ok:
app.get('/', onkoKirjautunut, (req, res, next) => {
    const kayttaja = req.kayttaja;
    user.populate('tuotteet').execPopulate().then(()=>{
        console.log('käyttäjä: ', kayttaja);
        res.write(`
        <html>
        <body>
        Olet kirjautunut sisään käyttäjänimellä: ${kayttaja.nimi}
        <form action="/logout" method="POST">
            <button type="submit">Kirjaudu ulos</button>
        </form>`);
        kayttaja.tuotteet.forEach((tuote)=>{
            res.write(tuote.nimi);
            res.write(tuote.kuva_url);
            res.write(tuote.maara);
            res.write(`
            <form action="poista-tuote" method="POST">
                <input type="hidden" name="tuote_id" value="${tuote._id}">
                <button type="submit"> Poista tuote </button>
            </form>`);
        });

        res.write(`
        <form action="/lisaa-tuote" method="POST">
            <input type = "text" name="tuote">
            <button type="submit"> Lisää tuote </button>
        </form>
        </html>
        </body>
        `);
    
        res.end();
    });
});

//tämä ok;
app.post('/logout', (req, res, next) => {
    req.session.destroy();
    res.redirect('/login');
});

//tämä ok:
app.get('/login', (req, res, next) => {
    console.log('käyttäjä: ', req.session.user)
    res.write(`
    <html>
    <body>
    <head><meta charset='utf-8'></head>
        <form action="/login" method="POST">
            <input type="text" name="kayttaja_nimi">
            <button type="submit">Kirjaudu sisään</button>
        </form>
        <form action="/register" method="POST">
            <input type="text" name="kayttaja_nimi">
            <button type="submit">Luo uusi käyttäjänimi</button>
        </form>
    </body>
    <html>
    `);
    res.end();
});

//tämä ok:
app.post('/login', (req, res, next) => {
    const kayttaja_nimi = req.body.kayttaja_nimi;
    kayttaja_model.findOne({
        nimi: kayttaja_nimi
    }).then((kayttaja)=>{
        if(kayttaja){
            req.session.user = kayttaja;
            return res.redirect("/");
        }
        res.redirect("/login");
    });
});

//tämä ok:
app.post('/register', (req, res, next) => {
    const user_name = req.body.kayttaja_nimi;
    kayttaja_model.findOne({
        nimi: user_name
    }).then((kayttaja)=>{
        if(kayttaja){
            console.log('Käyttäjänimi on jo varattu.');
            return res.redirect("/login");
        }

        let uusi_kayttaja = new kayttaja_model({
            nimi: user_name,
            tuotteet: []
        });

        uusi_kayttaja.save().then(()=>{
            return res.redirect("/login");
        });
    });
});

//tämä ok:
app.use((req, res, next) => {
    res.status(404);
    res.send(`
        Sivua ei löydy
    `);
});


// yhdistäminen tietokantaan ja serveriin, tietokannan salasana cCPVADNE2Gb5prde
const mongoose_url = 'mongodb+srv://kauppalistauser:cCPVADNE2Gb5prde@cluster0-gmpod.mongodb.net/test?retryWrites=true&w=majority';

mongoose.connect(mongoose_url,{
    useUnifiedTopology: true,
    useNewUrlParser: true
}).then(()=>{
    console.log('yhdistetty mongooseen');
    console.log('käynnistä express-serveri');
    app.listen(PORT);
})


