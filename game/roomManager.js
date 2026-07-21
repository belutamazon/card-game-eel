const GameManager = require("./gameManager");

class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.playerRoomMap = new Map(); // socketId -> roomId
    }

    createRoom(hostSocketId, playerName, roomName, password = "") {
        if (!playerName || !playerName.trim()) {
            throw new Error("Nama player harus diisi");
        }
        if (!roomName || !roomName.trim()) {
            throw new Error("Nama room harus diisi");
        }

        // Leave existing room if any
        if (this.playerRoomMap.has(hostSocketId)) {
            this.leaveRoom(hostSocketId);
        }

        const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const game = new GameManager();

        const player = game.addPlayer(hostSocketId, playerName.trim());

        const room = {
            id: roomId,
            name: roomName.trim(),
            password: password ? password.trim() : "",
            hostId: hostSocketId,
            game: game,
            players: [
                { id: hostSocketId, name: playerName.trim(), isHost: true }
            ],
            createdAt: Date.now()
        };

        this.rooms.set(roomId, room);
        this.playerRoomMap.set(hostSocketId, roomId);

        return room;
    }

    joinRoom(socketId, playerName, roomId, password = "") {
        if (!playerName || !playerName.trim()) {
            throw new Error("Nama player harus diisi");
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error("Room tidak ditemukan");
        }

        if (room.game.state.status !== "waiting") {
            throw new Error("Permainan di room ini sudah berlangsung");
        }

        if (room.password && room.password !== password.trim()) {
            throw new Error("Password room salah!");
        }

        // Check if player already in room
        const existingPlayer = room.players.find(p => p.id === socketId);
        if (!existingPlayer) {
            // Leave previous room if any
            if (this.playerRoomMap.has(socketId)) {
                this.leaveRoom(socketId);
            }

            room.game.addPlayer(socketId, playerName.trim());
            room.players.push({
                id: socketId,
                name: playerName.trim(),
                isHost: false
            });
            this.playerRoomMap.set(socketId, roomId);
        }

        return room;
    }

    leaveRoom(socketId) {
        const roomId = this.playerRoomMap.get(socketId);
        if (!roomId) return null;

        const room = this.rooms.get(roomId);
        this.playerRoomMap.delete(socketId);

        if (!room) return null;

        // Remove from game & room players
        room.game.removePlayer(socketId);
        room.players = room.players.filter(p => p.id !== socketId);

        // If room is empty, delete room
        if (room.players.length === 0) {
            this.rooms.delete(roomId);
            return { roomId, roomDeleted: true };
        }

        // If host left, assign new host
        if (room.hostId === socketId) {
            room.hostId = room.players[0].id;
            room.players[0].isHost = true;
        }

        return { roomId, roomDeleted: false, room };
    }

    getRoomByPlayerId(socketId) {
        const roomId = this.playerRoomMap.get(socketId);
        if (!roomId) return null;
        return this.rooms.get(roomId);
    }

    getRoom(roomId) {
        return this.rooms.get(roomId) || null;
    }

    getPublicRoomList() {
        const list = [];
        for (const room of this.rooms.values()) {
            list.push({
                id: room.id,
                name: room.name,
                playerCount: room.players.length,
                status: room.game.state.status,
                hasPassword: Boolean(room.password),
                hostName: room.players.find(p => p.id === room.hostId)?.name || "-"
            });
        }
        return list;
    }
}

module.exports = RoomManager;
