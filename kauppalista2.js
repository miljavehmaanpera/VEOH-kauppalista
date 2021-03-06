const express = require('express');
const PORT = process.env.PORT || 8080;
const body_parser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const note_schema = new Schema({
    text: {
        type: String,
        required: true
    }
});
const note_model = new mongoose.model('note', note_schema);


const kayttaja_schema = new Schema({
    name: {
        type: String,
        required: true
    },
    notes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'note',
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
    user.populate('notes')
        .execPopulate()
        .then(() => {
            console.log('user:', user);
            res.write(`
        <html>
        <head><meta charset='utf-8'></head>
        <body>
            Kirjautunut sisään käyttäjänimellä: ${user.name}
            <form action="/logout" method="POST">
                <button type="submit">Kirjaudu ulos</button>
            </form>`);
            user.notes.forEach((note) => {
                res.write(note.text);
                res.write(`
                <form action="delete-note" method="POST">
                    <input type="hidden" name="note_id" value="${note._id}">
                    <button type="submit">Poista tuote</button>
                </form>
                `);
            });

            res.write(`
            <form action="/add-note" method="POST">
                <input type="text" name="note">
                <button type="submit">Lisää tuote</button>
            </form>
            
    
        </html>
        </body>
        `);
            res.end();
        });
});

app.post('/delete-note', (req, res, next) => {
    const user = req.user;
    const note_id_to_delete = req.body.note_id;

    //Remove note from user.notes
    const updated_notes = user.notes.filter((note_id) => {
        return note_id != note_id_to_delete;
    });
    user.notes = updated_notes;

    //Remove note object from database
    user.save().then(() => {
        note_model.findByIdAndRemove(note_id_to_delete).then(() => {
            res.redirect('/');
        });
    });
});

app.get('/note/:id', (req, res, next) => {
    const note_id = req.params.id;
    note_model.findOne({
        _id: note_id
    }).then((note) => {
        res.send(note.text);
    });
});

app.post('/add-note', (req, res, next) => {
    const user = req.user;

    let new_note = note_model({
        text: req.body.note
    });
    new_note.save().then(() => {
        console.log('note saved');
        user.notes.push(new_note);
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
    console.log('user: ', req.session.user)
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
        name: kayttajanimi
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
        name: kayttajanimi
    }).then((user) => {
        if (user) {
            console.log('Käyttäjänimi on jo varattu');
            return res.redirect('/login');
        }

        let new_user = new kayttaja_model({
            name: kayttajanimi,
            notes: []
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