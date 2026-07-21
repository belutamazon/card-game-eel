function createGameState() {

    return {
        status: "waiting", // "waiting", "playing", "ended"

        players: [],

        drawPile: [],

        discardPile: [],

        currentPlayerIndex: 0,

        turnPhase: "draw", // "draw" (waiting for player to draw), "turn_choice" (holding drawn card, choose A or B), "action_pending" (performing action skill)

        currentDrawnCard: null,

        activeAction: null, // { type: "peek_self" | "peek_other" | "swap", playerId: string }

        peekResult: null, // { playerId: string, card: object, targetPosition: string, targetPlayerName?: string }

        // Informasi pair
        pairWindow: {
            isOpen: false,
            targetRank: null,
            completed: false,
            pairPlayerId: null
        },

        // Pemain yang memanggil STOP
        stoppedBy: null,

        winnerInfo: null
    };
}

module.exports = {
    createGameState
};