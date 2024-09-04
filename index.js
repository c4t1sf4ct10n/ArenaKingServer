const express = require('express');
const sql = require('mssql');
const app = express();

// Configurer la connexion à SQL Server
const dbConfig = {
    user: 'ch4t0n',         // Utilisateur SQL Server
    password: '&P4ssw0rd_1',     // Mot de passe SQL Server
    server: 'arenakingdb.database.windows.net', // L'URL de votre serveur Azure SQL
    database: 'arena-king', // Nom de votre base de données
    options: {
        encrypt: true // Pour les connexions Azure SQL
    }
};

// Connexion à la base de données
sql.connect(dbConfig).then(() => {
    console.log("Connecté à SQL Server");
}).catch(err => console.log(err));

// Route pour récupérer les données du joueur
app.get('/api/player/:id', async (req, res) => {
    try {
        const playerId = req.params.id;
        const result = await sql.query`SELECT * FROM player_data WHERE player_id = ${playerId}`;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour vérifier l'existence d'un compte
app.get('/api/checkDevice/:deviceId', async (req, res) => {
    const deviceId = req.params.deviceId;
    try {
        const result = await sql.query`SELECT * FROM users WHERE device_id = ${deviceId}`;
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
    const { device_id } = req.body;
    try {
        const result = await sql.query`INSERT INTO users (device_id) OUTPUT Inserted.user_id VALUES (${device_id})`;
        res.json({ userId: result.recordset[0].user_id });
    } catch (err) {
        res.status(500).send(err.message);
    }
});


// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API en écoute sur le port ${PORT}`);
});
