const express = require("express");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const server = app.listen(PORT, () =>
    console.log(`Servidor rodando em http://localhost:${PORT}`)
);

const wss = new WebSocketServer({ server });

// Estrutura das salas:
// rooms = { "ab12f3": { players: [ws1, ws2], moves: {} }}
let rooms = {};

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8);
}

// WebSocket conectado
wss.on("connection", (ws) => {
    console.log("Novo cliente conectado.");

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);
        console.log("Recebido:", data);

        // --------------------
        // Criar sala
        // --------------------
        if (data.type === "createRoom") {
            const roomId = generateRoomId();
            rooms[roomId] = { players: [ws], moves: {} };

            ws.roomId = roomId;
            ws.playerName = data.name;

            ws.send(JSON.stringify({
                type: "roomCreated",
                roomId
            }));

            console.log("Sala criada:", roomId);
            return;
        }

        // --------------------
        // Entrar em sala
        // --------------------
        if (data.type === "joinRoom") {
            const room = rooms[data.roomId];

            if (!room) {
                ws.send(JSON.stringify({ type: "error", msg: "Sala inexistente!" }));
                return;
            }

            if (room.players.length >= 2) {
                ws.send(JSON.stringify({ type: "error", msg: "Sala cheia!" }));
                return;
            }

            ws.roomId = data.roomId;
            ws.playerName = data.name;

            room.players.push(ws);

            // Enviar nomes para os dois jogadores
            const names = room.players.map(p => p.playerName);

            room.players.forEach((p) => {
                p.send(JSON.stringify({
                    type: "players",
                    players: names
                }));
            });

            console.log("Jogador entrou na sala:", data.roomId);
            return;
        }

        // --------------------
        // Jogada
        // --------------------
        if (data.type === "move") {
            const room = rooms[data.roomId];
            if (!room) return;

            room.moves[data.name] = data.move;

            // se os dois jogaram, decide vencedor e envia
            if (Object.keys(room.moves).length === 2) {
                const players = room.players;
                const [p1, p2] = players;
                const name1 = p1.playerName;
                const name2 = p2.playerName;

                const m1 = room.moves[name1];
                const m2 = room.moves[name2];

                let winner = "";
                const rules = {
                    pedra: "tesoura",
                    papel: "pedra",
                    tesoura: "papel"
                };

                if (m1 === m2) winner = "Empate";
                else if (rules[m1] === m2) winner = name1;
                else winner = name2;

                // enviar para os dois
                players.forEach((p) => {
                    p.send(JSON.stringify({
                        type: "result",
                        p1: name1,
                        p2: name2,
                        move1: m1,
                        move2: m2,
                        winner
                    }));
                });

                // limpar para próxima rodada
                room.moves = {};
            }
        }
    });

    ws.on("close", () => {
        console.log("Cliente saiu.");
    });
});