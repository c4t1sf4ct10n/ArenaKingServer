const express = require('express');
const bodyParser = require('body-parser');
const mssql = require('mssql');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configurer la connexion à SQL Server
const dbConfig = {
    user: 'ch4t0n',
    password: '&P4ssw0rd_1',
    server: 'arenakingdb.database.windows.net',
    database: 'arena-king',
    options: {
        encrypt: true
    }
};

// Connexion à la base de données
mssql.connect(dbConfig).then(() => {
    console.log("Connecté à SQL Server");
}).catch(err => console.log("Erreur de connexion à SQL Server: ", err));

// Route pour récupérer les données du joueur
app.get('/api/player/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const request = new mssql.Request();
        request.input('userId', mssql.UniqueIdentifier, userId);
        const result = await request.query('SELECT * FROM player_data WHERE user_id = @userId');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour vérifier l'existence d'un compte
app.get('/api/checkDevice/:deviceId', async (req, res) => {
    const deviceId = req.params.deviceId;
    try {
        const request = new mssql.Request();
        request.input('deviceId', mssql.VarChar, deviceId);
        const result = await request.query('SELECT * FROM users WHERE device_id = @deviceId');
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);  // Le compte existe, retourner les infos
        } else {
            res.json({ exists: false });    // Le compte n'existe pas
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour créer un compte si nécessaire
app.post('/api/createUser', async (req, res) => {
    const device_id = req.body.device_id;
    const userId = uuidv4();  // Générer un UUID

    try {
        const request = new mssql.Request();
        request.input('userId', mssql.UniqueIdentifier, userId);
        request.input('device_id', mssql.VarChar, device_id);
        const result = await request.query('INSERT INTO users (user_id, device_id) VALUES (@userId, @device_id)');
        res.json({ userId: userId });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API en écoute sur le port ${PORT}`);
});
