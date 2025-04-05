"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const mongodb_1 = require("mongodb");
const nanoid_1 = require("nanoid");
const joi_1 = __importDefault(require("joi"));
const ws_1 = __importStar(require("ws"));
const crypto_1 = require("crypto");
var Role;
(function (Role) {
    Role["Admin"] = "Admin";
    Role["Moderator"] = "Moderator";
    Role["MatchAdmin"] = "Match Admin";
    Role["Organizer"] = "Organizer";
})(Role || (Role = {}));
var Team;
(function (Team) {
    Team[Team["Away"] = 0] = "Away";
    Team[Team["Home"] = 1] = "Home";
})(Team || (Team = {}));
var Region;
(function (Region) {
    Region["EuWest"] = "eu-west";
    Region["NaEast"] = "na-east";
    Region["NaCentral"] = "na-central";
    Region["NaWest"] = "na-west";
    Region["OceEast"] = "oce-east";
})(Region || (Region = {}));
var Arena;
(function (Arena) {
    Arena["Slapstadium"] = "Slapstadium";
    Arena["Slapville"] = "Slapville";
    Arena["SlapstadiumMini"] = "Slapstadium_Mini";
    Arena["TableHockey"] = "Table_Hockey";
    Arena["Colosseum"] = "Colosseum";
    Arena["SlapvilleJumbo"] = "Slapville_Jumbo";
    Arena["Slapstation"] = "Slapstation";
    Arena["SlapstadiumXL"] = "Slapstadium_XL";
    Arena["Island"] = "Island";
    Arena["Obstacles"] = "Obstacles";
    Arena["ObstaclesXL"] = "Obstacles_XL";
})(Arena || (Arena = {}));
var GameMode;
(function (GameMode) {
    GameMode["Hockey"] = "hockey";
    GameMode["Dodgepuck"] = "dodgepuck";
    GameMode["Tag"] = "tag";
})(GameMode || (GameMode = {}));
const port = 4000;
const mongodbConnectionString = "mongodb://127.0.0.1:27017";
const app = (0, express_1.default)();
const wss = new ws_1.WebSocketServer({ port: port + 30 });
const database = new mongodb_1.MongoClient(mongodbConnectionString).db("SlapScorePro");
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
const joinSchema = joi_1.default.object({
    id: joi_1.default.string().required(),
    email: joi_1.default.string().required(),
    username: joi_1.default.string().required(),
    avatar: joi_1.default.string().required(),
});
const updateProfileSchema = joi_1.default.object({
    steam: joi_1.default.string(),
});
wss.on("connection", (ws) => {
    console.log("New websocket connected!");
    ws.on("error", console.error);
    ws.on("message", (data) => {
        if (Array.isArray(data))
            return;
        const message = new TextDecoder("utf-8").decode(data).split("$");
        const key = message[0];
        const value = message[1];
        console.log(`WebSocket command ${key} : ${value}`);
        handleWebSocketMessage(key, value, ws);
    });
});
async function handleWebSocketMessage(command, value, ws) {
    switch (command) {
        case "join":
            {
                const user = await userFromToken(value);
                if (typeof user === "number")
                    return ws.close();
                ws.user = user;
            }
            break;
        default:
            break;
    }
}
app.get("/profile/:id", async (req, res) => {
    const users = database.collection("users");
    const id = req.params.id ?? null;
    const foundUser = await users.findOne({ id });
    if (!foundUser) {
        res.sendStatus(404);
        return;
    }
    res.json({
        id: foundUser.id,
        avatar: foundUser.avatar,
        username: foundUser.username,
        created: foundUser.created,
        roles: foundUser.roles,
    });
});
app.post("/profile", async (req, res) => {
    const token = req.headers.authorization ?? null;
    const user = await userFromToken(token);
    const users = database.collection("users");
    if (typeof user === "number") {
        res.sendStatus(403);
        return;
    }
    const data = updateProfileSchema.validate(req.body);
    if (data.error) {
        res.json(data.error);
        return;
    }
    await users.updateOne({ id: user.id }, {
        $set: {
            steam: data.value.steam,
        },
    });
    res.sendStatus(200);
});
app.post("/join", async (req, res) => {
    const data = joinSchema.validate(req.body);
    if (data.error) {
        res.json(data.error);
        return;
    }
    const users = database.collection("users");
    const foundUser = await users.findOne({ id: data.value.id });
    if (!foundUser) {
        const newUser = {
            avatar: data.value.avatar,
            email: data.value.email,
            id: data.value.id,
            username: data.value.username,
            created: new Date().getTime(),
            roles: [],
            steam: null,
        };
        await users.insertOne(newUser);
        res.json({ token: await createSession(newUser) });
    }
    else {
        res.json({ token: await createSession(foundUser) });
    }
});
app.get("/lobby/:id/:team/:user", async (req, res) => {
    const id = req.params.id ?? null;
    const team = req.params.team ?? null;
    const userId = req.params.user ?? null;
    const token = req.headers.authorization ?? null;
    const user = await userFromToken(token);
    if (typeof user === "number") {
        res.sendStatus(403);
        return;
    }
    const lobbies = database.collection("lobbies");
    const foundLobby = await lobbies.findOne({ id });
    if (!foundLobby) {
        res.sendStatus(401);
        return;
    }
    let owner = false;
    if (foundLobby.owner === user.id)
        owner = true;
    if (!foundLobby.options.selfJoin && !owner) {
        res.json({
            error: "Cannot selfjoin team. Selfjoin is not enabled.",
            code: 1,
        });
        return;
    }
    if (foundLobby.options.selfJoin && !owner && userId !== user.id) {
        res.json({
            error: "You are not owner of lobby, so you can't join for other players.",
            code: 3,
        });
    }
    let isLobby = false;
    let currentTeam = null;
    if (foundLobby.members.find((m) => m === userId)) {
        isLobby = true;
    }
    if (foundLobby.homeTeam.find((m) => m === userId)) {
        currentTeam = Team.Home;
    }
    if (foundLobby.awayTeam.find((m) => m === userId)) {
        currentTeam = Team.Away;
    }
    if (!isLobby) {
        res.json({
            error: "Cannot join team. You haven't entered the lobby yet.",
            code: 2,
        });
        return;
    }
    if (currentTeam == Team.Away) {
        await lobbies.updateOne({ id }, { $pull: { awayTeam: userId } });
    }
    else if (currentTeam == Team.Home) {
        await lobbies.updateOne({ id }, { $pull: { homeTeam: userId } });
    }
    if (team === "away") {
        await lobbies.updateOne({ id }, { $push: { awayTeam: userId } });
    }
    else if (team === "home") {
        await lobbies.updateOne({ id }, { $push: { homeTeam: userId } });
    }
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN && client) {
            if (client?.user) {
                if (foundLobby.members.find((m) => m === client?.user?.id)) {
                    console.log(`switch ${userId} team ${team} lobby ${foundLobby.id}`);
                    client.send(`switch ${userId} team ${team} lobby ${foundLobby.id}`);
                }
            }
        }
    });
    res.sendStatus(200);
});
app.get("/lobby/:id/join", async (req, res) => {
    const token = req.headers.authorization ?? null;
    const id = req.params.id ?? null;
    const user = await userFromToken(token);
    if (typeof user === "number") {
        res.sendStatus(403);
        return;
    }
    if (!user.steam) {
        res.json({
            error: "Cannot join lobby because you don't have steam ID assigned to you account.",
            code: 1,
        });
        return;
    }
    const lobbies = database.collection("lobbies");
    const foundLobby = await lobbies.findOne({ id });
    if (!foundLobby) {
        res.sendStatus(401);
        return;
    }
    lobbies.updateOne({ id }, { $push: { members: user.id } });
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN && client) {
            if (client?.user) {
                if (foundLobby.members.find((m) => m === client?.user?.id)) {
                    console.log(`join ${user.id} lobby ${foundLobby.id}`);
                    client.send(`join ${user.id}`);
                }
            }
        }
    });
    res.sendStatus(200);
});
app.get("/lobby/:id/kick/:user", async (req, res) => {
    const token = req.headers.authorization ?? null;
    const id = req.params.id ?? null;
    const userId = req.params.user ?? null;
    const user = await userFromToken(token);
    if (typeof user === "number") {
        res.sendStatus(403);
        return;
    }
    const lobbies = database.collection("lobbies");
    const foundLobby = await lobbies.findOne({ id, members: user.id });
    if (!foundLobby || !userId) {
        res.sendStatus(401);
        return;
    }
    if (foundLobby.owner !== user.id || !isAdmin(user)) {
        res.sendStatus(403);
        return;
    }
    lobbies.updateOne({ id }, { $pull: { members: userId, awayTeam: userId, homeTeam: userId } });
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN && client) {
            if (client?.user) {
                if (foundLobby.members.find((m) => m === client?.user?.id)) {
                    console.log(`kicked ${user.id} lobby ${foundLobby.id}`);
                    client.send(`kicked ${user.id}`);
                }
            }
        }
    });
    res.sendStatus(200);
});
app.get("/lobby/:id/leave", async (req, res) => {
    const token = req.headers.authorization ?? null;
    const id = req.params.id ?? null;
    const user = await userFromToken(token);
    if (typeof user === "number") {
        res.sendStatus(403);
        return;
    }
    const lobbies = database.collection("lobbies");
    const foundLobby = await lobbies.findOne({ id, members: user.id });
    if (!foundLobby) {
        res.sendStatus(401);
        return;
    }
    lobbies.updateOne({ id }, { $pull: { members: user.id, awayTeam: user.id, homeTeam: user.id } });
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN && client) {
            if (client?.user) {
                if (foundLobby.members.find((m) => m === client?.user?.id)) {
                    console.log(`left ${user.id} lobby ${foundLobby.id}`);
                    client.send(`left ${user.id}`);
                }
            }
        }
    });
    res.sendStatus(200);
});
app.get("/lobby/:id", async (req, res) => {
    const token = req.headers.authorization ?? null;
    const id = req.params.id ?? null;
    const user = await userFromToken(token);
    if (typeof user === "number") {
        res.sendStatus(403);
        return;
    }
    const lobbies = database.collection("lobbies");
    const foundLobby = await lobbies.findOne({ id });
    if (!foundLobby) {
        res.sendStatus(401);
        return;
    }
    res.json(foundLobby);
});
app.delete("/lobby/:id", async (req, res) => {
    const token = req.headers.authorization ?? null;
    const id = req.params.id ?? null;
    const user = await userFromToken(token);
    if (typeof user === "number") {
        res.sendStatus(403);
        return;
    }
    const lobbies = database.collection("lobbies");
    const foundLobby = await lobbies.findOne({ id });
    if (!foundLobby) {
        res.sendStatus(401);
        return;
    }
    lobbies.deleteOne({ id });
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN && client) {
            if (client?.user) {
                if (foundLobby.members.find((m) => m === client?.user?.id)) {
                    console.log(`deleted lobby ${foundLobby.id}`);
                    client.send(`deleted ${foundLobby.id}`);
                }
            }
        }
    });
    res.sendStatus(200);
});
const lobbySchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    region: joi_1.default.string().required(),
    password: joi_1.default.string(),
    creator: joi_1.default.string().required(),
    arena: joi_1.default.string().required(),
    gameMode: joi_1.default.string().required(),
    usePeriod: joi_1.default.boolean().required(),
    period: joi_1.default.number(),
    teamSize: joi_1.default.number().required(),
    matchLength: joi_1.default.number().required(),
    selfJoin: joi_1.default.boolean(),
});
app.post("/lobby", async (req, res) => {
    const token = req.headers.authorization ?? null;
    const data = lobbySchema.validate(req.body);
    if (data.error) {
        res.status(401).json(data.error);
        return;
    }
    const user = await userFromToken(token);
    console.log(user);
    if (typeof user === "number" || !isAdmin(user)) {
        res.sendStatus(403);
        return;
    }
    const lobbies = database.collection("lobbies");
    const lobby = {
        id: (0, crypto_1.randomUUID)(),
        owner: user.id,
        created: new Date().getTime(),
        members: [user.id],
        awayTeam: [],
        homeTeam: [],
        awayCapitan: null,
        homeCapitan: null,
        options: {
            ...data.value,
            teamSize: data.value.teamSize ?? 4,
        },
    };
    lobbies.insertOne(lobby);
    res.json(lobby);
});
app.listen(port, () => console.log(`Running on http://localhost:${port}`));
async function userFromToken(token) {
    const sessions = database.collection("sessions");
    const users = database.collection("users");
    if (!token) {
        return 401;
    }
    const session = await sessions.findOne({ token });
    if (!session) {
        return 403;
    }
    const user = await users.findOne({ id: session.id });
    if (!user) {
        return 403;
    }
    return { ...user };
}
async function createSession(user) {
    const sessions = database.collection("sessions");
    const token = (0, nanoid_1.nanoid)();
    await sessions.insertOne({
        created: new Date().getTime(),
        id: user.id,
        token,
    });
    return token;
}
function isAdmin(user) {
    return user.roles.find((role) => role === Role.Admin);
}
