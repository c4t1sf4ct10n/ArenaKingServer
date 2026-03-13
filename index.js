const express = require('express');
const bodyParser = require('body-parser');
const mssql = require('mssql');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configurer la connexion à SQL Server PROD
// const dbConfig = {
//     user: 'ch4t0n',
//     password: '&P4ssw0rd_1',
//     server: 'arenakingdb.database.windows.net',
//     database: 'arena-king',
//     options: {
//         encrypt: true
//     }
// };

// Configurer la connexion à SQL Server LOCAL
// const dbConfig = {
    // user: 'ch4t0n',
    // password: '&P4ssw0rd_1',
    // server: 'localhost',
    // database: 'arenakingdb',
    // options: {
        // encrypt: false,
        // trustServerCertificate: true
    // }
// };

const dbConfig = {
    user: 'api_user',
    password: 'al18529P_API',
    server: '51.77.220.109',
    database: 'arenakingdb',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Connexion à la base de données
mssql.connect(dbConfig).then(() => {
    console.log("Connecté à SQL Server");
}).catch(err => console.log("Erreur de connexion à SQL Server: ", err));

// Route pour récupérer les données du joueur
app.get('/api/player/:id', async (req, res) => {
    try {
        const playerId = req.params.id;
        const request = new mssql.Request();
        request.input('playerId', mssql.UniqueIdentifier, playerId);
        const result = await request.query(`SELECT p.*, cmr.role_rank as rank, cm.role_id, cmr.role_name, cmr.can_change_leader, cmr.can_demote, cmr.can_edit_clan, cmr.can_kick, cmr.can_promote, cmr.can_start_war, cmr.can_write_message, cm.contribution_points, pcs.sublevel_id, pcs.sublevel_name, pcs.current_points, pcs.reached_milestone_order, (SELECT TOP 1 setting_value FROM game_settings WHERE setting_name = 'current_dungeon') as current_dungeon FROM players p LEFT OUTER JOIN clan_members cm ON p.player_id = cm.player_id LEFT OUTER JOIN clan_member_roles cmr ON cm.role_id = cmr.role_id LEFT OUTER JOIN player_championship_stats pcs on p.player_id = pcs.player_id WHERE p.player_id =  '${playerId}'`);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


// Route pour vérifier l'existence d'un compte
app.get('/api/checkDevice/:deviceId', async (req, res) => {
    const deviceId = req.params.deviceId;
    console.log("deviceId : " + deviceId);
    try {
        const request = new mssql.Request();
        request.input('deviceId', mssql.VarChar, deviceId);
        const result = await request.query(`SELECT * FROM users WHERE device_id = '${deviceId}'`);
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);  // Le compte existe, retourner les infos
        } else {
            //Le compte n'existe pas donc on va le créer
            const request2 = new mssql.Request();
            request2.input('deviceId', mssql.VarChar, deviceId);
            await request2.query(`Execute CreatePlayer '${deviceId}'`);
            const request3 = new mssql.Request();
            request3.input('deviceId', mssql.VarChar, deviceId);
            const result = await request3.query(`SELECT * FROM users WHERE device_id = '${deviceId}'`);
            if (result.recordset.length > 0) {
                res.json(result.recordset[0]);  // Le compte existe, retourner les infos
            } else {
                res.json({ exists: false });    // Le compte n'existe pas
            }
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour récupérer l'inventaire d'un joueur
app.get('/api/inventory/:inventoryId', async (req, res) => {
    const inventoryId = req.params.inventoryId;

    try {
        const request = new mssql.Request();
        const result = await request.query(`SELECT ii.* FROM inventory_items ii WHERE ii.inventory_id = '${inventoryId}' and not ii.inventory_item_id in (select p.body_id from players p where p.inventory_id = ii.inventory_id union select p.foot_id from players p where p.inventory_id = ii.inventory_id union select p.hands_id from players p where p.inventory_id = ii.inventory_id union select p.head_id from players p where p.inventory_id = ii.inventory_id union select p.offhand_id from players p where p.inventory_id = ii.inventory_id union select p.shoulders_id from players p where p.inventory_id = ii.inventory_id union select p.thigh_id from players p where p.inventory_id = ii.inventory_id union select p.weapon_id from players p where p.inventory_id = ii.inventory_id)`);
        console.log("recordset : " + result.recordset);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send("Erreur lors de la récupération de l'inventaire: " + err.message);
    }
});

// Route pour récupérer l'inventaire d'un joueur
app.get('/api/equipments/:playerId', async (req, res) => {
    const playerId = req.params.playerId;

    try {
        const request = new mssql.Request();
        const result = await request.query(`Execute GetEquipments '${playerId}'`);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send("Erreur lors de la récupération de l'inventaire: " + err.message);
    }
});

// Route pour créer un compte si nécessaire
//TODO à supprimer
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

// CLAN //


// Route rechercher un clan
app.get('/api/clans/search', async (req, res) => {
    const searchTerm = (req.query.term || "");
    console.log("searchTerm : [" + searchTerm + "]");
    try {
        const request = new mssql.Request();
        request.input('search_term', mssql.NVarChar(255), searchTerm);

        const result = await request.execute('SearchClans');

        console.log("result : ", result.recordset);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur lors de la recherche de clans.');
    }
});

// Route pour récupérer les informations d'un clan
app.get('/api/clans/infos/:clanId', async (req, res) => {
    try {
        const clanId = req.params.clanId;
        console.log("clanId : ", clanId);
        const request = new mssql.Request();
        request.input('clanId', mssql.UniqueIdentifier, clanId);
        const result = await request.query(`SELECT TOP 1 * FROM clans WHERE clan_id = '${clanId}'`);
        console.log("result : ", result.recordset);
        console.log("result : ", result.recordset[0]);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour créer un clan
app.post('/api/clans/create', async (req, res) => {
    const { playerId, clanName, clanDescription, clanRequiredLevel } = req.body;
    console.log("playerId : " + playerId);
    console.log("clanName : " + clanName);
    console.log("clanDescription : " + clanDescription);
    console.log("clanRequiredLevel : " + clanRequiredLevel);

    try {
        const request = new mssql.Request();

        request.input('player_id', mssql.UniqueIdentifier, playerId);
        request.input('clan_name', mssql.NVarChar(255), clanName);
        request.input('clan_description', mssql.NVarChar(255), clanDescription);
        request.input('clan_required_level', mssql.Int, clanRequiredLevel);
        request.output('new_clan_id', mssql.UniqueIdentifier);

        const result = await request.execute('CreateClan');

        // ✅ Accès correct à la valeur du paramètre de sortie
        const newClanId = result.output.new_clan_id;

        res.json({ clan_id: newClanId });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur lors de la création du clan.');
    }
});

// Route pour récupérer l'adversaire (lootfight)
app.get('/api/opponent/:playerId', async (req, res) => {
    const playerId = req.params.playerId;
    console.log("playerId :" + playerId)
    try {
        const request = new mssql.Request();
        const result = await request.query(`Execute GetNextOpponent '${playerId}'`);
        console.log("recordset : ", result.recordset[0]);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).send("Erreur lors de la récupération de l'inventaire: " + err.message);
    }
});




// Route pour rejoindre un clan
app.post('/api/clans/join', async (req, res) => {
    const { playerId, clanId } = req.body;

    try {
        const request = new mssql.Request();
        request.input('player_id', mssql.UniqueIdentifier, playerId);
        request.input('clan_id', mssql.UniqueIdentifier, clanId);
        request.output('result_code', mssql.Int);

        await request.execute('JoinClan');
        const resultCode = request.parameters.result_code.value;
        console.log(resultCode);
        res.json({ success: resultCode === 0, code: resultCode });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur lors de la tentative de rejoindre un clan.');
    }
});

// Route pour quitter un clan
app.post('/api/clans/leave', async (req, res) => {
    const { playerId } = req.body;

    try {
        const request = new mssql.Request();
        request.input('player_id', mssql.UniqueIdentifier, playerId);
        request.output('result_code', mssql.Int);

        await request.execute('LeaveClan');

        const resultCode = request.parameters.result_code.value;
        console.log("resultCode : " + resultCode);
        // Gestion des cas selon le code retour
        let message = 'Départ du clan effectué.';
        if (resultCode === 1) message = "Le joueur n'appartient à aucun clan.";
        else if (resultCode === 2) message = "Le chef de clan ne peut pas quitter sans transférer la direction.";

        res.json({
            success: resultCode === 0,
            code: resultCode,
            message
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur lors de la tentative de quitter le clan.");
    }
});

// Route pour récupérer la liste des membres d'un clan
app.get('/api/clan/members/:clan_id', async (req, res) => {
    const { clan_id } = req.params;
    console.log("clan_id : " + clan_id);
    try {
        const request = new mssql.Request();
        const result = await request.query(`
            SELECT m.player_id, p.name, p.level, r.role_name, m.join_date, m.contribution_points, m.last_activity
            FROM clan_members m
            JOIN players p ON m.player_id = p.player_id
            JOIN clan_member_roles r ON m.role_id = r.role_id
            WHERE m.clan_id = '${clan_id}'
            ORDER BY m.join_date ASC;
        `);
        console.log("resultCode : ", result.recordset);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour poster un message dans le clan
app.post('/api/clan/message', async (req, res) => {
    const { clanId = "", playerId = "", message = "" } = req.body;

    console.log("clanId : [" + clanId + "]");
    console.log("playerId : [" + playerId + "]");
    console.log("message : [" + message + "]");

    try {
        const request = new mssql.Request();
        await request.query(`
            INSERT INTO clan_activity_log (
                log_id, clan_id, player_id, action_type_id, action_details
            ) VALUES (
                NEWID(), 
                '${clanId}', 
                '${playerId}', 
                (SELECT TOP 1 action_type_id FROM log_action_type WHERE action_type = 'message'),
                '${message}'
            );
        `);
        res.json({ success: true });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour kick un joueur dans le clan
app.post('/api/clan/kick', async (req, res) => {
    const { clanId = "", playerId = "", targetId = "" } = req.body;

    console.log("clanId : [" + clanId + "]");
    console.log("playerId : [" + playerId + "]");
    console.log("targetId : [" + targetId + "]");

    try {
        const request = new mssql.Request();
        const result = await request.query(`execute KickClanMember @player_id = '${playerId}', @target_id = '${targetId}', @clan_id = '${clanId}'`);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour promote un joueur dans le clan
app.post('/api/clan/promote', async (req, res) => {
    const { clanId, playerId, targetId, roleId } = req.body;

    try {

        console.log("clanId : [" + clanId + "]");
        console.log("playerId : [" + playerId + "]");
        console.log("targetId : [" + targetId + "]");
        console.log("roleId : [" + roleId + "]");

        const request = new mssql.Request();
        request.input('player_id', mssql.UniqueIdentifier, playerId);
        request.input('target_id', mssql.UniqueIdentifier, targetId);
        request.input('clan_id', mssql.UniqueIdentifier, clanId);
        request.input('role_id', mssql.UniqueIdentifier, roleId);

        const result = await request.execute('PromoteClanMember');

        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour demote un joueur dans le clan
app.post('/api/clan/demote', async (req, res) => {
    const { clanId, playerId, targetId, roleId } = req.body;

    try {

        console.log("clanId : [" + clanId + "]");
        console.log("playerId : [" + playerId + "]");
        console.log("targetId : [" + targetId + "]");
        console.log("roleId : [" + roleId + "]");

        const request = new mssql.Request();
        request.input('player_id', mssql.UniqueIdentifier, playerId);
        request.input('target_id', mssql.UniqueIdentifier, targetId);
        request.input('clan_id', mssql.UniqueIdentifier, clanId);
        request.input('role_id', mssql.UniqueIdentifier, roleId);

        const result = await request.execute('DemoteClanMember');
        res.json(result.recordset);
    } catch (err) {
        console.error("Erreur SQL :", err);
        res.status(500).send(err.message);
    }
});

// Route pour récupérer l'historique du clan
app.get('/api/clan/logs/:clan_id', async (req, res) => {
    const { clan_id } = req.params;
    try {
        const request = new mssql.Request();
        const result = await request.query(`
            SELECT TOP 50 
                log_id, action_date, p.name AS actor, 
                t.action_type, action_details, tp.name AS target
            FROM clan_activity_log l
            LEFT JOIN players p ON l.player_id = p.player_id
            LEFT JOIN players tp ON l.target_player_id = tp.player_id
            JOIN log_action_type t ON l.action_type_id = t.action_type_id
            WHERE l.clan_id = '${clan_id}'
            ORDER BY action_date DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// CHAMPIONNAT //

// Route pour récupérer la liste des joueurs d'un championnat
app.get('/api/clan/championship/:sublevel_id', async (req, res) => {
    const { sublevel_id } = req.params;
    console.log("sublevel_id : " + sublevel_id);
    try {
        const request = new mssql.Request();
        const result = await request.query(`
            SELECT p.player_id, p.level, p.name, pcs.sublevel_id, pcs.sublevel_name, pcs.current_points, pcs.reached_milestone_order
            FROM  
                players p 
                JOIN player_championship_stats pcs ON p.player_id = pcs.player_id
            WHERE
                pcs.sublevel_id = '${sublevel_id}'
            ORDER BY
                pcs.current_points DESC;
        `);
        console.log("resultCode : ", result.recordset);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// DIVERS //

// Route pour gérer les ouvertures de coffre
app.post('/api/openchest', async (req, res) => {
    const { playerId, chestType } = req.body;
    try {
        console.log("playerID : " + playerId + " // chestType : " + chestType);

        const request = new mssql.Request();

        // wooden_chest
        let loot_type = '59D2A247-CF4E-466D-83C6-63778E88FE2F';

        if (chestType == 'wooden_chest') // Silver Chest
        {
            loot_type = '59D2A247-CF4E-466D-83C6-63778E88FE2F';
        } else if (chestType == 'silver_chest') {
            loot_type = 'A011E6D8-82E5-4DBD-9607-3AB486FF31DC';
        } else if (chestType == 'golden_chest') {
            loot_type = '76455544-3E21-4F2E-BD38-FE139B6FDEF8';
        }
        console.log(loot_type);
        const result = await request.query(`execute OpenChest @player_id = '${playerId}', @loot_type_id = '${loot_type}'`);
        console.log(result.recordset);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour ajouter des ressources
app.post('/api/addcurrency', async (req, res) => {
    const { playerId, currency } = req.body;
    try {
        console.log("playerID : " + playerId + " // currency : " + currency);

        const request = new mssql.Request();

        console.log(currency);
        const result = await request.query(`update players set ${currency}_currency = ${currency}_currency + 50 where player_id = '${playerId}'`);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour gérer les recylage d'objet
app.post('/api/deleteItem', async (req, res) => {
    const { inventory_id, item_id } = req.body;
    try {
        console.log("inventory_id : " + inventory_id + " // item_id : " + item_id);

        const request = new mssql.Request();

        const result = await request.query(`execute DeleteItem @inventory_id = '${inventory_id}', @item_id = '${item_id}'`);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour changer le nom du joueur
app.post('/api/changePlayerName', async (req, res) => {
    const { player_id, new_name } = req.body;
    try {
        console.log("player_id : " + player_id + " // new_name : " + new_name);

        const request = new mssql.Request();

        const result = await request.query(`execute ChangePlayerName @player_id = '${player_id}', @new_name = '${new_name}'`);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/swapItem', async (req, res) => {
    const { player_id, new_item_id } = req.body;

    try {
        console.log("player_id : " + player_id + " // new_item_id : " + new_item_id);

        const request = new mssql.Request();

        const result = await request.query(`
            EXECUTE SwapEquippedItem 
                @player_id = '${player_id}', 
                @new_item_id = '${new_item_id}'
        `);

        res.json({ message: "Équipement mis à jour avec succès.", result: result.recordset });
    } catch (err) {
        console.error("Erreur dans /api/swapItem :", err);
        res.status(500).send(err.message);
    }
});

// Route pour gérer le combat
app.post('/api/combat', async (req, res) => {
    const { player1Id, player2Id, combatType } = req.body;
    try {
        const request = new mssql.Request();
        request.input('player1Id', mssql.UniqueIdentifier, player1Id);
        request.input('player2Id', mssql.UniqueIdentifier, player2Id);
        request.input('combatType', mssql.Int, combatType);

        const result = await request.execute('StartCombat');
        console.log(result)
        // Si la colonne `rounds` est une chaîne JSON
        const roundsData = JSON.parse(result.recordset[0].rounds);

        // Formatage du rapport de combat pour Unity
        const rounds = roundsData.map(round => ({
            attacker: round.attacker,
            defender: round.defender,
            skill: round.skill,
            result: round.result, // par ex. "Hit", "Crit", "Dodge", etc.
            damage: round.damage,
            defenderRemainingHP: round.defenderRemainingHP
        }));
        const combatReport = { rounds };
        console.log(combatReport)
        res.json(combatReport);
    } catch (err) {
        console.error('Erreur dans /api/combat:', err);
        res.status(500).send(err.message);
    }
});

// Fonction pour calculer la récompense en fonction du type de combat
function calculateReward(combatType) {
    switch (combatType) {
        case 0: return { loot: null };  // Simulation
        case 1: return { loot: "item1" };  // Loot
        case 2: return { loot: "item2" };  // Clan
        case 3: return { loot: "item3" };  // Dungeon
        case 4: return { loot: "item4" };  // Event
        default: return { loot: null };
    }
}

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API en écoute sur le port ${PORT} `);
});
