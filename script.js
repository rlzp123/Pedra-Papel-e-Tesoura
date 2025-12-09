let ws = null;
let myName = "";
let roomId = "";

function connect(callback) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        callback();
        return;
    }

    ws = new WebSocket("ws://localhost:3000");

    ws.onopen = () => {
        console.log("WS conectado");
        callback();
    };

    ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        console.log("Recebido:", data);

        // Sala criada
        if (data.type === "roomCreated") {
            roomId = data.roomId;
            document.getElementById("roomCode").innerText = "ID da Sala: " + roomId;
            showGame();
        }

        // Jogadores conectados
        if (data.type === "players") {
            document.getElementById("players").innerText =
                data.players.join(" vs ");
            showGame();
        }

        // Resultado final
        if (data.type === "result") {
            const text = `
${data.p1} jogou ${data.move1}
${data.p2} jogou ${data.move2}

${data.winner === "Empate" ? "EMPATE!" : "Vencedor: " + data.winner}
`;
            document.getElementById("result").innerText = text;
        }

        if (data.type === "error") {
            alert(data.msg);
        }
    };
}

function createRoom() {
    myName = document.getElementById("playerName").value.trim();
    if (!myName) return alert("Digite seu nome!");

    connect(() => {
        ws.send(JSON.stringify({
            type: "createRoom",
            name: myName
        }));
    });
}

function joinRoom() {
    myName = document.getElementById("playerName").value.trim();
    roomId = document.getElementById("roomInput").value.trim();

    if (!myName || !roomId) {
        return alert("Preencha tudo!");
    }

    connect(() => {
        ws.send(JSON.stringify({
            type: "joinRoom",
            name: myName,
            roomId
        }));
    });
}

function sendMove(move) {
    ws.send(JSON.stringify({
        type: "move",
        name: myName,
        roomId,
        move
    }));

    document.getElementById("result").innerText =
        "Esperando jogada do outro jogador...";
}

function showGame() {
    document.getElementById("gameArea").classList.remove("hidden");
}