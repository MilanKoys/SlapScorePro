import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Collection, MongoClient, WithId } from "mongodb";
import { nanoid, random } from "nanoid";
import Joi from "joi";
import WebSocket, { WebSocketServer } from "ws";
import { randomUUID } from "crypto";

type Nullable<T> = T | null;

enum Role {
  Admin = "Admin",
  Moderator = "Moderator",
  MatchAdmin = "Match Admin",
  Organizer = "Organizer",
}

enum Team {
  Away,
  Home,
}

enum Region {
  EuWest = "eu-west",
  NaEast = "na-east",
  NaCentral = "na-central",
  NaWest = "na-west",
  OceEast = "oce-east",
}

enum Arena {
  Slapstadium = "Slapstadium",
  Slapville = "Slapville",
  SlapstadiumMini = "Slapstadium_Mini",
  TableHockey = "Table_Hockey",
  Colosseum = "Colosseum",
  SlapvilleJumbo = "Slapville_Jumbo",
  Slapstation = "Slapstation",
  SlapstadiumXL = "Slapstadium_XL",
  Island = "Island",
  Obstacles = "Obstacles",
  ObstaclesXL = "Obstacles_XL",
}

enum GameMode {
  Hockey = "hockey",
  Dodgepuck = "dodgepuck",
  Tag = "tag",
}

type WebSocketExtended = WebSocket & {
  user?: User;
};

interface User {
  id: string;
  email: string;
  username: string;
  created: number;
  roles: Role[];
  avatar: string;
  steam: Nullable<string>;
}

interface LobbyOptions {
  selfJoin: boolean;
  name: string;
  region: Region;
  password?: string;
  creator: string;
  arena: Arena;
  gameMode: GameMode;
  usePeriod: boolean;
  period?: number;
  teamSize: number;
  matchLength: number;
}

interface Lobby {
  id: string;
  owner: string;
  created: number;
  members: string[];
  awayTeam: string[];
  homeTeam: string[];
  homeCapitan: Nullable<string>;
  awayCapitan: Nullable<string>;
  options: LobbyOptions;
}

interface Session {
  token: string;
  id: string;
  created: number;
}

const port: number = parseInt(process.env.PORT ?? '4000');
const mongodbConnectionString: string = process.env.DATABASE ?? "mongodb://127.0.0.1:27017";
const app = express();
const wss = new WebSocketServer({ port: port + 30 });

console.log(`Connecting to database using string ${mongodbConnectionString}`);

const database = new MongoClient(mongodbConnectionString).db("SlapScorePro");

app.use(express.json());
app.use(cors());
app.use(helmet());

const joinSchema = Joi.object({
  id: Joi.string().required(),
  email: Joi.string().required(),
  username: Joi.string().required(),
  avatar: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  steam: Joi.string(),
});

wss.on("connection", (ws) => {
  console.log("New websocket connected!");
  ws.on("error", console.error);

  ws.on("message", (data: WebSocket.RawData) => {
    if (Array.isArray(data)) return;
    const message = new TextDecoder("utf-8").decode(data).split("$");
    const key = message[0];
    const value = message[1];
    console.log(`WebSocket command ${key} : ${value}`);
    handleWebSocketMessage(key, value, ws);
  });
});

async function handleWebSocketMessage(
  command: string,
  value: string,
  ws: WebSocketExtended
) {
  switch (command) {
    case "join":
      {
        const user = await userFromToken(value);
        if (typeof user === "number") return ws.close();
        ws.user = user;
      }
      break;
    default:
      break;
  }
}

app.get("/profile/:id", async (req, res) => {
  const users: Collection<User> = database.collection("users");
  const id: Nullable<string> = req.params.id ?? null;

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
  const token: Nullable<string> = req.headers.authorization ?? null;
  const user = await userFromToken(token);
  const users: Collection<User> = database.collection("users");

  if (typeof user === "number") {
    res.sendStatus(403);
    return;
  }

  const data = updateProfileSchema.validate(req.body);
  if (data.error) {
    res.json(data.error);
    return;
  }

  await users.updateOne(
    { id: user.id },
    {
      $set: {
        steam: data.value.steam,
      },
    }
  );

  res.sendStatus(200);
});

app.post("/join", async (req, res) => {
  const data = joinSchema.validate(req.body);
  if (data.error) {
    res.json(data.error);
    return;
  }

  const users: Collection<User> = database.collection("users");

  const foundUser = await users.findOne({ id: data.value.id });

  if (!foundUser) {
    const newUser: User = {
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
  } else {
    res.json({ token: await createSession(foundUser) });
  }
});

app.get("/lobby/:id/:team/:user", async (req, res) => {
  const id: Nullable<string> = req.params.id ?? null;
  const team: Nullable<string> = req.params.team ?? null;
  const userId: Nullable<string> = req.params.user ?? null;
  const token: Nullable<string> = req.headers.authorization ?? null;
  const user = await userFromToken(token);

  if (typeof user === "number") {
    res.sendStatus(403);
    return;
  }

  const lobbies: Collection<Lobby> = database.collection("lobbies");
  const foundLobby = await lobbies.findOne({ id });

  if (!foundLobby) {
    res.sendStatus(401);
    return;
  }

  let owner = false;
  if (foundLobby.owner === user.id) owner = true;
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
  let currentTeam: Nullable<Team> = null;

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
  } else if (currentTeam == Team.Home) {
    await lobbies.updateOne({ id }, { $pull: { homeTeam: userId } });
  }

  if (team === "away") {
    await lobbies.updateOne({ id }, { $push: { awayTeam: userId } });
  } else if (team === "home") {
    await lobbies.updateOne({ id }, { $push: { homeTeam: userId } });
  }

  wss.clients.forEach((client: WebSocketExtended) => {
    if (client.readyState === WebSocket.OPEN && client) {
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
  const token: Nullable<string> = req.headers.authorization ?? null;
  const id: Nullable<string> = req.params.id ?? null;
  const user = await userFromToken(token);

  if (typeof user === "number") {
    res.sendStatus(403);
    return;
  }

  if (!user.steam) {
    res.json({
      error:
        "Cannot join lobby because you don't have steam ID assigned to you account.",
      code: 1,
    });
    return;
  }

  const lobbies: Collection<Lobby> = database.collection("lobbies");
  const foundLobby = await lobbies.findOne({ id });

  if (!foundLobby) {
    res.sendStatus(401);
    return;
  }

  lobbies.updateOne({ id }, { $push: { members: user.id } });

  wss.clients.forEach((client: WebSocketExtended) => {
    if (client.readyState === WebSocket.OPEN && client) {
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
  const token: Nullable<string> = req.headers.authorization ?? null;
  const id: Nullable<string> = req.params.id ?? null;
  const userId: Nullable<string> = req.params.user ?? null;
  const user = await userFromToken(token);

  if (typeof user === "number") {
    res.sendStatus(403);
    return;
  }

  const lobbies: Collection<Lobby> = database.collection("lobbies");
  const foundLobby = await lobbies.findOne({ id, members: user.id });

  if (!foundLobby || !userId) {
    res.sendStatus(401);
    return;
  }

  if (foundLobby.owner !== user.id || !isAdmin(user)) {
    res.sendStatus(403);
    return;
  }

  lobbies.updateOne(
    { id },
    { $pull: { members: userId, awayTeam: userId, homeTeam: userId } }
  );

  wss.clients.forEach((client: WebSocketExtended) => {
    if (client.readyState === WebSocket.OPEN && client) {
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
  const token: Nullable<string> = req.headers.authorization ?? null;
  const id: Nullable<string> = req.params.id ?? null;
  const user = await userFromToken(token);

  if (typeof user === "number") {
    res.sendStatus(403);
    return;
  }

  const lobbies: Collection<Lobby> = database.collection("lobbies");
  const foundLobby = await lobbies.findOne({ id, members: user.id });

  if (!foundLobby) {
    res.sendStatus(401);
    return;
  }

  lobbies.updateOne(
    { id },
    { $pull: { members: user.id, awayTeam: user.id, homeTeam: user.id } }
  );

  wss.clients.forEach((client: WebSocketExtended) => {
    if (client.readyState === WebSocket.OPEN && client) {
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
  const token: Nullable<string> = req.headers.authorization ?? null;
  const id: Nullable<string> = req.params.id ?? null;

  const user = await userFromToken(token);

  if (typeof user === "number") {
    res.sendStatus(403);
    return;
  }

  const lobbies: Collection<Lobby> = database.collection("lobbies");

  const foundLobby = await lobbies.findOne({ id });

  if (!foundLobby) {
    res.sendStatus(401);
    return;
  }

  res.json(foundLobby);
});

app.delete("/lobby/:id", async (req, res) => {
  const token: Nullable<string> = req.headers.authorization ?? null;
  const id: Nullable<string> = req.params.id ?? null;

  const user = await userFromToken(token);

  if (typeof user === "number") {
    res.sendStatus(403);
    return;
  }

  const lobbies: Collection<Lobby> = database.collection("lobbies");

  const foundLobby = await lobbies.findOne({ id });

  if (!foundLobby) {
    res.sendStatus(401);
    return;
  }

  lobbies.deleteOne({ id });

  wss.clients.forEach((client: WebSocketExtended) => {
    if (client.readyState === WebSocket.OPEN && client) {
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

const lobbySchema = Joi.object({
  name: Joi.string().required(),
  region: Joi.string().required(),
  password: Joi.string(),
  creator: Joi.string().required(),
  arena: Joi.string().required(),
  gameMode: Joi.string().required(),
  usePeriod: Joi.boolean().required(),
  period: Joi.number(),
  teamSize: Joi.number().required(),
  matchLength: Joi.number().required(),
  selfJoin: Joi.boolean(),
});

app.post("/lobby", async (req, res) => {
  const token: Nullable<string> = req.headers.authorization ?? null;

  const data: Joi.ValidationResult<LobbyOptions> = lobbySchema.validate(
    req.body
  );

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

  const lobbies: Collection<Lobby> = database.collection("lobbies");

  const lobby: Lobby = {
    id: randomUUID(),
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

async function userFromToken(token: Nullable<string>): Promise<User | number> {
  const sessions: Collection<Session> = database.collection("sessions");
  const users: Collection<User> = database.collection("users");

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

async function createSession(user: User): Promise<string> {
  const sessions: Collection<Session> = database.collection("sessions");
  const token = nanoid();
  await sessions.insertOne({
    created: new Date().getTime(),
    id: user.id,
    token,
  });

  return token;
}

function isAdmin(user: User) {
  return user.roles.find((role) => role === Role.Admin);
}
