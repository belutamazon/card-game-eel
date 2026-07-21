const suits = [
    {
        name: "diamond",
        symbol: "♦",
        order: 0
    },
    {
        name: "club",
        symbol: "♣",
        order: 1
    },
    {
        name: "heart",
        symbol: "♥",
        order: 2
    },
    {
        name: "spade",
        symbol: "♠",
        order: 3
    }
];

const ranks = [
    {
        name: "A",
        value: 1,
        action: null
    },
    {
        name: "2",
        value: 2,
        action: null
    },
    {
        name: "3",
        value: 3,
        action: null
    },
    {
        name: "4",
        value: 4,
        action: null
    },
    {
        name: "5",
        value: 5,
        action: null
    },
    {
        name: "6",
        value: 6,
        action: null
    },
    {
        name: "7",
        value: 7,
        action: "peek_self"
    },
    {
        name: "8",
        value: 8,
        action: "peek_self"
    },
    {
        name: "9",
        value: 9,
        action: "peek_other"
    },
    {
        name: "10",
        value: 10,
        action: "peek_other"
    },
    {
        name: "J",
        value: 10,
        action: "swap"
    },
    {
        name: "Q",
        value: 10,
        action: "swap"
    },
    {
        name: "K",
        value: 10,
        action: null
    }
];

function createDeck() {
    const deck = [];

    for (const suit of suits) {
        for (const rank of ranks) {

            let value = rank.value;

            // K merah = -2
            if (
                rank.name === "K" &&
                (suit.name === "diamond" || suit.name === "heart")
            ) {
                value = -2;
            }

            const card = {
                id: `${rank.name}_${suit.name}`,

                rank: rank.name,
                suit: suit.name,
                symbol: suit.symbol,

                value: value,
                action: rank.action,

                // Skill hanya aktif saat kartu baru diambil
                actionAvailable: false
            };

            deck.push(card);
        }
    }

    return deck;
}

function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {

        const randomIndex = Math.floor(Math.random() * (i + 1));

        [deck[i], deck[randomIndex]] =
        [deck[randomIndex], deck[i]];
    }

    return deck;
}

module.exports = {
    createDeck,
    shuffle
};