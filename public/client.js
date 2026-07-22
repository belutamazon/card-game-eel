const socket = io();

let myPlayerId = null;
let currentRoomId = null;
let currentGameState = null;
let targetRoomToJoin = null;

let actionSelectionState = null;

// DOM Elements
const playerNameInput = document.getElementById("playerName");
const btnOpenCreateRoom = document.getElementById("btnOpenCreateRoom");
const btnRefreshRooms = document.getElementById("btnRefreshRooms");
const roomListContainer = document.getElementById("roomList");

// Modal Create Room
const createRoomModal = document.getElementById("createRoomModal");
const createRoomNameInput = document.getElementById("createRoomName");
const createRoomPasswordInput = document.getElementById("createRoomPassword");
const btnSubmitCreateRoom = document.getElementById("btnSubmitCreateRoom");
const btnCancelCreateRoom = document.getElementById("btnCancelCreateRoom");

// Modal Password Prompt
const passwordPromptModal = document.getElementById("passwordPromptModal");
const passwordPromptRoomName = document.getElementById("passwordPromptRoomName");
const joinRoomPasswordInput = document.getElementById("joinRoomPassword");
const btnSubmitJoinPassword = document.getElementById("btnSubmitJoinPassword");
const btnCancelJoinPassword = document.getElementById("btnCancelJoinPassword");

// Room Waiting Area
const roomWaitingArea = document.getElementById("roomWaitingArea");
const roomTitle = document.getElementById("roomTitle");
const roomHostInfo = document.getElementById("roomHostInfo");
const waitingPlayerCount = document.getElementById("waitingPlayerCount");
const waitingPlayerList = document.getElementById("waitingPlayerList");
const btnStartGame = document.getElementById("btnStartGame");
const btnLeaveRoom = document.getElementById("btnLeaveRoom");

// Gameplay Elements
const gameElement = document.getElementById("game");
const inGameRoomTitle = document.getElementById("inGameRoomTitle");
const stopButton = document.getElementById("stopButton");
const btnDiscardDrawn = document.getElementById("btnDiscardDrawn");
const closePeekBtn = document.getElementById("closePeekBtn");
const restartBtn = document.getElementById("restartBtn");
const drawPileElement = document.getElementById("drawPile");

socket.on("connect", () => {
    myPlayerId = socket.id;
    console.log("Connected with ID:", myPlayerId);
});

// LOBBY EVENTS
btnOpenCreateRoom.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert("Silakan masukkan nama player Anda terlebih dahulu!");
        playerNameInput.focus();
        return;
    }
    createRoomModal.classList.remove("hidden");
});

btnCancelCreateRoom.addEventListener("click", () => {
    createRoomModal.classList.add("hidden");
});

btnSubmitCreateRoom.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    const roomName = createRoomNameInput.value.trim();
    const password = createRoomPasswordInput.value;

    if (!roomName) {
        alert("Nama room wajib diisi!");
        return;
    }

    socket.emit("create_room", { playerName, roomName, password });
});

btnRefreshRooms.addEventListener("click", () => {
    socket.emit("get_rooms");
});

btnCancelJoinPassword.addEventListener("click", () => {
    passwordPromptModal.classList.add("hidden");
    targetRoomToJoin = null;
});

btnSubmitJoinPassword.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    const password = joinRoomPasswordInput.value;

    if (targetRoomToJoin) {
        socket.emit("join_room", {
            playerName,
            roomId: targetRoomToJoin.id,
            password
        });
    }
});

btnLeaveRoom.addEventListener("click", () => {
    socket.emit("leave_room");
});

btnStartGame.addEventListener("click", () => {
    socket.emit("start_game");
});

// SOCKET LISTENERS (ROOMS)
socket.on("room_list_updated", (roomList) => {
    renderRoomList(roomList);
});

socket.on("room_joined", ({ roomId, roomName, isHost, players, gameState }) => {
    currentRoomId = roomId;
    createRoomModal.classList.add("hidden");
    passwordPromptModal.classList.add("hidden");
    document.getElementById("lobby").classList.add("hidden");

    if (gameState && gameState.status === "playing") {
        roomWaitingArea.classList.add("hidden");
        gameElement.classList.remove("hidden");
        currentGameState = gameState;
        renderGame(gameState);
    } else {
        gameElement.classList.add("hidden");
        roomWaitingArea.classList.remove("hidden");
        updateRoomWaitingArea(roomName, players, isHost);
    }
});

socket.on("room_updated", ({ roomId, roomName, hostId, players }) => {
    const isHost = hostId === myPlayerId;
    updateRoomWaitingArea(roomName, players, isHost);
});

socket.on("room_left", () => {
    currentRoomId = null;
    currentGameState = null;
    roomWaitingArea.classList.add("hidden");
    gameElement.classList.add("hidden");
    document.getElementById("lobby").classList.remove("hidden");
    socket.emit("get_rooms");
});

socket.on("game_started", (gameState) => {
    currentGameState = gameState;
    roomWaitingArea.classList.add("hidden");
    gameElement.classList.remove("hidden");
    renderGame(gameState);
});

socket.on("game_state_updated", (gameState) => {
    currentGameState = gameState;
    renderGame(gameState);
});

socket.on("error_message", (message) => {
    alert(message);
});

function renderRoomList(roomList) {
    roomListContainer.innerHTML = "";

    const roomCountBadge = document.getElementById("roomCountBadge");
    if (roomCountBadge) {
        roomCountBadge.textContent = `${roomList ? roomList.length : 0} Room`;
    }

    if (!roomList || roomList.length === 0) {
        roomListContainer.innerHTML = `<div class="no-rooms">Belum ada room aktif. Buat room baru untuk memulai!</div>`;
        return;
    }

    roomList.forEach(room => {
        const card = document.createElement("div");
        card.className = "room-card";

        const lockIcon = room.hasPassword ? "🔒" : "🔓";
        const statusText = room.status === "playing" ? "🎮 Sedang Bermain" : "⏳ Menunggu Pemain";

        card.innerHTML = `
            <div class="room-card-header">
                <span class="room-card-title">${room.name} ${lockIcon}</span>
                <span class="room-card-badge">${statusText}</span>
            </div>
            <div class="room-card-info">
                Host: <strong>${room.hostName}</strong><br>
                Pemain: <strong>${room.playerCount} orang</strong>
            </div>
            <button class="btn-primary btn-join-room" ${room.status === "playing" ? "disabled" : ""}>Join Room</button>
        `;

        const joinBtn = card.querySelector(".btn-join-room");
        joinBtn.addEventListener("click", () => {
            handleJoinRoomClick(room);
        });

        roomListContainer.appendChild(card);
    });
}

function handleJoinRoomClick(room) {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert("Silakan masukkan nama player Anda terlebih dahulu!");
        playerNameInput.focus();
        return;
    }

    if (room.hasPassword) {
        targetRoomToJoin = room;
        passwordPromptRoomName.textContent = `Room: ${room.name}`;
        joinRoomPasswordInput.value = "";
        passwordPromptModal.classList.remove("hidden");
    } else {
        socket.emit("join_room", {
            playerName,
            roomId: room.id,
            password: ""
        });
    }
}

function updateRoomWaitingArea(roomName, players, isHost) {
    roomTitle.textContent = `Room: ${roomName}`;
    waitingPlayerCount.textContent = players.length;

    const hostPlayer = players.find(p => p.isHost || p.id === isHost);
    roomHostInfo.textContent = `Host: ${hostPlayer ? hostPlayer.name : '-'}`;

    waitingPlayerList.innerHTML = "";
    players.forEach(p => {
        const chip = document.createElement("div");
        chip.className = `player-chip ${p.isHost ? 'host' : ''}`;
        chip.innerHTML = `${p.isHost ? '👑 ' : '👤 '}${p.name} ${p.id === myPlayerId ? '(Anda)' : ''}`;
        waitingPlayerList.appendChild(chip);
    });

    if (isHost) {
        btnStartGame.classList.remove("hidden");
        btnStartGame.disabled = players.length < 2;
        if (players.length < 2) {
            btnStartGame.title = "Butuh minimal 2 pemain untuk memulai";
        } else {
            btnStartGame.title = "Mulai permainan";
        }
    } else {
        btnStartGame.classList.add("hidden");
    }
}

// GAMEPLAY ACTIONS
stopButton.addEventListener("click", () => {
    if (confirm("Apakah Anda yakin ingin memanggil STOP dan mengakhiri permainan?")) {
        socket.emit("call_stop");
    }
});

drawPileElement.addEventListener("click", () => {
    if (!currentGameState || currentGameState.status !== "playing") return;

    const isMyTurn = currentGameState.players[currentGameState.currentPlayerIndex]?.id === myPlayerId;
    if (isMyTurn && currentGameState.turnPhase === "draw") {
        socket.emit("draw_card");
    }
});

btnDiscardDrawn.addEventListener("click", () => {
    socket.emit("choose_discard_drawn");
});

closePeekBtn.addEventListener("click", () => {
    document.getElementById("peekResultModal").classList.add("hidden");
});

restartBtn.addEventListener("click", () => {
    document.getElementById("winnerModal").classList.add("hidden");
    gameElement.classList.add("hidden");
    roomWaitingArea.classList.remove("hidden");
});

function renderGame(gameState) {
    const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === myPlayerId;

    renderGameInfo(gameState, isMyTurn);
    renderDrawnCardPanel(gameState, isMyTurn);
    renderActionPromptPanel(gameState, isMyTurn);
    renderPeekResult(gameState);
    renderWinnerModal(gameState);

    renderMyCards(gameState, isMyTurn);
    renderPlayers(gameState, isMyTurn);
    renderDiscardPile(gameState);
}

function renderGameInfo(gameState, isMyTurn) {
    const turnInfo = document.getElementById("turnInfo");
    const drawPileInfo = document.getElementById("drawPileInfo");
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (gameState.status === "ended") {
        turnInfo.textContent = `PERMAINAN SELESAI (Dihentikan oleh ${gameState.stoppedBy})`;
    } else {
        turnInfo.textContent = isMyTurn ? "GILIRAN ANDA!" : `Giliran: ${currentPlayer?.name || "-"}`;
    }

    drawPileInfo.textContent = `Sisa draw pile: ${gameState.drawPileCount}`;

    if (isMyTurn && gameState.turnPhase === "draw" && gameState.status === "playing") {
        stopButton.classList.remove("hidden");
    } else {
        stopButton.classList.add("hidden");
    }
}

function renderDrawnCardPanel(gameState, isMyTurn) {
    const panel = document.getElementById("drawnCardPanel");
    const container = document.getElementById("drawnCardContainer");

    if (isMyTurn && gameState.turnPhase === "turn_choice" && gameState.currentDrawnCard) {
        panel.classList.remove("hidden");
        container.innerHTML = "";
        container.appendChild(createCardElement({ card: gameState.currentDrawnCard }));
    } else {
        panel.classList.add("hidden");
    }
}

function renderActionPromptPanel(gameState, isMyTurn) {
    const panel = document.getElementById("actionPromptPanel");
    const title = document.getElementById("actionPromptText");
    const subtext = document.getElementById("actionPromptSubtext");

    if (isMyTurn && gameState.turnPhase === "action_pending" && gameState.activeAction) {
        panel.classList.remove("hidden");
        const actionType = gameState.activeAction.type;

        if (actionType === "peek_self") {
            title.textContent = "Aksi Kartu 7 / 8: Peek Diri Sendiri";
            subtext.textContent = "Klik salah satu kartu Anda di bawah untuk mengintip isinya.";
        } else if (actionType === "peek_other") {
            title.textContent = "Aksi Kartu 9 / 10: Peek Kartu Lawan";
            subtext.textContent = "Klik salah satu kartu milik pemain lain di atas untuk mengintip.";
        } else if (actionType === "swap") {
            title.textContent = "Aksi Kartu J / Q: Tukar Kartu Tanpa Melihat";
            if (!actionSelectionState) {
                subtext.textContent = "Langkah 1: Klik salah satu kartu Anda yang ingin ditukar.";
            } else {
                subtext.textContent = "Langkah 2: Klik salah satu kartu lawan untuk menyelesaikan pertukaran.";
            }
        }
    } else {
        panel.classList.add("hidden");
        actionSelectionState = null;
    }
}

function renderPeekResult(gameState) {
    const modal = document.getElementById("peekResultModal");
    const text = document.getElementById("peekResultText");
    const container = document.getElementById("peekResultCardContainer");

    if (gameState.peekResult) {
        modal.classList.remove("hidden");
        text.textContent = `Kartu pada posisi [${gameState.peekResult.targetPosition}] milik ${gameState.peekResult.targetPlayerName}:`;
        container.innerHTML = "";
        const peekedCard = { ...gameState.peekResult.card, revealed: true };
        container.appendChild(createCardElement({ card: peekedCard }));
    }
}

function renderWinnerModal(gameState) {
    const modal = document.getElementById("winnerModal");
    const title = document.getElementById("winnerTitle");
    const leaderboard = document.getElementById("leaderboard");

    if (gameState.status === "ended" && gameState.winnerInfo) {
        modal.classList.remove("hidden");
        const winner = gameState.winnerInfo[0];
        title.textContent = `🏆 Pemenang: ${winner.name} (Total Nilai: ${winner.score})`;

        leaderboard.innerHTML = "";
        gameState.winnerInfo.forEach((p, idx) => {
            const row = document.createElement("div");
            row.className = `leaderboard-row ${idx === 0 ? 'winner' : ''}`;
            row.innerHTML = `
                <span>#${idx + 1} ${p.name}</span>
                <span>Kartu: ${p.cards.length} | Nilai Total: ${p.score}</span>
            `;
            leaderboard.appendChild(row);
        });
    } else {
        modal.classList.add("hidden");
    }
}

function renderMyCards(gameState, isMyTurn) {
    const myCardGrid = document.getElementById("myCardGrid");
    myCardGrid.innerHTML = "";

    const me = gameState.players.find(p => p.id === myPlayerId);
    if (!me) return;

    me.cards.forEach(item => {
        const wrapper = document.createElement("div");
        wrapper.className = "card-container";

        const cardElement = createCardElement(item);

        cardElement.addEventListener("click", () => {
            handleMyCardClick(item, gameState, isMyTurn);
        });

        wrapper.appendChild(cardElement);

        if (gameState.pairWindowOpen) {
            const pairBtn = document.createElement("button");
            pairBtn.className = "card-btn-pair";
            pairBtn.textContent = "PAIR!";
            pairBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                socket.emit("attempt_pair", { cardPosition: item.position });
            });
            wrapper.appendChild(pairBtn);
        }

        myCardGrid.appendChild(wrapper);
    });
}

function handleMyCardClick(item, gameState, isMyTurn) {
    if (!isMyTurn) return;

    if (gameState.turnPhase === "turn_choice") {
        socket.emit("choose_swap_drawn", { targetPosition: item.position });
        return;
    }

    if (gameState.turnPhase === "action_pending" && gameState.activeAction) {
        const actionType = gameState.activeAction.type;

        if (actionType === "peek_self") {
            socket.emit("execute_peek_self", { targetPosition: item.position });
        } else if (actionType === "swap") {
            if (!actionSelectionState) {
                actionSelectionState = { step: 1, playerAPosition: item.position };
                alert("Kartu Anda dipilih. Sekarang klik kartu lawan yang ingin ditukar.");
                renderGame(gameState);
            }
        }
    }
}

function renderPlayers(gameState, isMyTurn) {
    const playersArea = document.getElementById("playersArea");
    playersArea.innerHTML = "";

    gameState.players.forEach(player => {
        if (player.id === myPlayerId) return;

        const playerElement = document.createElement("div");
        playerElement.classList.add("player-area");

        if (gameState.currentPlayerIndex === gameState.players.indexOf(player)) {
            playerElement.classList.add("current-player");
        }

        playerElement.innerHTML = `
            <h3 class="player-name">${player.name} (${player.cards.length} kartu)</h3>
            <div class="card-grid"></div>
        `;

        const cardGrid = playerElement.querySelector(".card-grid");

        player.cards.forEach(item => {
            const card = createCardElement(item);

            card.addEventListener("click", () => {
                handleOtherCardClick(player.id, item, gameState, isMyTurn);
            });

            cardGrid.appendChild(card);
        });

        playersArea.appendChild(playerElement);
    });
}

function handleOtherCardClick(targetPlayerId, item, gameState, isMyTurn) {
    if (!isMyTurn) return;

    if (gameState.turnPhase === "action_pending" && gameState.activeAction) {
        const actionType = gameState.activeAction.type;

        if (actionType === "peek_other") {
            socket.emit("execute_peek_other", {
                targetPlayerId,
                targetPosition: item.position
            });
        } else if (actionType === "swap") {
            if (actionSelectionState && actionSelectionState.step === 1) {
                socket.emit("execute_swap", {
                    playerAPosition: actionSelectionState.playerAPosition,
                    playerBId: targetPlayerId,
                    playerBPosition: item.position
                });
                actionSelectionState = null;
            } else {
                alert("Pilih kartu Anda terlebih dahulu untuk dipasangkan.");
            }
        }
    }
}

function renderDiscardPile(gameState) {
    const discardElement = document.getElementById("discardPile");
    discardElement.innerHTML = "";

    const discardPile = gameState.discardPile;
    if (!discardPile || discardPile.length === 0) {
        discardElement.innerHTML = `<div class="card">-</div>`;
        return;
    }

    const topCard = discardPile[discardPile.length - 1];
    discardElement.appendChild(createCardElement({ card: topCard }));
}

function createCardElement(item) {
    const card = item.card;
    const element = document.createElement("div");
    element.classList.add("card");

    if (!card || card.revealed === false) {
        element.classList.add("back");
        element.innerHTML = `
            <div class="card-inner-back">
                <span class="back-logo">🂠</span>
                <span class="back-text">CABO</span>
            </div>
        `;
        return element;
    }

    const isRed = (card.suit === "diamond" || card.suit === "heart");
    element.classList.add(isRed ? "red" : "black");

    element.innerHTML = `
        <div class="card-corner-top">${card.rank}</div>
        <div class="card-center-symbol">${card.symbol}</div>
        <div class="card-corner-bottom">${card.rank}</div>
    `;

    return element;
}
