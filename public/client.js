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

/* --------------------------------------------------------------------------
   CUSTOM TOAST CARD NOTIFICATION SYSTEM (NO ALERT)
   -------------------------------------------------------------------------- */
function showToast(message, type = "error", title = null) {
    const toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast-card ${type}`;

    let icon = "⚠️";
    let defaultTitle = "Pemberitahuan";

    if (type === "error") {
        icon = "🚫";
        defaultTitle = "Perhatian / Error";
    } else if (type === "success") {
        icon = "✨";
        defaultTitle = "Berhasil";
    } else if (type === "info") {
        icon = "ℹ️";
        defaultTitle = "Informasi Game";
    }

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-body">
            <div class="toast-title">${title || defaultTitle}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">✕</button>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 300);
    });

    toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add("fade-out");
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

/* --------------------------------------------------------------------------
   SATISFYING FLYING CARD ANIMATION SYSTEM
   -------------------------------------------------------------------------- */
function animateFlyingCard(fromElem, toElem, innerHTML, callback) {
    if (!fromElem || !toElem) {
        if (callback) callback();
        return;
    }

    const fromRect = fromElem.getBoundingClientRect();
    const toRect = toElem.getBoundingClientRect();

    const clone = document.createElement("div");
    clone.className = "card flying-card back";
    clone.innerHTML = innerHTML || `
        <div class="card-inner-back">
            <span class="back-logo">🂠</span>
            <span class="back-text">CABO</span>
        </div>
    `;

    clone.style.left = `${fromRect.left}px`;
    clone.style.top = `${fromRect.top}px`;
    clone.style.width = `${fromRect.width || 90}px`;
    clone.style.height = `${fromRect.height || 130}px`;

    document.body.appendChild(clone);

    // Force DOM repaint
    void clone.offsetWidth;

    clone.style.left = `${toRect.left}px`;
    clone.style.top = `${toRect.top}px`;
    clone.style.width = `${toRect.width || 90}px`;
    clone.style.height = `${toRect.height || 130}px`;
    clone.style.transform = `rotate(360deg) scale(1.08)`;

    setTimeout(() => {
        clone.remove();
        if (callback) callback();
    }, 450);
}

socket.on("connect", () => {
    myPlayerId = socket.id;
    console.log("Connected with ID:", myPlayerId);
});

// LOBBY EVENTS
btnOpenCreateRoom.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        showToast("Silakan masukkan nama player Anda terlebih dahulu!", "error");
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
        showToast("Nama room wajib diisi!", "error");
        return;
    }

    socket.emit("create_room", { playerName, roomName, password });
});

btnRefreshRooms.addEventListener("click", () => {
    socket.emit("get_rooms");
    showToast("Daftar room diperbarui", "info");
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
    showToast(`Berhasil bergabung ke Room ${roomName}`, "success");
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
    showToast("Anda telah keluar dari room", "info");
});

socket.on("game_started", (gameState) => {
    currentGameState = gameState;
    roomWaitingArea.classList.add("hidden");
    gameElement.classList.remove("hidden");
    renderGame(gameState);
    showToast("Permainan Dimulai! 2 kartu bawah Anda dibuka selama awal permainan.", "info");
});

socket.on("game_state_updated", (gameState) => {
    currentGameState = gameState;
    renderGame(gameState);
});

socket.on("error_message", (message) => {
    showToast(message, "error");
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
                <span class="status-badge">${statusText}</span>
            </div>
            <div class="room-card-info">
                Host: <strong>${room.hostName}</strong><br>
                Pemain: <strong>${room.playerCount}/4 orang</strong>
            </div>
            <button class="btn-glow btn-azure btn-join-room" ${room.status === "playing" ? "disabled" : ""}>Join Room</button>
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
        showToast("Silakan masukkan nama player Anda terlebih dahulu!", "error");
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

// GAMEPLAY ACTIONS WITH ANIMATIONS
stopButton.addEventListener("click", () => {
    socket.emit("call_stop");
    showToast("Anda memanggil CALL STOP!", "info");
});

drawPileElement.addEventListener("click", () => {
    if (!currentGameState || currentGameState.status !== "playing") return;

    const isMyTurn = currentGameState.players[currentGameState.currentPlayerIndex]?.id === myPlayerId;
    if (isMyTurn && currentGameState.turnPhase === "draw") {
        const targetPanel = document.getElementById("drawnCardContainer") || document.getElementById("myCardGrid");
        animateFlyingCard(drawPileElement, targetPanel, null, () => {
            socket.emit("draw_card");
        });
    }
});

btnDiscardDrawn.addEventListener("click", () => {
    const drawnContainer = document.getElementById("drawnCardContainer");
    const discardPile = document.getElementById("discardPile");

    animateFlyingCard(drawnContainer, discardPile, null, () => {
        socket.emit("choose_discard_drawn");
    });
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
            title.textContent = "🔍 SKILL KARTU 7/8: Intip Kartu Sendiri";
            subtext.textContent = "Klik salah satu kartu di tangan Anda untuk melihat nilainya.";
        } else if (actionType === "peek_other") {
            title.textContent = "👁️ SKILL KARTU 9/10: Intip Kartu Lawan";
            subtext.textContent = "Klik salah satu kartu milik lawan Anda untuk melihat nilainya.";
        } else if (actionType === "swap") {
            title.textContent = "🔄 SKILL KARTU J/Q: Tukar Kartu";
            subtext.textContent = "Klik 1 kartu Anda, lalu klik 1 kartu lawan untuk ditukarkan.";
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
        text.textContent = `Kartu target (${gameState.peekResult.targetPlayerName} - ${gameState.peekResult.targetPosition}):`;
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

        const cardElem = createCardElement(item);
        cardElem.dataset.position = item.position;

        cardElem.addEventListener("click", (e) => {
            handleCardClick(item.position, gameState, isMyTurn, cardElem);
        });

        wrapper.appendChild(cardElem);

        if (gameState.pairWindowOpen) {
            const pairBtn = document.createElement("button");
            pairBtn.className = "card-btn-pair";
            pairBtn.textContent = "⚡ PAIR!";

            pairBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                socket.emit("attempt_pair", { cardPosition: item.position });
            });

            wrapper.appendChild(pairBtn);
        }

        myCardGrid.appendChild(wrapper);
    });
}

function renderPlayers(gameState, isMyTurn) {
    const playersArea = document.getElementById("playersArea");
    playersArea.innerHTML = "";

    gameState.players.forEach((player, index) => {
        if (player.id === myPlayerId) return;

        const isCurrent = gameState.currentPlayerIndex === index;
        const playerArea = document.createElement("div");
        playerArea.className = `player-area ${isCurrent ? 'current-player' : ''}`;

        playerArea.innerHTML = `
            <div class="player-name">👤 ${player.name}</div>
            <div class="card-grid"></div>
        `;

        const grid = playerArea.querySelector(".card-grid");

        player.cards.forEach(item => {
            const wrapper = document.createElement("div");
            wrapper.className = "card-container";

            const cardElem = createCardElement(item);
            cardElem.dataset.position = item.position;
            cardElem.dataset.playerId = player.id;

            cardElem.addEventListener("click", () => {
                handleOpponentCardClick(player.id, item.position, gameState, isMyTurn);
            });

            wrapper.appendChild(cardElem);

            if (gameState.pairWindowOpen) {
                const pairBtn = document.createElement("button");
                pairBtn.className = "card-btn-pair";
                pairBtn.textContent = "⚡ PAIR!";

                pairBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    showToast("Pair hanya boleh mengklaim kartu milik Anda sendiri!", "error");
                });

                wrapper.appendChild(pairBtn);
            }

            grid.appendChild(wrapper);
        });

        playersArea.appendChild(playerArea);
    });
}

function handleCardClick(position, gameState, isMyTurn, cardElem) {
    if (!isMyTurn) return;

    const discardPile = document.getElementById("discardPile");

    if (gameState.turnPhase === "turn_choice" && gameState.currentDrawnCard) {
        animateFlyingCard(cardElem, discardPile, null, () => {
            socket.emit("choose_swap_drawn", { targetPosition: position });
        });
        return;
    }

    if (gameState.turnPhase === "action_pending" && gameState.activeAction) {
        const actionType = gameState.activeAction.type;

        if (actionType === "peek_self") {
            socket.emit("execute_peek_self", { targetPosition: position });
        } else if (actionType === "swap") {
            if (!actionSelectionState) {
                actionSelectionState = { playerAPosition: position };
                showToast(`Kartu Anda (${position}) dipilih. Sekarang klik 1 kartu lawan untuk ditukarkan!`, "info");
            }
        }
    }
}

function handleOpponentCardClick(targetPlayerId, position, gameState, isMyTurn) {
    if (!isMyTurn) return;

    if (gameState.turnPhase === "action_pending" && gameState.activeAction) {
        const actionType = gameState.activeAction.type;

        if (actionType === "peek_other") {
            socket.emit("execute_peek_other", { targetPlayerId, targetPosition: position });
        } else if (actionType === "swap") {
            if (actionSelectionState && actionSelectionState.playerAPosition) {
                socket.emit("execute_swap", {
                    playerAPosition: actionSelectionState.playerAPosition,
                    playerBId: targetPlayerId,
                    playerBPosition: position
                });
                actionSelectionState = null;
            } else {
                showToast("Pilih 1 kartu Anda terlebih dahulu sebelum memilih kartu lawan!", "error");
            }
        }
    }
}

function renderDiscardPile(gameState) {
    const discardElement = document.getElementById("discardPile");
    discardElement.innerHTML = "";

    const discardPile = gameState.discardPile;
    if (!discardPile || discardPile.length === 0) {
        discardElement.innerHTML = `<div class="card 3d-card empty-slot">-</div>`;
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
