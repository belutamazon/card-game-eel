const { createDeck, shuffle } = require("./game/deck");

const deck = createDeck();

console.log("Jumlah kartu:", deck.length);

console.log(
    deck.map(card =>
        `${card.rank}${card.symbol} = ${card.value}`
    )
);

shuffle(deck);

console.log("\nDeck setelah shuffle:");

console.log(
    deck.map(card =>
        `${card.rank}${card.symbol}`
    )
);