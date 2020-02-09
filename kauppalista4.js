const express = require('express');
const PORT = process.env.PORT || 8080;
const body_parser = require('body-parser');
const session = require('express-session');
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
const kayttaja_model = mongoose.model('user', kayttaja_schema);

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

let users = [];

app.use((req, res, next) => {
    console.log(`path: ${req.path}`);
    next();
});

const is_logged_handler = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    kayttaja_model.findById(req.session.user._id).then((user) => {
        req.user = user;
        next();
    }).catch((err) => {
        console.log(err);
        res.redirect('login');
    });
});

app.get('/', is_logged_handler, (req, res, next) => {
    const user = req.user;
    user.populate('tuotteet')
        .execPopulate()
        .then(() => {
            //console.log('käyttäjä:', user);
            res.write(`
        <html>
        <head><meta charset='utf-8'></head>
        <body>
            Kirjautunut sisään käyttäjänimellä: ${user.nimi}
            <form action="/logout" method="POST">
                <button type="submit">Kirjaudu ulos</button>
            </form>`);
            user.tuotteet.forEach((tuote) => {
                res.write(`
                <table>
                <tr>
                    <td rowspan="2">
                        <img src="${tuote.kuva_url}" height="100" width="100">
                    </td>
                    <td>
                        ${tuote.text}
                    </td>
                    <td width=100>
                    </td>
                    <td>
                        <form action="poista-tuote" method="POST">
                            <input type="hidden" name="tuote_id" value="${tuote._id}">
                            <button type="submit">Poista tuote</button>
                        </form>
                    </td>
                </tr>
                <tr>
                    <td>
                      
                    </td>
                    <td width=100>
                    </td>
                    <td>
                        <form action="muokkaa-tuote" method="POST">
                            <input type="hidden" name="tuote_id" value="${tuote._id}">
                            määrä: <input type="text" name="paivitetty_maara" value="${tuote.maara}" size="1">
                            <button type="submit">Päivitä määrä</button>
                        </form>
                    </td>
                </tr>
                </table>
                <p>
                `);
            });

            res.write(`
            <form action="/lisaa-tuote" method="POST">
                <input type="text" placeholder="tuote" name="tuote_text">
                <input type="text" placeholder="kuvan osoite" name="tuote_url">
                <input type="text" placeholder="määrä" name="tuote_maara">
                <button type="submit">Lisää tuote</button>
            </form>
            
    
        </html>
        </body>
        `);
            res.end();
        });
});

//tätä olen muokkaamassa
//
//
app.post('/muokkaa-tuote', (req, res, next) => {
    const user = req.user;
    const tuote_id_to_edit = req.body.tuote_id;
    const uusi_maara = req.body.paivitetty_maara;
    
    

    user.tuotteet.forEach(tuote => {
        console.log(tuote._id);
        if(tuote._id == tuote_id_to_edit){
            tuote.maara = uusi_maara;
        }
    });

    mongoose.set('useFindAndModify', false);
    user.save().then(()=>{
        tuote_model.findOneAndUpdate({_id: tuote_id_to_edit}, {$set: {maara: uusi_maara}}, {upsert: true}, function(err,doc) {
            if (err) { throw err; }
            else { console.log("Updated"); }
          }); 
          res.redirect("/");
    });

});

app.post('/poista-tuote', (req, res, next) => {
    const user = req.user;
    const tuote_id_to_delete = req.body.tuote_id;

    //Remove tuote from user.tuotteet
    const updated_tuotteet = user.tuotteet.filter((tuote_id) => {
        return tuote_id != tuote_id_to_delete;
    });
    user.tuotteet = updated_tuotteet;

    //Remove tuote object from database
    user.save().then(() => {
        tuote_model.findByIdAndRemove(tuote_id_to_delete).then(() => {
            res.redirect('/');
        });
    });
});

app.get('/tuote/:id', (req, res, next) => {
    const tuote_id = req.params.id;
    tuote_model.findOne({
        _id: tuote_id
    }).then((tuote) => {
        res.send(tuote.text);
        res.send(tuote.kuva_url);
        res.send(tuote.maara);
    });
});

app.post('/lisaa-tuote', (req, res, next) => {
    const user = req.user;

    let new_tuote = tuote_model({
        text: req.body.tuote_text,
        kuva_url: req.body.tuote_url,
        maara: req.body.tuote_maara
    });
    new_tuote.save().then(() => {
        console.log('tuote tallennettu');
        user.tuotteet.push(new_tuote);
        user.save().then(() => {
            return res.redirect('/');
        });
    });
});

app.post('/logout', (req, res, next) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/login', (req, res, next) => {
    //console.log('user: ', req.session.user)
    res.write(`
    <html>
    <head><meta charset='utf-8'></head>
    <body>
        <form action="/login" method="POST">
            <input type="text" name="kayttajanimi">
            <button type="submit">Kirjaudu sisään</button>
        </form>
        <form action="/register" method="POST">
            <input type="text" name="kayttajanimi">
            <button type="submit">Luo uusi käyttäjä</button>
        </form>
    </body>
    <html>
    `);
    res.end();
});

app.post('/login', (req, res, next) => {
    const kayttajanimi = req.body.kayttajanimi;
    kayttaja_model.findOne({
        nimi: kayttajanimi
    }).then((user) => {
        if (user) {
            req.session.user = user;
            return res.redirect('/');
        }

        res.redirect('/login');
    });
});

app.post('/register', (req, res, next) => {
    const kayttajanimi = req.body.kayttajanimi;

    kayttaja_model.findOne({
        nimi: kayttajanimi
    }).then((user) => {
        if (user) {
            console.log('Käyttäjänimi on jo varattu');
            return res.redirect('/login');
        }

        let new_user = new kayttaja_model({
            nimi: kayttajanimi,
            tuotteet: []
        });

        new_user.save().then(() => {
            return res.redirect('/login');
        });

    });
});

app.use((req, res, next) => {
    res.status(404);
    res.send(`
        Sivua ei löydy
    `);
});

//Shutdown server CTRL + C in terminal

const mongoose_url = 'mongodb+srv://kauppalistauser:cCPVADNE2Gb5prde@cluster0-gmpod.mongodb.net/test?retryWrites=true&w=majority';

mongoose.connect(mongoose_url, {
    useUnifiedTopology: true,
    useNewUrlParser: true
}).then(() => {
    console.log('Mongoose connected');
    console.log('Start Express server');
    app.listen(PORT);
});