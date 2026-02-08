(() => {
  const BOARD_SIZE = 15;
  const BLACK = -1;
  const WHITE = 1;
  const EMPTY = 0;
  const DRAW = 2;

  const GRID_RATIO = 0.62;

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('status');
  const modeEl = document.getElementById('mode');
  const difficultyEl = document.getElementById('difficulty');
  const banHandEl = document.getElementById('banhand');
  const menuEl = document.getElementById('menu');
  const undoEl = document.getElementById('undo');
  const slotEl = document.getElementById('slot');
  const saveEl = document.getElementById('save');
  const loadEl = document.getElementById('load');

  const boardImg = loadImage('assets/qipan.jpg', draw);
  const winBlackImg = loadImage('assets/Blackwin.jpg');
  const winWhiteImg = loadImage('assets/Whitewin.jpg');
  const drawImg = loadImage('assets/Draw.jpg');

  let board = createBoard();
  let moveHistory = [];
  let moveCount = 0;
  let gameResult = 0; // 0 ongoing, -1 black win, 1 white win, 2 draw
  let lastMove = null;
  let aiThinking = false;

  let cellWidth = 0;
  let cellHeight = 0;
  let boardOffsetX = 0;
  let boardOffsetY = 0;
  let gridSize = 0;

  function loadImage(path, onload) {
    const img = new Image();
    img.src = path;
    if (onload) img.onload = onload;
    return img;
  }

  function createBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function resetGame() {
    board = createBoard();
    moveHistory = [];
    moveCount = 0;
    gameResult = 0;
    lastMove = null;
    aiThinking = false;
    setStatus('Ready');

    if (modeEl.value === 'playWhite') {
      placeStone(7, 7, BLACK, true);
      lastMove = { row: 7, col: 7 };
    }

    draw();
  }


  function placeStone(row, col, color, skipChecks = false) {
    if (board[row][col] !== EMPTY) return false;
    if (!skipChecks && banHandEl.checked && color === BLACK && AI.isFoulMove(row, col, board)) {
      alert('Forbidden move (Renju): Black cannot play overline/double-three/double-four.');
      return false;
    }

    board[row][col] = color;
    moveHistory.push({ color, row, col });
    moveCount++;
    lastMove = { row, col };
    checkGameEnd();
    return true;
  }

  function undoMoves(count) {
    if (moveCount < count) return;
    for (let i = 0; i < count; i++) {
      const stone = moveHistory.pop();
      if (!stone) break;
      board[stone.row][stone.col] = EMPTY;
      moveCount--;
    }
    gameResult = 0;
    lastMove = moveHistory.length ? moveHistory[moveHistory.length - 1] : null;
    draw();
  }

  function checkGameEnd() {
    const winner = checkWinner(board);
    if (winner !== EMPTY) {
      gameResult = winner;
      setStatus(winner === BLACK ? 'Black wins' : 'White wins');
      return;
    }
    if (moveCount >= BOARD_SIZE * BOARD_SIZE) {
      gameResult = DRAW;
      setStatus('Draw');
      return;
    }
    setStatus('Playing');
  }

  function checkWinner(b) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const color = b[r][c];
        if (color === EMPTY) continue;
        if (countConsecutive(b, r, c, 0, 1, color) >= 5) return color;
        if (countConsecutive(b, r, c, 1, 0, color) >= 5) return color;
        if (countConsecutive(b, r, c, 1, 1, color) >= 5) return color;
        if (countConsecutive(b, r, c, 1, -1, color) >= 5) return color;
      }
    }
    return EMPTY;
  }

  function countConsecutive(b, row, col, dr, dc, color) {
    let count = 1;
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && b[r][c] === color) {
      count++;
      r += dr;
      c += dc;
    }
    r = row - dr;
    c = col - dc;
    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && b[r][c] === color) {
      count++;
      r -= dr;
      c -= dc;
    }
    return count;
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (boardImg.complete) {
      ctx.drawImage(boardImg, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#f6ddad';
      ctx.fillRect(0, 0, width, height);
    }

    gridSize = Math.min(width, height) * GRID_RATIO;
    boardOffsetX = (width - gridSize) / 2;
    boardOffsetY = (height - gridSize) / 2;

    cellWidth = gridSize / (BOARD_SIZE - 1);
    cellHeight = gridSize / (BOARD_SIZE - 1);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
      const y = boardOffsetY + i * cellHeight;
      ctx.beginPath();
      ctx.moveTo(boardOffsetX, y);
      ctx.lineTo(boardOffsetX + gridSize, y);
      ctx.stroke();

      const x = boardOffsetX + i * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, boardOffsetY);
      ctx.lineTo(x, boardOffsetY + gridSize);
      ctx.stroke();
    }

    drawStones();

    if (gameResult === DRAW && drawImg.complete) {
      ctx.drawImage(drawImg, 0, 0, width, height);
    } else if (gameResult === BLACK && winBlackImg.complete) {
      ctx.drawImage(winBlackImg, 0, 0, width, height);
    } else if (gameResult === WHITE && winWhiteImg.complete) {
      ctx.drawImage(winWhiteImg, 0, 0, width, height);
    }
  }

  function drawStones() {
    const stoneSize = cellWidth * 0.75;

    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (board[i][j] === EMPTY) continue;
        const posX = boardOffsetX + i * cellWidth;
        const posY = boardOffsetY + j * cellHeight;

        let gradient;
        if (board[i][j] === WHITE) {
          gradient = ctx.createRadialGradient(posX, posY, 2, posX, posY, stoneSize);
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(1, '#e6d26a');
        } else {
          gradient = ctx.createRadialGradient(posX - stoneSize / 2, posY - stoneSize / 2, 2, posX, posY, stoneSize);
          gradient.addColorStop(0, '#3c5aa6');
          gradient.addColorStop(1, '#000000');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(posX, posY, stoneSize / 2, stoneSize / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (lastMove) {
      const posX = boardOffsetX + lastMove.row * cellWidth;
      const posY = boardOffsetY + lastMove.col * cellHeight;
      const markSize = Math.max(4, stoneSize * 0.2);
      ctx.fillStyle = '#d11616';
      ctx.beginPath();
      ctx.arc(posX, posY, markSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function findCellFromClick(x, y) {
    const fx = (x - boardOffsetX) / cellWidth;
    const fy = (y - boardOffsetY) / cellHeight;
    const row = Math.round(fx);
    const col = Math.round(fy);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;

    const gridX = boardOffsetX + row * cellWidth;
    const gridY = boardOffsetY + col * cellHeight;
    const dx = x - gridX;
    const dy = y - gridY;
    const maxDist = cellWidth * 0.55;
    if (dx * dx + dy * dy > maxDist * maxDist) return null;
    return { row, col };
  }

  function handleHumanMove(row, col) {
    if (gameResult !== 0 || aiThinking) return;

    if (modeEl.value === 'twoPlayer') {
      const color = (moveCount % 2 === 0) ? BLACK : WHITE;
      if (!placeStone(row, col, color)) return;
      draw();
      return;
    }

    const humanColor = modeEl.value === 'playBlack' ? BLACK : WHITE;
    if (!placeStone(row, col, humanColor)) return;
    draw();

    if (gameResult === 0) {
      startAIMove(humanColor);
    }
  }

  function startAIMove(humanColor) {
    aiThinking = true;
    setStatus('AI thinking...');

    setTimeout(() => {
      const ai = new AI(board, humanColor);
      ai.setDifficulty(Number(difficultyEl.value));
      const move = ai.getResult();
      if (move && gameResult === 0) {
        placeStone(move[0], move[1], -humanColor, true);
      }
      aiThinking = false;
      draw();
    }, 10);
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const cell = findCellFromClick(x, y);
    if (!cell) return;
    handleHumanMove(cell.row, cell.col);
  });

  window.addEventListener('resize', draw);
  menuEl.addEventListener('click', () => {
    window.location.href = '/gobang1/';
  });

  undoEl.addEventListener('click', () => {
    if (aiThinking) return;
    if (modeEl.value === 'twoPlayer') {
      undoMoves(1);
    } else {
      undoMoves(2);
    }
    draw();
  });

  saveEl.addEventListener('click', () => {
    const slot = slotEl.value;
    const data = {
      mode: modeEl.value,
      difficulty: Number(difficultyEl.value),
      banHand: banHandEl.checked,
      moves: moveHistory,
    };
    localStorage.setItem(`gobang_slot_${slot}`, JSON.stringify(data));
    setStatus(`Saved to Slot ${slot}`);
  });

  loadEl.addEventListener('click', () => {
    const slot = slotEl.value;
    const raw = localStorage.getItem(`gobang_slot_${slot}`);
    if (!raw) {
      alert('No save found in this slot.');
      return;
    }
    const data = JSON.parse(raw);
    modeEl.value = data.mode;
    difficultyEl.value = data.difficulty ?? 1;
    banHandEl.checked = data.banHand ?? true;

    board = createBoard();
    moveHistory = [];
    moveCount = 0;
    gameResult = 0;
    lastMove = null;

    for (const m of data.moves || []) {
      placeStone(m.row, m.col, m.color, true);
    }

    draw();
    setStatus(`Loaded from Slot ${slot}`);
  });

  modeEl.addEventListener('change', resetGame);
  difficultyEl.addEventListener('change', () => {
    if (modeEl.value === 'twoPlayer') return;
    setStatus(`AI Difficulty: ${difficultyName(Number(difficultyEl.value))}`);
  });

  function difficultyName(level) {
    return ['Easy', 'Medium', 'Hard'][level] || 'Medium';
  }

  // ===================== AI PORT =====================
  class AI {
    static BOARD_SIZE = 15;
    static BLACK = -1;
    static WHITE = 1;
    static EMPTY = 0;

    static DR = [0, 1, 1, 1];
    static DC = [1, 1, 0, -1];

    static difficulty = 1;
    static TIME_LIMITS_MS = [500, 1000, 2000];
    static MAX_DEPTHS = [3, 5, 7];
    static MAX_CANDIDATES = [10, 14, 20];

    static SCORE_WIN = 1_000_000_000;
    static SCORE_OPEN_FOUR = 10_000_000;
    static SCORE_FOUR = 1_000_000;
    static SCORE_OPEN_THREE = 100_000;
    static SCORE_THREE = 10_000;
    static SCORE_OPEN_TWO = 1_000;
    static SCORE_TWO = 100;
    static SCORE_NEIGHBOR = 5;

    static OPEN_FOUR_PATTERN = '011110';
    static OPEN_THREE_PATTERNS = ['01110', '010110', '011010'];

    static ZOBRIST = (() => {
      const z = Array.from({ length: BOARD_SIZE }, () =>
        Array.from({ length: BOARD_SIZE }, () => [rand64(), rand64()])
      );
      return z;
    })();

    static TT_MAX = 200000;

    constructor(boardState, playerColor) {
      if (playerColor !== BLACK && playerColor !== WHITE) {
        throw new Error('playerColor must be BLACK or WHITE');
      }
      this.board = createBoard();
      for (let r = 0; r < BOARD_SIZE; r++) {
        this.board[r] = boardState[r].slice();
      }
      this.aiColor = -playerColor;
      this.zobristKey = this.computeHash();
      this.stoneCount = this.computeStoneCount();

      this.rowScore = [Array(BOARD_SIZE).fill(0), Array(BOARD_SIZE).fill(0)];
      this.colScore = [Array(BOARD_SIZE).fill(0), Array(BOARD_SIZE).fill(0)];
      this.diag1Score = [Array(BOARD_SIZE * 2 - 1).fill(0), Array(BOARD_SIZE * 2 - 1).fill(0)];
      this.diag2Score = [Array(BOARD_SIZE * 2 - 1).fill(0), Array(BOARD_SIZE * 2 - 1).fill(0)];
      this.rebuildAllScores();

      this.tt = new Map();
      this.nodesEvaluated = 0;
      this.endTimeMs = 0;
      this.timeUp = false;
      this.lastRootScore = -Infinity;
    }

    setDifficulty(level) {
      AI.difficulty = Math.max(0, Math.min(2, level));
    }

    getResult() {
      this.nodesEvaluated = 0;
      const start = performance.now();
      this.endTimeMs = start + AI.TIME_LIMITS_MS[AI.difficulty];
      this.timeUp = false;

      if (this.isBoardEmpty()) {
        return [7, 7];
      }

      let bestMove = null;
      let bestScore = -Infinity;
      let preferredMove = null;

      for (let depth = 1; depth <= AI.MAX_DEPTHS[AI.difficulty]; depth++) {
        const move = this.findBestMove(depth, preferredMove);
        if (this.timeUp || !move) break;
        preferredMove = move;
        bestMove = move;
        bestScore = this.lastRootScore;
      }

      const elapsed = performance.now() - start;
      console.log(`AI ${AI.difficulty} evaluated ${this.nodesEvaluated} positions in ${elapsed.toFixed(0)}ms, score ${bestScore}`);

      return bestMove || [7, 7];
    }

    findBestMove(depth, preferredMove) {
      const tactical = this.findImmediateMove();
      if (tactical) return tactical;

      const candidates = this.getCandidateMoves(this.aiColor, AI.MAX_CANDIDATES[AI.difficulty], preferredMove);
      if (!candidates.length) return null;

      let bestScore = -Infinity;
      let bestMove = null;
      let alpha = -1e15;
      let beta = 1e15;

      for (const move of candidates) {
        if (this.isTimeUp()) break;
        const [r, c] = move;

        if (this.aiColor === BLACK && this.isFoulMoveInternal(r, c)) continue;

        this.makeMove(r, c, this.aiColor);
        const score = -this.alphaBeta(-this.aiColor, depth - 1, -beta, -alpha);
        this.undoMove(r, c, this.aiColor);

        if (score > bestScore) {
          bestScore = score;
          bestMove = [r, c];
        }

        if (score > alpha) alpha = score;
        if (alpha >= beta) break;
      }

      this.lastRootScore = bestScore;
      return bestMove;
    }

    alphaBeta(color, depth, alpha, beta) {
      if (this.isTimeUp()) return this.evaluate(color);
      this.nodesEvaluated++;

      const winner = this.checkWinner();
      if (winner !== EMPTY) {
        return winner === color ? AI.SCORE_WIN : -AI.SCORE_WIN;
      }

      if (depth <= 0) return this.evaluate(color);

      const key = this.zobristKey ^ (color === BLACK ? 1n : 2n);
      const entry = this.tt.get(key);
      if (entry && entry.depth >= depth) {
        if (entry.flag === 0) return entry.value;
        if (entry.flag === 1 && entry.value > alpha) alpha = entry.value;
        if (entry.flag === -1 && entry.value < beta) beta = entry.value;
        if (alpha >= beta) return entry.value;
      }

      const alpha0 = alpha;
      const candidates = this.getCandidateMoves(color, AI.MAX_CANDIDATES[AI.difficulty], entry ? entry.bestMove : null);
      if (!candidates.length) return this.evaluate(color);

      let bestScore = -1e15;
      let bestMove = null;

      for (const move of candidates) {
        if (this.isTimeUp()) break;
        const [r, c] = move;

        if (color === BLACK && this.isFoulMoveInternal(r, c)) continue;

        this.makeMove(r, c, color);
        const score = -this.alphaBeta(-color, depth - 1, -beta, -alpha);
        this.undoMove(r, c, color);

        if (score > bestScore) {
          bestScore = score;
          bestMove = [r, c];
        }

        if (score > alpha) alpha = score;
        if (alpha >= beta) break;
      }

      let flag = 0;
      if (bestScore <= alpha0) flag = -1;
      else if (bestScore >= beta) flag = 1;

      if (this.tt.size > AI.TT_MAX) this.tt.clear();
      if (bestMove) this.tt.set(key, { value: bestScore, depth, flag, bestMove });

      return bestScore;
    }

    findImmediateMove() {
      let blockWin = null;
      let win = null;
      let openFour = null;
      let blockOpenFour = null;
      let doubleThreat = null;
      let blockDoubleThreat = null;

      const neighborDist = Math.max(2, this.getNeighborDistance());

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (this.board[r][c] !== EMPTY || !this.hasNeighbor(r, c, neighborDist)) continue;
          if (this.aiColor === BLACK && this.isFoulMoveInternal(r, c)) continue;

          this.board[r][c] = this.aiColor;
          if (this.isWinningPosition(r, c, this.aiColor)) {
            win = [r, c];
          } else {
            const tc = this.getThreatCount(r, c, this.aiColor);
            if (tc.openFour > 0) openFour = [r, c];
            if (tc.isDoubleThreat()) doubleThreat = [r, c];
          }
          this.board[r][c] = EMPTY;

          this.board[r][c] = -this.aiColor;
          if (this.isWinningPosition(r, c, -this.aiColor)) {
            blockWin = [r, c];
          } else {
            const otc = this.getThreatCount(r, c, -this.aiColor);
            if (otc.openFour > 0) blockOpenFour = [r, c];
            if (otc.isDoubleThreat()) blockDoubleThreat = [r, c];
          }
          this.board[r][c] = EMPTY;
        }
      }

      if (win) return win;
      if (blockWin) return blockWin;
      if (openFour) return openFour;
      if (blockOpenFour) return blockOpenFour;
      if (blockDoubleThreat) return blockDoubleThreat;
      if (doubleThreat) return doubleThreat;
      return null;
    }

    getCandidateMoves(color, maxCandidates, preferredMove) {
      const moves = [];
      const neighborDist = this.getNeighborDistance();

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (this.board[r][c] !== EMPTY) continue;
          if (!this.hasNeighbor(r, c, neighborDist)) continue;
          const score = this.quickScore(r, c, color);
          moves.push({ r, c, score });
        }
      }

      moves.sort((a, b) => b.score - a.score);

      if (preferredMove) {
        const idx = moves.findIndex(m => m.r === preferredMove[0] && m.c === preferredMove[1]);
        if (idx > 0) {
          const tmp = moves[0];
          moves[0] = moves[idx];
          moves[idx] = tmp;
        }
      }

      return moves.slice(0, maxCandidates).map(m => [m.r, m.c]);
    }

    quickScore(row, col, color) {
      let score = 0;

      this.board[row][col] = color;
      if (this.isWinningPosition(row, col, color)) {
        this.board[row][col] = EMPTY;
        return AI.SCORE_WIN;
      }
      const tc = this.getThreatCount(row, col, color);
      score += tc.openFour * AI.SCORE_OPEN_FOUR;
      score += tc.four * AI.SCORE_FOUR;
      score += tc.openThree * AI.SCORE_OPEN_THREE;
      this.board[row][col] = EMPTY;

      this.board[row][col] = -color;
      if (this.isWinningPosition(row, col, -color)) {
        this.board[row][col] = EMPTY;
        return AI.SCORE_WIN - 1;
      }
      const otc = this.getThreatCount(row, col, -color);
      score += otc.openFour * AI.SCORE_OPEN_FOUR;
      score += otc.four * AI.SCORE_FOUR;
      score += otc.openThree * AI.SCORE_OPEN_THREE;
      this.board[row][col] = EMPTY;

      const centerDist = Math.abs(row - 7) + Math.abs(col - 7);
      score += (14 - centerDist) * 3;
      return score;
    }

    hasNeighbor(row, col, dist) {
      const r0 = Math.max(0, row - dist);
      const r1 = Math.min(BOARD_SIZE - 1, row + dist);
      const c0 = Math.max(0, col - dist);
      const c1 = Math.min(BOARD_SIZE - 1, col + dist);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          if (this.board[r][c] !== EMPTY) return true;
        }
      }
      return false;
    }

    getNeighborDistance() {
      if (this.stoneCount < 6) return 1;
      if (this.stoneCount < 20) return 2;
      return 3;
    }

    isBoardEmpty() {
      return this.stoneCount === 0;
    }

    evaluate(color) {
      const myScore = this.evaluateLines(color);
      const oppScore = this.evaluateLines(-color);
      return myScore - oppScore * 1.1;
    }

    evaluateLines(color) {
      const idx = this.colorIndex(color);
      let score = 0;
      for (let r = 0; r < BOARD_SIZE; r++) score += this.rowScore[idx][r];
      for (let c = 0; c < BOARD_SIZE; c++) score += this.colScore[idx][c];
      for (let k = 0; k < BOARD_SIZE * 2 - 1; k++) score += this.diag1Score[idx][k];
      for (let k = 0; k < BOARD_SIZE * 2 - 1; k++) score += this.diag2Score[idx][k];
      return score;
    }

    scoreLine(line) {
      let s = 0;
      s += countPattern(line, '11111') * AI.SCORE_WIN;
      s += countPattern(line, '011110') * AI.SCORE_OPEN_FOUR;
      s += (countPattern(line, '211110') + countPattern(line, '011112')) * AI.SCORE_FOUR;
      s += countPattern(line, '01110') * AI.SCORE_OPEN_THREE;
      s += (countPattern(line, '010110') + countPattern(line, '011010')) * AI.SCORE_OPEN_THREE;
      s += (countPattern(line, '001110') + countPattern(line, '011100')) * AI.SCORE_THREE;
      s += (countPattern(line, '00110') + countPattern(line, '01100')) * AI.SCORE_OPEN_TWO;
      s += (countPattern(line, '01010') + countPattern(line, '010010')) * AI.SCORE_TWO;
      s += countPattern(line, '010') * AI.SCORE_NEIGHBOR;
      return s;
    }

    buildLineStringRow(row, color) {
      let s = '';
      for (let c = 0; c < BOARD_SIZE; c++) s += this.cellToChar(this.board[row][c], color);
      return s;
    }

    buildLineStringCol(col, color) {
      let s = '';
      for (let r = 0; r < BOARD_SIZE; r++) s += this.cellToChar(this.board[r][col], color);
      return s;
    }

    buildLineStringDiag1(k, color) {
      let s = '';
      for (let r = 0; r < BOARD_SIZE; r++) {
        const c = k - r;
        if (c >= 0 && c < BOARD_SIZE) s += this.cellToChar(this.board[r][c], color);
      }
      return s;
    }

    buildLineStringDiag2(k, color) {
      let s = '';
      for (let r = 0; r < BOARD_SIZE; r++) {
        const c = r - k;
        if (c >= 0 && c < BOARD_SIZE) s += this.cellToChar(this.board[r][c], color);
      }
      return s;
    }

    cellToChar(cell, color) {
      if (cell === color) return '1';
      if (cell === EMPTY) return '0';
      return '2';
    }

    getThreatCount(row, col, color) {
      const tc = { openFour: 0, four: 0, openThree: 0, isDoubleThreat() {
        if (this.openFour >= 1) return true;
        if (this.four >= 2) return true;
        if (this.four >= 1 && this.openThree >= 1) return true;
        if (this.openThree >= 2) return true;
        return false;
      }};

      for (let dir = 0; dir < 4; dir++) {
        const line = buildLine(row, col, dir, this.board, color, 4);
        if (containsPatternWithCenter(line, AI.OPEN_FOUR_PATTERN, 4)) tc.openFour++;
        if (hasFourInLine(line, 4)) tc.four++;
        if (hasOpenThreeStatic(line, 4)) tc.openThree++;
      }
      return tc;
    }

    isWinningPosition(row, col, color) {
      for (let dir = 0; dir < 4; dir++) {
        if (countConsecutive2(row, col, dir, this.board, color) >= 5) return true;
      }
      return false;
    }

    checkWinner() {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const color = this.board[r][c];
          if (color === EMPTY) continue;
          for (let dir = 0; dir < 4; dir++) {
            const count = countConsecutive2(r, c, dir, this.board, color);
            if (count >= 5) {
              if (color === BLACK && count > 5) continue;
              return color;
            }
          }
        }
      }
      return EMPTY;
    }

    isFoulMoveInternal(row, col) {
      if (this.board[row][col] !== EMPTY) return true;
      this.board[row][col] = BLACK;

      let win = false;
      for (let dir = 0; dir < 4; dir++) {
        const count = countConsecutive2(row, col, dir, this.board, BLACK);
        if (count === 5) { win = true; break; }
      }

      let foul;
      if (!win) {
        foul = checkOverline(row, col, this.board) ||
               checkDoubleFour(row, col, this.board) ||
               checkDoubleThree(row, col, this.board);
      } else {
        foul = checkOverline(row, col, this.board);
      }

      this.board[row][col] = EMPTY;
      return foul;
    }

    makeMove(row, col, color) {
      this.board[row][col] = color;
      this.zobristKey ^= AI.ZOBRIST[row][col][color === BLACK ? 0 : 1];
      this.stoneCount++;
      this.updateLineScores(row, col);
    }

    undoMove(row, col, color) {
      this.board[row][col] = EMPTY;
      this.zobristKey ^= AI.ZOBRIST[row][col][color === BLACK ? 0 : 1];
      this.stoneCount--;
      this.updateLineScores(row, col);
    }

    computeHash() {
      let h = 0n;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const v = this.board[r][c];
          if (v === BLACK) h ^= AI.ZOBRIST[r][c][0];
          else if (v === WHITE) h ^= AI.ZOBRIST[r][c][1];
        }
      }
      return h;
    }

    computeStoneCount() {
      let count = 0;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (this.board[r][c] !== EMPTY) count++;
        }
      }
      return count;
    }

    colorIndex(color) {
      return color === BLACK ? 0 : 1;
    }

    rebuildAllScores() {
      for (const color of [BLACK, WHITE]) {
        const idx = this.colorIndex(color);
        for (let r = 0; r < BOARD_SIZE; r++) {
          this.rowScore[idx][r] = this.scoreLine(this.buildLineStringRow(r, color));
        }
        for (let c = 0; c < BOARD_SIZE; c++) {
          this.colScore[idx][c] = this.scoreLine(this.buildLineStringCol(c, color));
        }
        for (let k = 0; k <= (BOARD_SIZE - 1) * 2; k++) {
          const line = this.buildLineStringDiag1(k, color);
          this.diag1Score[idx][k] = line.length >= 5 ? this.scoreLine(line) : 0;
        }
        for (let k = -(BOARD_SIZE - 1); k <= BOARD_SIZE - 1; k++) {
          const line = this.buildLineStringDiag2(k, color);
          const idx2 = k + (BOARD_SIZE - 1);
          this.diag2Score[idx][idx2] = line.length >= 5 ? this.scoreLine(line) : 0;
        }
      }
    }

    updateLineScores(row, col) {
      const diag1 = row + col;
      const diag2 = row - col + (BOARD_SIZE - 1);
      for (const color of [BLACK, WHITE]) {
        const idx = this.colorIndex(color);
        this.rowScore[idx][row] = this.scoreLine(this.buildLineStringRow(row, color));
        this.colScore[idx][col] = this.scoreLine(this.buildLineStringCol(col, color));
        const line1 = this.buildLineStringDiag1(diag1, color);
        this.diag1Score[idx][diag1] = line1.length >= 5 ? this.scoreLine(line1) : 0;
        const line2 = this.buildLineStringDiag2(row - col, color);
        this.diag2Score[idx][diag2] = line2.length >= 5 ? this.scoreLine(line2) : 0;
      }
    }

    isTimeUp() {
      if (!this.timeUp && performance.now() >= this.endTimeMs) this.timeUp = true;
      return this.timeUp;
    }

    static isFoulMove(row, col, boardState) {
      if (boardState[row][col] !== EMPTY) return true;
      boardState[row][col] = BLACK;

      let win = false;
      for (let dir = 0; dir < 4; dir++) {
        const count = countConsecutive2(row, col, dir, boardState, BLACK);
        if (count === 5) { win = true; break; }
      }

      let foul;
      if (!win) {
        foul = checkOverline(row, col, boardState) ||
               checkDoubleFour(row, col, boardState) ||
               checkDoubleThree(row, col, boardState);
      } else {
        foul = checkOverline(row, col, boardState);
      }

      boardState[row][col] = EMPTY;
      return foul;
    }
  }

  function rand64() {
    const hi = BigInt(Math.floor(Math.random() * 0xffffffff));
    const lo = BigInt(Math.floor(Math.random() * 0xffffffff));
    return (hi << 32n) ^ lo;
  }

  function countPattern(line, pattern) {
    let count = 0;
    let idx = line.indexOf(pattern);
    while (idx !== -1) {
      count++;
      idx = line.indexOf(pattern, idx + 1);
    }
    return count;
  }

  function buildLine(row, col, dir, boardState, color, range) {
    const len = range * 2 + 1;
    const line = new Array(len);
    const center = range;
    for (let i = -range; i <= range; i++) {
      const r = row + i * AI.DR[dir];
      const c = col + i * AI.DC[dir];
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
        line[center + i] = '2';
      } else {
        const v = boardState[r][c];
        if (v === color) line[center + i] = '1';
        else if (v === EMPTY) line[center + i] = '0';
        else line[center + i] = '2';
      }
    }
    return line;
  }

  function hasFourInLine(line, centerIdx) {
    for (let start = 0; start <= line.length - 5; start++) {
      const end = start + 4;
      if (centerIdx < start || centerIdx > end) continue;
      let stones = 0;
      let empties = 0;
      let blocked = false;
      for (let i = start; i <= end; i++) {
        if (line[i] === '1') stones++;
        else if (line[i] === '0') empties++;
        else blocked = true;
      }
      if (!blocked && stones === 4 && empties === 1) return true;
    }
    return false;
  }

  function containsPatternWithCenter(line, pattern, centerIdx) {
    const s = line.join('');
    let idx = s.indexOf(pattern);
    while (idx !== -1) {
      const end = idx + pattern.length - 1;
      if (centerIdx >= idx && centerIdx <= end && line[centerIdx] === '1') return true;
      idx = s.indexOf(pattern, idx + 1);
    }
    return false;
  }

  function hasOpenThreeStatic(line, centerIdx) {
    const s = line.join('');
    for (const p of AI.OPEN_THREE_PATTERNS) {
      let idx = s.indexOf(p);
      while (idx !== -1) {
        const end = idx + p.length - 1;
        if (centerIdx >= idx && centerIdx <= end && line[centerIdx] === '1') return true;
        idx = s.indexOf(p, idx + 1);
      }
    }
    return false;
  }

  function countConsecutive2(row, col, dir, boardState, color) {
    let count = 1;
    let r = row + AI.DR[dir];
    let c = col + AI.DC[dir];
    while (isValid(r, c) && boardState[r][c] === color) {
      count++;
      r += AI.DR[dir];
      c += AI.DC[dir];
    }
    r = row - AI.DR[dir];
    c = col - AI.DC[dir];
    while (isValid(r, c) && boardState[r][c] === color) {
      count++;
      r -= AI.DR[dir];
      c -= AI.DC[dir];
    }
    return count;
  }

  function isValid(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  function checkOverline(row, col, boardState) {
    for (let dir = 0; dir < 4; dir++) {
      if (countConsecutive2(row, col, dir, boardState, BLACK) > 5) return true;
    }
    return false;
  }

  function checkDoubleFour(row, col, boardState) {
    let count = 0;
    for (let dir = 0; dir < 4; dir++) {
      const line = buildLine(row, col, dir, boardState, BLACK, 4);
      if (hasFourInLine(line, 4)) count++;
    }
    return count >= 2;
  }

  function checkDoubleThree(row, col, boardState) {
    let count = 0;
    for (let dir = 0; dir < 4; dir++) {
      const line = buildLine(row, col, dir, boardState, BLACK, 4);
      if (hasOpenThreeStatic(line, 4)) count++;
    }
    return count >= 2;
  }

  function initFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || 'playBlack';
    const difficulty = Number(params.get('difficulty') || 1);
    modeEl.value = mode;
    difficultyEl.value = String(difficulty);
    modeEl.disabled = true;
    difficultyEl.disabled = true;
  }

  initFromQuery();
  resetGame();
})();
