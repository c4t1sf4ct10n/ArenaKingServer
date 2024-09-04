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
    console.log("Connecté à SQL Server.");
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

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API en écoute sur le port ${PORT}`);
});
