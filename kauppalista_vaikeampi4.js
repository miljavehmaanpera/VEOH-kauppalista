
const express = require('express');
const PORT = process.env.PORT || 8080;
const body_parser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.set('useFindAndModify', false);

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
        next(err);
        res.redirect('login');
    });
});

app.use(express.static('public'));

app.get('/', is_logged_handler, (req, res, next) => {
    const user = req.user;
    user.populate('kauppalistat')
        .execPopulate()
        .then(() => {
            res.write(`
        <html>
        <link rel="stylesheet" type="text/css" href="css/style.css"/>
        <head><meta charset='utf-8'></head>
        <body>
           <p align=right> Kirjautunut sisään käyttäjänimellä: ${user.nimi}
            <form action="/logout" method="POST">
               <p align=right> <button type="submit">Kirjaudu ulos</button>
            </form></p>
            <h3>${user.nimi}n kauppalistat<br><br><br></h3>
            `);
            user.kauppalistat.forEach((kauppalista) => {
                res.write(`
                <href="/shopping-list/${kauppalista._id}">
                        ${kauppalista.nimi}
                    
                        <form action="muokkaa-kauppalista" method="POST">
                            <input type="hidden" name="kauppalista_id" value="${kauppalista._id}">                                       
                            <button type="submit">Päivitä kauppalista</button>
                        </form>

                        <form action="poista-kauppalista" method="POST">
                            <input type="hidden" name="kauppalista_id" value="${kauppalista._id}">
                            <button type="submit">Poista kauppalista</button>
                        </form>             
                `);
            });

            res.write(`
            <form action="/lisaa-kauppalista" method="POST">
                <input type="text" placeholder="kauppalistan nimi" name="kauppalista_nimi">
                <button type="submit">Lisää kauppalista</button>
            </form>

        </html>
        </body>
        `);
            res.end();
        });
});

app.post('/lisaa-kauppalista', (req, res, next) => {
    const user = req.user;

    let new_kauppalista = kauppalista_model({
        nimi: req.body.kauppalista_nimi,
        kauppalistat: []
    });
    new_kauppalista.save().then(() => {
        console.log('kauppalista tallennettu');
        user.kauppalistat.push(new_kauppalista);
        user.save().then(() => {
            return res.redirect('/');
        });
    });
});

app.post('/poista-kauppalista', (req, res, next) => {
    const user = req.user;
    const kauppalista_id_to_delete = req.body.kauppalista_id;

    //Remove tuote from user.kauppalistat
    const updated_kauppalistat = user.kauppalistat.filter((kauppalista_id) => {
        return kauppalista_id != kauppalista_id_to_delete;
    });
    user.kauppalistat = updated_kauppalistat;

    //Remove tuote object from database
    user.save().then(() => {
        kauppalista_model.findByIdAndRemove(kauppalista_id_to_delete).then(() => {
            res.redirect('/');
        });
    });
});

app.post('/muokkaa-kauppalista', (req, res, next) => {
    const user = req.user;
    const kauppalista_id_to_edit = req.body.kauppalista_id;
    
    mongoose.set('useFindAndModify', false);
    user.save().then(()=>{
          res.redirect(`/kauppalista/${kauppalista_id_to_edit}`);
    });
});



app.get('/kauppalista/:id', (req, res, next) => {
    const kauppalista_id = req.params.id;
    const user = req.user;
    var tuote_id='';
    var i=0;
    
    kauppalista_model.findOne({
        _id: kauppalista_id
    }).then((kauppalista)=>{
        kauppalista.populate('tuotteet').execPopulate().then((tuotteet)=>{
            console.log(kauppalista.tuotteet.length);
            res.write(`
                <html>
                <link rel="stylesheet" type="text/css" href="css/style.css"/>
                <head><meta charset='utf-8'></head>
                <body>
                <p align=right> Kirjautunut sisään käyttäjänimellä: ${user.nimi}
                    <form action="/logout" method="POST">
                    <p align=right> <button type="submit">Kirjaudu ulos</button>
                    </form>
                </p>
                    <h3>${user.nimi}n kauppalista<br><br><br></h3>
            `);
             for(i=0; i<kauppalista.tuotteet.length; i++) {
                res.write(kauppalista.tuotteet[i].text);
                res.write(`
                <table>
                <tr>
                    <td rowspan="2">
                        <img src="${kauppalista.tuotteet[i].kuva_url}" height="100" width="100">
                    </td>
                    <td>
                        ${kauppalista.tuotteet[i].text}
                    </td>
                    <td width=100>
                    </td>
                    <td>
                        <form action="poista-tuote" method="POST">
                            <input type="hidden" name="tuote_id" value="${kauppalista.tuotteet[i]._id}">
                            <input type="hidden" name="kauppalistan_id" value="${kauppalista._id}">
                            <button type="submit">Poista tuote</button>
                        </form>
                    </td>
                </tr>
                <tr>
                    <td>
                    <form action="muokkaa-tuote" method="POST">
                            <input type="hidden" name="tuote_id" value="${kauppalista.tuotteet[i]._id}">
                            <input type="hidden" name="kauppalistan_id" value="${kauppalista._id}">
                            määrä: <input type="text" name="paivitetty_maara" value="${kauppalista.tuotteet[i].maara}" size="1">
                      
                    </td>
                    <td width=100>
                    </td>
                    <td>
                        
                            <button type="submit">Päivitä määrä</button>
                        </form>
                    </td>
                </tr>
                </table>
                <hr width=550px align=left>
                <p>
                `);
            } 
            res.write(`
            <form action="lisaa-tuote" method="POST">
                <input type="hidden" name="kauppalistan_id" value="${kauppalista._id}">
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
        
});
 
                
    


app.post('/kauppalista/muokkaa-tuote', (req, res, next) => {
    const user = req.user;
    const tuote_id_to_edit = req.body.tuote_id;
    const uusi_maara = req.body.paivitetty_maara;
    const kauppalista_to_edit = req.body.kauppalistan_id;
    
    user.kauppalistat.forEach(tuote => {
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
          res.redirect(`/kauppalista/${kauppalista_to_edit}`);     
    }); 
});

app.post('/kauppalista/poista-tuote', (req, res, next) => {
    const user = req.user;
    const tuote_id_to_delete = req.body.tuote_id;
    const kauppalista_to_edit = req.body.kauppalistan_id;

    kauppalista_model.findOne({
        _id: kauppalista_to_edit
    }).then((kauppalista)=>{
        kauppalista.populate('tuotteet').execPopulate().then((tuotteet)=>{
            const updated_tuotteet = kauppalista.tuotteet.filter((tuote_id) => {
                return tuote_id != tuote_id_to_delete;
            });
            kauppalista.tuotteet = updated_tuotteet;
        });
        
        //Tämä kaipaa korjaamista, jos ehtii. tuote ei poistu tietokannasta kauppalistalta
        user.save().then(() => {
            tuote_model.findByIdAndRemove(tuote_id_to_delete).then(() => {
                res.redirect(`/kauppalista/${kauppalista_to_edit}`);   
            });
        });
    });
});

app.get('/kauppalista/tuote/:id', (req, res, next) => {
    const tuote_id = req.params.id;
    tuote_model.findOne({
        _id: tuote_id
    }).then((tuote) => {
        res.send(tuote.text);
        res.send(tuote.kuva_url);
        res.send(tuote.maara);
    });
});

app.post('/kauppalista/lisaa-tuote', (req, res, next) => {
    const user = req.user;
    const kauppalista_to_edit = req.body.kauppalistan_id;

    let new_tuote = tuote_model({
        text: req.body.tuote_text,
        kuva_url: req.body.tuote_url,
        maara: req.body.tuote_maara
    });

    mongoose.set('useFindAndModify', false);
    new_tuote.save().then(user.save()).then(()=>{
        kauppalista_model.findOneAndUpdate({_id: kauppalista_to_edit}, {$push: {tuotteet: new_tuote}}, {upsert: true}, function(err,doc) {
            if (err) { throw err; }
            else { 
                console.log("Updated"); }
          }); 
          res.redirect(`/kauppalista/${kauppalista_to_edit}`);
    }); 

});


//
// alla olevia ei tarvitse muokata

app.post('/logout', (req, res, next) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/login', (req, res, next) => {
    res.write(`
    <html>
    <link rel="stylesheet" type="text/css" href="css/style.css"/>
    <head><meta charset='utf-8'></head>
    <body>
        <h1 align=center>Tervetuloa!</h1>
        <div align=center>
            <form action="/login" method="POST">
                <input type="text" name="kayttajanimi">
                <button type="submit">Kirjaudu sisään</button>
            </form>
            <form action="/register" method="POST">
                <input type="text" name="kayttajanimi">
                <button type="submit">Luo uusi käyttäjä</button>
            </form>
        </div>
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


