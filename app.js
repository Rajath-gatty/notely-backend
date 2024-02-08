import dotenv from "dotenv";
dotenv.config();
import express from "express";
import connectDb from "./database/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import event from "node:events";

import authRoute from "./routers/auth.router.js";
import appRoute from "./routers/app.router.js";
import { ApiError } from "./utils/ApiError.js";

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const eventEmitter = new event();
app.set("eventEmitter", eventEmitter);

app.use(
    cors({
        origin: "*",
        credentials: true,
        methods: ["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type"],
    })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/auth/", authRoute);
app.use("/api/v1/app/", appRoute);

io.on("connection", (socket) => {
    console.log("connected", socket.id);

    socket.on("join", async ({ boardId, userData }) => {
        socket.join(boardId);
        socket.user = userData;
        socket.user.socketId = socket.id;
        const res = await io.in(boardId).fetchSockets();
        const connectedUsers = res.map((i) => i.user);
        io.to(boardId).emit("connected-users", connectedUsers);
    });
    socket.on("cursor-move-update", (data) => {
        socket.broadcast.to(data.boardId).emit("cursor-move", data);
    });
    socket.on("disconnect", async () => {
        console.log("User disconnected");
    });
    socket.on("disconnecting", async () => {
        const roomId = Array.from(socket.rooms)[1];
        socket.broadcast.to(roomId).emit("disconnected-user", socket.id);
    });
});

eventEmitter.on("new-page", (data) => {
    io.in(data.boardId.toString()).emit("new-page", data);
});
eventEmitter.on("delete-page", (data) => {
    io.in(data.boardId.toString()).emit("delete-page", data.pageId);
});
eventEmitter.on("message", (data) => {
    io.in(data.boardId.toString()).emit("message", data);
});
eventEmitter.on("cover-update", (data) => {
    io.in(data.boardId.toString()).emit("cover-update", data);
});
eventEmitter.on("content-update", (data) => {
    io.in(data.boardId.toString()).emit("content-update", data);
});
eventEmitter.on("title-update", (data) => {
    io.in(data.boardId.toString()).emit("title-update", data);
});

app.use((err, req, res, next) => {
    if (!(err instanceof ApiError)) {
        console.log(err);
        return res.status(500).send(new ApiError("Something went wrong"));
    }
    res.status(err.statusCode || 500).send(err);
});

connectDb()
    .then(() => {
        httpServer.listen(8080, () => {
            console.log("server running...");
        });
    })
    .catch((err) => {
        console.log("could not connect to DB", err);
    });
