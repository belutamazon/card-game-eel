function calculateScore(player) {

    let total = 0;

    for (const item of player.cards) {
        total += item.card.value;
    }

    return total;
}
function comparePlayers(playerA, playerB) {

    const scoreA =
        calculateScore(playerA);

    const scoreB =
        calculateScore(playerB);

    // 1. Total score lebih kecil menang
    if (scoreA !== scoreB) {
        return scoreA - scoreB;
    }

    // 2. Jumlah kartu lebih sedikit menang
    if (
        playerA.cards.length !==
        playerB.cards.length
    ) {
        return (
            playerA.cards.length -
            playerB.cards.length
        );
    }

    // 3. Suit paling kecil menang
    const suitOrder = {
        diamond: 0,
        club: 1,
        heart: 2,
        spade: 3
    };

    const lowestSuitA =
        Math.min(
            ...playerA.cards.map(
                item =>
                    suitOrder[item.card.suit]
            )
        );

    const lowestSuitB =
        Math.min(
            ...playerB.cards.map(
                item =>
                    suitOrder[item.card.suit]
            )
        );

    return lowestSuitA - lowestSuitB;
}
function determineWinner(players) {

    const sortedPlayers =
        [...players].map(player => ({
            ...player,
            score: calculateScore(player)
        })).sort(
            comparePlayers
        );

    return sortedPlayers;
}

module.exports = {
    calculateScore,
    comparePlayers,
    determineWinner
};