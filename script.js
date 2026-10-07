document.addEventListener("DOMContentLoaded", () => {
    const IMAGE_SETS = [
        "yisang.png", "faust.png", "don.png", "ryoshu.png", "meursault.png",
        "honglu.png", "heathcliff.png", "ishmael.png", "rodion.png", "dante.png", "sinclair.png",
        "outis.png", "gregor.png"
    ];

    const MAX_GUESSES = 6;
    const ROW_LENGTH = 8;

    const now = new Date();
    const dateKey = `limbusle_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    function getSeededRandom(seedStr) {
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) {
            hash = (hash << 5) - hash + seedStr.charCodeAt(i);
            hash |= 0;
        }
        return function() {
            let t = hash += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const rng = getSeededRandom(dateKey);
    const TARGET_SEQUENCE = Array.from({ length: ROW_LENGTH }, () => 
        Math.floor(rng() * IMAGE_SETS.length)
    );

    let currentGuess = [];
    let attemptsCount = 0;
    let matchOver = false;
    let historyEmojis = [];
    let savedGuesses = []; // Stores indices of guesses made today

    const board = document.getElementById("board");
    const imageDeck = document.getElementById("image-deck");
    const message = document.getElementById("message");
    const submitBtn = document.getElementById("btn-submit");
    const backBtn = document.getElementById("btn-back");

    const shareModal = document.getElementById("share-modal");
    const shareText = document.getElementById("share-text");
    const modalTitle = document.getElementById("modal-title");
    const copyBtn = document.getElementById("btn-copy");
    const closeBtn = document.getElementById("btn-close");

    for (let i = 0; i < MAX_GUESSES; i++) {
        const row = document.createElement("div");
        row.className = "row";
        for (let j = 0; j < ROW_LENGTH; j++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            row.appendChild(tile);
        }
        board.appendChild(row);
    }

    IMAGE_SETS.forEach((imgUrl, index) => {
        const item = document.createElement("div");
        item.className = "deck-item";
        item.innerHTML = `<img src="${imgUrl}" alt="Item ${index}">`;
        item.onclick = () => addImageToGuess(index);
        imageDeck.appendChild(item);
    });

    if (backBtn) backBtn.onclick = removeLastImage;
    if (submitBtn) submitBtn.onclick = verifySequence;
    if (closeBtn) closeBtn.onclick = () => shareModal.classList.add("hidden");

    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(shareText.textContent).then(() => {
                copyBtn.textContent = "COPIED!";
                setTimeout(() => copyBtn.textContent = "COPY RESULT", 2000);
            });
        };
    }

    loadSavedProgress();

    function addImageToGuess(index) {
        if (matchOver || currentGuess.length >= ROW_LENGTH) return;
        currentGuess.push(index);
        refreshActiveRowUI();
    }

    function removeLastImage() {
        if (matchOver || currentGuess.length === 0) return;
        currentGuess.pop();
        refreshActiveRowUI();
    }

    function refreshActiveRowUI() {
        if (matchOver) return;
        const row = board.children[attemptsCount];
        if (!row) return;

        for (let i = 0; i < ROW_LENGTH; i++) {
            const tile = row.children[i];
            tile.innerHTML = "";
            if (currentGuess[i] !== undefined) {
                tile.innerHTML = `<img src="${IMAGE_SETS[currentGuess[i]]}" alt="Tile content">`;
            }
        }

        if (submitBtn) {
            if (currentGuess.length === ROW_LENGTH) {
                submitBtn.classList.add("btn-ready");
            } else {
                submitBtn.classList.remove("btn-ready");
            }
        }
    }

    function verifySequence() {
        if (matchOver) return;
        if (currentGuess.length < ROW_LENGTH) {
            message.textContent = `Fill all ${ROW_LENGTH} grid blocks first!`;
            return;
        }

        processGuess(currentGuess);
    }

function processGuess(guessArray) {
        if (submitBtn) submitBtn.classList.remove("btn-ready");

        const row = board.children[attemptsCount];
        let remainingTarget = [...TARGET_SEQUENCE];
        let flags = Array(ROW_LENGTH).fill("absent");

        // Pass 1: Exact matches
        for (let i = 0; i < ROW_LENGTH; i++) {
            if (guessArray[i] === TARGET_SEQUENCE[i]) {
                flags[i] = "correct";
                remainingTarget[i] = null;
            }
        }

        // Pass 2: Present elsewhere
        for (let i = 0; i < ROW_LENGTH; i++) {
            if (flags[i] === "correct") continue;
            const targetIdx = remainingTarget.indexOf(guessArray[i]);
            if (targetIdx !== -1) {
                flags[i] = "present";
                remainingTarget[targetIdx] = null;
            }
        }

        // Render images on committed row
        for (let i = 0; i < ROW_LENGTH; i++) {
            row.children[i].innerHTML = `<img src="${IMAGE_SETS[guessArray[i]]}" alt="Tile content">`;
            row.children[i].classList.add(flags[i]);
        }

        // Add to history emojis
        const emojiRow = flags.map(f => (f === "correct" ? "🟩" : f === "present" ? "🟨" : "⬛")).join("");
        historyEmojis.push(emojiRow);

        // Save progress to LocalStorage
        savedGuesses.push(guessArray);
        localStorage.setItem(dateKey, JSON.stringify(savedGuesses));

        const isWin = flags.every(f => f === "correct");
        attemptsCount++;

        if (isWin || attemptsCount >= MAX_GUESSES) {
            matchOver = true;
            const attemptsText = isWin ? `${attemptsCount}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`
            setTimeout(() => showShareModal(attemptsText, isWin), 800);d
        } else {
            currentGuess = [];
            message.textContent = "";
        }
    }

    function loadSavedProgress() {
        const savedData = localStorage.getItem(dateKey);
        if (!savedData) return;

        const previousGuesses = JSON.parse(savedData);
        previousGuesses.forEach(guess => {
            processGuess(guess);
        });
    }

    function showShareModal(attemptsText, isWin) {
        const today = new Date().toLocaleDateString("en-US");
        if (!isWin) {
            const targetNames = TARGET_SEQUENCE.map(idx => {
                const file = IMAGE_SETS[idx].replace(".png", "");
                return file.charAt(0).toUpperCase() + file.slice(1);
            }).join(" > ");
        }

        const formattedShare = `Limbusle ${attemptsText}\n${today}\n\n${historyEmojis.join("\n")}`;
        modalTitle.textContent = isWin ? "how wild" : "Fate Larped.";
        shareText.textContent = formattedShare;
        shareModal.classList.remove("hidden");
    }
});