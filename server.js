const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const RoomManager = require("./game/roomManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const roomManager = new RoomManager();

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // Kirim daftar room ke socket yang baru terhubung
    socket.emit("room_list_updated", roomManager.getPublicRoomList());

    socket.on("get_rooms", () => {
        socket.emit("room_list_updated", roomManager.getPublicRoomList());
    });

    socket.on("create_room", ({ playerName, roomName, password }) => {
        try {
            const room = roomManager.createRoom(socket.id, playerName, roomName, password);
            socket.join(room.id);

            socket.emit("room_joined", {
                roomId: room.id,
                roomName: room.name,
                isHost: true,
                players: room.players,
                gameState: null
            });

            io.emit("room_list_updated", roomManager.getPublicRoomList());
        } catch (error) {
            console.error("ERROR CREATE ROOM:", error.message);
            socket.emit("error_message", error.message);
        }
    });

    socket.on("join_room", ({ playerName, roomId, password }) => {
        try {
            const room = roomManager.joinRoom(socket.id, playerName, roomId, password);
            socket.join(room.id);

            io.to(room.id).emit("room_updated", {
                roomId: room.id,
                roomName: room.name,
                hostId: room.hostId,
                players: room.players
            });

            socket.emit("room_joined", {
                roomId: room.id,
                roomName: room.name,
                isHost: room.hostId === socket.id,
                players: room.players,
                gameState: room.game.state.status === "playing" ? room.game.getPrivateState(socket.id) : null
            });

            io.emit("room_list_updated", roomManager.getPublicRoomList());
        } catch (error) {
            console.error("ERROR JOIN ROOM:", error.message);
            socket.emit("error_message", error.message);
        }
    });

    socket.on("leave_room", () => {
        handlePlayerLeave(socket);
    });

    socket.on("start_game", () => {
        try {
            const room = roomManager.getRoomByPlayerId(socket.id);
            if (!room) throw new Error("Anda tidak berada di room manapun");
            if (room.hostId !== socket.id) throw new Error("Hanya Host yang dapat memulai permainan");

            room.game.startGame();
            broadcastRoomGameState(room);
            io.emit("room_list_updated", roomManager.getPublicRoomList());
        } catch (error) {
            console.error("ERROR START GAME:", error.message);
            socket.emit("error_message", error.message);
        }
    });

    socket.on("draw_card", () => {
        try {
            const room = roomManager.getRoomByPlayerId(socket.id);
            if (!room) throw new Error("Anda tidak berada di dalam room");

            room.game.drawCard(socket.id);
            broadcastRoomGameState(room);
        } catch (error) {
            socket.emit("error_message", error.message);
        }
    });

    socket.on("choose_discard_drawn", () => {
        try {
            const room = roomManager.getRoomByPlayerId(socket.id);
            if (!room) throw new Error("Anda tidak berada di dalam room");

            room.game.chooseDiscardDrawnCard(socket.id);
            broadcastRoomGameState(room);
        } catch (error) {
            socket.emit("error_message", error.message);
        }
    });

    socket.on("choose_swap_drawn", ({ targetPosition }) => {
        try {
            const room = roomManager.getRoomByPlayerId(socket.id);
            if (!room) throw new Error("Anda tidak berada di dalam room");

            room.game.chooseSwapDrawnCard(socket.id, targetPosition);
            broadcastRoomGameState(room);
        } catch (error) {
            socket.emit("error_message", error.message);
        }
    });

    socket.on("execute_peek_self", ({ targetPosition }) => {
        try {
            const room = roomManager.getRoomByPlayerId(socket.id);
            if (!room) throw new Error("Anda tidak berada di dalam room");

            room.game.executePeekSelf(socket.id, targetPosition);
            broadcastRoomGameState(room);
        } catch (error) {
            socket.emit("error_message", error.message);
        }
    });

    socket.on("execute_peek_other", ({ targetPlayerId, targetPosition }) => {
        try {
            const room = roomManager.getRoomByPlayerId(socket.id);
            if (!room) throw new Error("Anda tidak berada di dalam room");

            room.game.executePeekOther(socket.id, targetPlayerId, targetPosition);
            broadcastRoomGameState(room);
        } catch (error) {
            socket.emit("error_message", error.message);
        }
    });

    socket.on("execute_swap", ({ playerAPosition, playerBId, playerBPosition }) => {
        try {
            const room = roomManager.getRoomByPlayerId(socket.id);
            if (!room) throw new Error("Anda tidak berada di dalam room");

            room.game.executeSwap(socket.id, playerAPosition, playerBId, playerBPosition);
            broadcastRoomGameState(room);
        } catch (error) {
            socket.emit("error_message", error.message);
        }
    });

    socket.on("attempt_pair", ({ cardPosition }) => {
        try {
            const room = roomManager.getRoomByPlayerId(socket.id);
            if (!room) throw new Error("Anda tidak berada di dalam room");

            const result = room.game.attemptPair(socket.id, cardPosition);
            if (!result.success) {
                socket.emit("error_message", "Pelanggaran Pair! Kartu Anda dibuang ke discard pile dan diganti kartu baru dari draw pile.");
            }
            broadcastRoomGameState(room);
        } catch (error) {
            socket.emit("error_message", error.message);
        }
    });

    socket.on("call_stop", () => {
        try {
            const room = roomManager.getRoomByPlayerId(socket.id);
            if (!room) throw new Error("Anda tidak berada di dalam room");

            room.game.callStop(socket.id);
            broadcastRoomGameState(room);
        } catch (error) {
            socket.emit("error_message", error.message);
        }
    });

    socket.on("disconnect", () => {
        handlePlayerLeave(socket);
    });
});

function handlePlayerLeave(socket) {
    const result = roomManager.leaveRoom(socket.id);
    if (result) {
        socket.leave(result.roomId);
        socket.emit("room_left");

        if (!result.roomDeleted && result.room) {
            io.to(result.roomId).emit("room_updated", {
                roomId: result.room.id,
                roomName: result.room.name,
                hostId: result.room.hostId,
                players: result.room.players
            });

            if (result.room.game.state.status === "playing") {
                broadcastRoomGameState(result.room);
            }
        }

        io.emit("room_list_updated", roomManager.getPublicRoomList());
    }
}

function broadcastRoomGameState(room) {
    room.players.forEach(player => {
        const privateState = room.game.getPrivateState(player.id);
        io.to(player.id).emit("game_state_updated", privateState);
        io.to(player.id).emit("game_started", privateState);
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
