const { createDeck, shuffle } = require("./deck");
const { createGameState } = require("./gameState");
const { determineWinner } = require("./gameRules");

class GameManager {

    constructor() {
        this.state = createGameState();
    }

    addPlayer(id, name) {
        const player = {
            id,
            name,
            cards: [],
            hasCalledStop: false
        };

        this.state.players.push(player);
        return player;
    }

    removePlayer(id) {
        this.state.players = this.state.players.filter(
            player => player.id !== id
        );
    }

    startGame() {
        if (this.state.players.length < 2) {
            throw new Error("Permainan membutuhkan minimal 2 pemain");
        }

        this.state.status = "playing";
        this.state.drawPile = createDeck();
        shuffle(this.state.drawPile);

        this.state.discardPile = [];
        this.state.currentPlayerIndex = 0;
        this.state.turnPhase = "draw";
        this.state.currentDrawnCard = null;
        this.state.activeAction = null;
        this.state.peekResult = null;
        this.state.stoppedBy = null;
        this.state.winnerInfo = null;

        this.state.players.forEach(player => {
            const cardTL = { ...this.state.drawPile.pop(), revealed: false, actionAvailable: false };
            const cardTR = { ...this.state.drawPile.pop(), revealed: false, actionAvailable: false };
            const cardBL = { ...this.state.drawPile.pop(), revealed: true, actionAvailable: false };
            const cardBR = { ...this.state.drawPile.pop(), revealed: true, actionAvailable: false };

            player.cards = [
                { position: "top-left", card: cardTL },
                { position: "top-right", card: cardTR },
                { position: "bottom-left", card: cardBL },
                { position: "bottom-right", card: cardBR }
            ];
        });
    }

    drawCard(playerId) {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) throw new Error("Player tidak ditemukan");

        const currentPlayer = this.state.players[this.state.currentPlayerIndex];
        if (currentPlayer.id !== playerId) {
            throw new Error("Bukan giliran player ini");
        }

        if (this.state.turnPhase !== "draw") {
            throw new Error("Kartu sudah diambil untuk giliran ini");
        }

        if (this.state.drawPile.length === 0) {
            this.reloadDrawPile();
        }

        const card = this.state.drawPile.pop();
        card.actionAvailable = true; // Skill HANYA aktif untuk kartu yang baru diambil dari draw pile

        // Tutup 2 kartu bawah pada saat melakukan draw
        player.cards.forEach(item => {
            item.card.revealed = false;
        });

        this.state.currentDrawnCard = card;
        this.state.turnPhase = "turn_choice";
        this.state.peekResult = null;

        return card;
    }

    chooseDiscardDrawnCard(playerId) {
        this.validateTurnChoice(playerId);

        const card = { ...this.state.currentDrawnCard, revealed: true };
        this.state.currentDrawnCard = null;

        // Masukkan ke discard pile (terbuka)
        this.state.discardPile.push(card);

        // Buka window pair
        this.state.pairWindow = {
            isOpen: true,
            targetRank: card.rank,
            completed: false,
            pairPlayerId: null
        };

        // Skill HANYA aktif jika dibuang langsung saat baru diambil dari draw pile (Pilihan A)
        if (card.actionAvailable && card.action) {
            this.state.turnPhase = "action_pending";
            this.state.activeAction = {
                type: card.action,
                playerId: playerId
            };
            return { actionRequired: true, action: card.action };
        }

        this.finishTurn();
        return { actionRequired: false };
    }

    chooseSwapDrawnCard(playerId, targetPosition) {
        this.validateTurnChoice(playerId);

        const player = this.state.players.find(p => p.id === playerId);
        const cardSlot = player.cards.find(item => item.position === targetPosition);

        if (!cardSlot) {
            throw new Error("Posisi kartu tidak valid");
        }

        // Kartu lama dari deck pemain yang dibuang (skillnya TIDAK aktif)
        const oldCard = { ...cardSlot.card, revealed: true, actionAvailable: false };
        // Kartu baru masuk ke deck pemain (skillnya HILANG karena sudah masuk deck)
        const newCard = { ...this.state.currentDrawnCard, revealed: false, actionAvailable: false };

        cardSlot.card = newCard;
        this.state.currentDrawnCard = null;

        // Kartu lama dibuang ke discard pile (terbuka)
        this.state.discardPile.push(oldCard);

        // Pertukaran TIDAK mengaktifkan skill kartu aksi yang dibuang, tetapi membuka jendela pair
        this.state.pairWindow = {
            isOpen: true,
            targetRank: oldCard.rank,
            completed: false,
            pairPlayerId: null
        };

        this.finishTurn();
        return true;
    }

    executePeekSelf(playerId, targetPosition) {
        this.validateActionPending(playerId, "peek_self");

        const player = this.state.players.find(p => p.id === playerId);
        const cardSlot = player.cards.find(item => item.position === targetPosition);

        if (!cardSlot) {
            throw new Error("Posisi kartu tidak valid");
        }

        this.state.peekResult = {
            playerId,
            card: cardSlot.card,
            targetPosition,
            targetPlayerName: "Diri Sendiri"
        };

        this.state.activeAction = null;
        this.finishTurn();
        return cardSlot.card;
    }

    executePeekOther(playerId, targetPlayerId, targetPosition) {
        this.validateActionPending(playerId, "peek_other");

        if (playerId === targetPlayerId) {
            throw new Error("Skill ini khusus untuk melihat kartu lawan");
        }

        const targetPlayer = this.state.players.find(p => p.id === targetPlayerId);
        if (!targetPlayer) throw new Error("Pemain target tidak ditemukan");

        const cardSlot = targetPlayer.cards.find(item => item.position === targetPosition);
        if (!cardSlot) throw new Error("Posisi kartu tidak ditemukan");

        this.state.peekResult = {
            playerId,
            card: cardSlot.card,
            targetPosition,
            targetPlayerName: targetPlayer.name
        };

        this.state.activeAction = null;
        this.finishTurn();
        return cardSlot.card;
    }

    executeSwap(playerId, playerAPosition, playerBId, playerBPosition) {
        this.validateActionPending(playerId, "swap");

        const playerA = this.state.players.find(p => p.id === playerId);
        const playerB = this.state.players.find(p => p.id === playerBId);

        if (!playerA || !playerB) {
            throw new Error("Pemain tidak ditemukan");
        }

        const slotA = playerA.cards.find(item => item.position === playerAPosition);
        const slotB = playerB.cards.find(item => item.position === playerBPosition);

        if (!slotA || !slotB) {
            throw new Error("Posisi kartu tidak valid");
        }

        // Tukar kartu (tetap tertutup dan skill hilang jika ada)
        const temp = { ...slotA.card, actionAvailable: false };
        slotA.card = { ...slotB.card, actionAvailable: false };
        slotB.card = temp;

        this.state.activeAction = null;
        this.finishTurn();
        return true;
    }

    attemptPair(playerId, cardPosition) {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) throw new Error("Player tidak ditemukan");

        const cardSlot = player.cards.find(item => item.position === cardPosition);
        if (!cardSlot) throw new Error("Posisi kartu tidak ditemukan");

        // Jika pair window sudah tertutup, sudah dilakukan orang lain, atau rank tidak cocok -> Pelanggaran Pair
        if (
            !this.state.pairWindow.isOpen ||
            this.state.pairWindow.completed ||
            cardSlot.card.rank !== this.state.pairWindow.targetRank
        ) {
            return this.givePairPenalty(playerId, cardPosition);
        }

        // Pair Sukses
        this.state.pairWindow.completed = true;
        this.state.pairWindow.isOpen = false;

        const pairedCard = { ...cardSlot.card, revealed: true, actionAvailable: false };
        player.cards = player.cards.filter(item => item.position !== cardPosition);
        this.state.discardPile.push(pairedCard);

        return {
            success: true,
            type: "PAIR_SUCCESS"
        };
    }

    givePairPenalty(playerId, cardPosition) {
        const player = this.state.players.find(p => p.id === playerId);
        const cardSlot = player.cards.find(item => item.position === cardPosition);

        if (!cardSlot) throw new Error("Posisi kartu tidak ditemukan");

        if (this.state.drawPile.length === 0) {
            this.reloadDrawPile();
        }

        // Kartu yang salah/terlambat melakukan pair dibuang ke discard pile (terbuka, skill tidak aktif)
        const discardedInvalidCard = { ...cardSlot.card, revealed: true, actionAvailable: false };
        this.state.discardPile.push(discardedInvalidCard);

        // Ambil kartu baru dari draw pile untuk menggantikan posisi kartu tersebut (tertutup, skill tidak aktif)
        const replacementCard = { ...this.state.drawPile.pop(), revealed: false, actionAvailable: false };
        cardSlot.card = replacementCard;

        return {
            success: false,
            type: "PAIR_PENALTY",
            penaltyCard: replacementCard
        };
    }

    callStop(playerId) {
        const currentPlayer = this.state.players[this.state.currentPlayerIndex];
        if (currentPlayer.id !== playerId) {
            throw new Error("Bukan giliran player ini untuk memanggil STOP");
        }

        this.state.status = "ended";
        this.state.stoppedBy = playerId;

        // Hitung pemenang sesuai tie-breaker
        const rankedPlayers = determineWinner(this.state.players);
        this.state.winnerInfo = rankedPlayers;

        return rankedPlayers;
    }

    reloadDrawPile() {
        if (this.state.discardPile.length <= 1) {
            throw new Error("Tidak cukup kartu untuk membuat draw pile baru");
        }

        const topDiscard = this.state.discardPile.pop();
        const newDrawPile = shuffle([...this.state.discardPile]);

        this.state.drawPile = newDrawPile;
        this.state.discardPile = [topDiscard];
    }

    finishTurn() {
        this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
        this.state.turnPhase = "draw";
    }

    validateTurnChoice(playerId) {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) throw new Error("Player tidak ditemukan");

        const currentPlayer = this.state.players[this.state.currentPlayerIndex];
        if (currentPlayer.id !== playerId) {
            throw new Error("Bukan giliran player ini");
        }

        if (this.state.turnPhase !== "turn_choice" || !this.state.currentDrawnCard) {
            throw new Error("Anda harus membuang atau menukar kartu yang baru diambil");
        }
    }

    validateActionPending(playerId, expectedAction) {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) throw new Error("Player tidak ditemukan");

        const currentPlayer = this.state.players[this.state.currentPlayerIndex];
        if (currentPlayer.id !== playerId) {
            throw new Error("Bukan giliran player ini");
        }

        if (
            this.state.turnPhase !== "action_pending" ||
            !this.state.activeAction ||
            this.state.activeAction.type !== expectedAction
        ) {
            throw new Error("Tidak ada skill aksi aktif yang cocok");
        }
    }

    getPrivateState(playerId) {
        const players = this.state.players.map(player => {
            const isSelf = player.id === playerId;

            return {
                id: player.id,
                name: player.name,
                cards: player.cards.map(item => {
                    if (isSelf) {
                        return {
                            position: item.position,
                            card: { ...item.card }
                        };
                    }
                    return {
                        position: item.position,
                        card: {
                            id: item.card.id,
                            revealed: false
                        }
                    };
                })
            };
        });

        const isCurrentPlayer =
            this.state.players[this.state.currentPlayerIndex]?.id === playerId;

        return {
            status: this.state.status,
            players,
            drawPileCount: this.state.drawPile.length,
            discardPile: this.state.discardPile,
            currentPlayerIndex: this.state.currentPlayerIndex,
            turnPhase: this.state.turnPhase,
            currentDrawnCard: isCurrentPlayer ? this.state.currentDrawnCard : null,
            activeAction: isCurrentPlayer ? this.state.activeAction : null,
            peekResult: (this.state.peekResult && this.state.peekResult.playerId === playerId) ? {
                ...this.state.peekResult,
                card: { ...this.state.peekResult.card, revealed: true }
            } : null,
            pairWindowOpen: this.state.pairWindow.isOpen && !this.state.pairWindow.completed,
            stoppedBy: this.state.stoppedBy,
            winnerInfo: this.state.winnerInfo
        };
    }
}

module.exports = GameManager;