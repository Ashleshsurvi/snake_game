import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Trophy, Settings, Volume2, VolumeX } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface GameState {
  snake: Position[];
  food: Position;
  direction: string;
  gameOver: boolean;
  paused: boolean;
  score: number;
  level: number;
  highScore: number;
  gameHistory: GameRecord[];
}

interface GameRecord {
  score: number;
  level: number;
  date: string;
  difficulty: string;
}

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_FOOD = { x: 15, y: 15 };

const DIFFICULTIES = {
  easy: { speed: 200, name: 'Easy', color: '#00ff41' },
  medium: { speed: 150, name: 'Medium', color: '#ffff00' },
  hard: { speed: 100, name: 'Hard', color: '#ff8000' },
  insane: { speed: 50, name: 'Insane', color: '#ff0080' }
};

const SnakeGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    snake: INITIAL_SNAKE,
    food: INITIAL_FOOD,
    direction: 'RIGHT',
    gameOver: false,
    paused: false,
    score: 0,
    level: 1,
    highScore: 0,
    gameHistory: []
  });

  const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTIES>('medium');
  const [gameStarted, setGameStarted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load game data from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem('snakeHighScore');
    const savedHistory = localStorage.getItem('snakeGameHistory');
    
    if (savedHighScore) {
      setGameState(prev => ({ ...prev, highScore: parseInt(savedHighScore) }));
    }
    
    if (savedHistory) {
      setGameState(prev => ({ ...prev, gameHistory: JSON.parse(savedHistory) }));
    }
  }, []);

  // Save game data to localStorage
  const saveGameData = useCallback((score: number, level: number) => {
    const newHighScore = Math.max(gameState.highScore, score);
    localStorage.setItem('snakeHighScore', newHighScore.toString());
    
    const newRecord: GameRecord = {
      score,
      level,
      date: new Date().toISOString().split('T')[0],
      difficulty: DIFFICULTIES[difficulty].name
    };
    
    const updatedHistory = [newRecord, ...gameState.gameHistory].slice(0, 10);
    localStorage.setItem('snakeGameHistory', JSON.stringify(updatedHistory));
    
    setGameState(prev => ({
      ...prev,
      highScore: newHighScore,
      gameHistory: updatedHistory
    }));
  }, [gameState.highScore, gameState.gameHistory, difficulty]);

  // Generate random food position
  const generateFood = useCallback((snake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState.gameOver || gameState.paused) return;

    setGameState(prev => {
      const newSnake = [...prev.snake];
      const head = { ...newSnake[0] };

      // Move head based on direction
      switch (prev.direction) {
        case 'UP':
          head.y -= 1;
          break;
        case 'DOWN':
          head.y += 1;
          break;
        case 'LEFT':
          head.x -= 1;
          break;
        case 'RIGHT':
          head.x += 1;
          break;
      }

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        saveGameData(prev.score, prev.level);
        return { ...prev, gameOver: true };
      }

      // Check self collision
      if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        saveGameData(prev.score, prev.level);
        return { ...prev, gameOver: true };
      }

      newSnake.unshift(head);

      // Check food collision
      let newFood = prev.food;
      let newScore = prev.score;
      let newLevel = prev.level;

      if (head.x === prev.food.x && head.y === prev.food.y) {
        newFood = generateFood(newSnake);
        newScore += 10;
        newLevel = Math.floor(newScore / 100) + 1;
        
        if (soundEnabled) {
          // Play eating sound effect (using Web Audio API)
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800;
          gainNode.gain.value = 0.1;
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
        }
      } else {
        newSnake.pop();
      }

      return {
        ...prev,
        snake: newSnake,
        food: newFood,
        score: newScore,
        level: newLevel
      };
    });
  }, [gameState.gameOver, gameState.paused, generateFood, saveGameData, soundEnabled]);

  // Start game loop
  useEffect(() => {
    if (gameStarted && !gameState.gameOver && !gameState.paused) {
      gameLoopRef.current = setInterval(gameLoop, DIFFICULTIES[difficulty].speed);
    } else if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameState.gameOver, gameState.paused, gameLoop, difficulty]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted || gameState.gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (gameState.direction !== 'DOWN') {
            setGameState(prev => ({ ...prev, direction: 'UP' }));
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (gameState.direction !== 'UP') {
            setGameState(prev => ({ ...prev, direction: 'DOWN' }));
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (gameState.direction !== 'RIGHT') {
            setGameState(prev => ({ ...prev, direction: 'LEFT' }));
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (gameState.direction !== 'LEFT') {
            setGameState(prev => ({ ...prev, direction: 'RIGHT' }));
          }
          break;
        case ' ':
          e.preventDefault();
          togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameState.direction, gameState.gameOver]);

  const startGame = () => {
    setGameState({
      snake: INITIAL_SNAKE,
      food: generateFood(INITIAL_SNAKE),
      direction: 'RIGHT',
      gameOver: false,
      paused: false,
      score: 0,
      level: 1,
      highScore: gameState.highScore,
      gameHistory: gameState.gameHistory
    });
    setGameStarted(true);
    setShowSettings(false);
  };

  const togglePause = () => {
    if (gameStarted && !gameState.gameOver) {
      setGameState(prev => ({ ...prev, paused: !prev.paused }));
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameState(prev => ({
      ...prev,
      snake: INITIAL_SNAKE,
      food: INITIAL_FOOD,
      direction: 'RIGHT',
      gameOver: false,
      paused: false,
      score: 0,
      level: 1
    }));
  };

  const renderGameBoard = () => {
    const cells = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isSnakeHead = gameState.snake[0]?.x === x && gameState.snake[0]?.y === y;
        const isSnakeBody = gameState.snake.slice(1).some(segment => segment.x === x && segment.y === y);
        const isFood = gameState.food.x === x && gameState.food.y === y;
        
        let cellClass = 'w-4 h-4 border border-cyan-800/20 ';
        
        if (isSnakeHead) {
          cellClass += 'bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/50 animate-pulse';
        } else if (isSnakeBody) {
          cellClass += 'bg-gradient-to-br from-cyan-500 to-cyan-700 shadow-md shadow-cyan-500/30';
        } else if (isFood) {
          cellClass += 'bg-gradient-to-br from-pink-400 to-pink-600 shadow-lg shadow-pink-500/50 animate-pulse rounded-full';
        } else {
          cellClass += 'bg-gray-900/20 hover:bg-gray-800/30 transition-colors';
        }
        
        cells.push(
          <div key={`${x}-${y}`} className={cellClass} />
        );
      }
    }
    return cells;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-cyan-900 flex flex-col items-center justify-center p-4">
      {/* Animated background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4 animate-pulse">
            NEON SNAKE
          </h1>
          <p className="text-cyan-300 text-lg">Classic Snake Game with Futuristic Vibes</p>
        </div>

        {/* Game Stats */}
        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{gameState.score}</div>
            <div className="text-sm text-cyan-300">Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{gameState.level}</div>
            <div className="text-sm text-purple-300">Level</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-400">{gameState.highScore}</div>
            <div className="text-sm text-pink-300">High Score</div>
          </div>
        </div>

        {/* Game Board */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="grid grid-cols-20 gap-0 p-4 bg-gray-900/50 rounded-lg border border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
              {renderGameBoard()}
            </div>
            
            {/* Game Over Overlay */}
            {gameState.gameOver && (
              <div className="absolute inset-0 bg-black/80 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-400 mb-2 animate-pulse">GAME OVER</div>
                  <div className="text-xl text-cyan-300 mb-4">Final Score: {gameState.score}</div>
                  <button
                    onClick={resetGame}
                    className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-cyan-500/25"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            )}

            {/* Pause Overlay */}
            {gameState.paused && !gameState.gameOver && (
              <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                <div className="text-4xl font-bold text-cyan-400 animate-pulse">PAUSED</div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mb-6">
          {!gameStarted ? (
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white px-8 py-4 rounded-lg font-semibold transition-all shadow-lg shadow-green-500/25 flex items-center gap-2"
            >
              <Play size={20} />
              Start Game
            </button>
          ) : (
            <button
              onClick={togglePause}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white px-8 py-4 rounded-lg font-semibold transition-all shadow-lg shadow-yellow-500/25 flex items-center gap-2"
            >
              {gameState.paused ? <Play size={20} /> : <Pause size={20} />}
              {gameState.paused ? 'Resume' : 'Pause'}
            </button>
          )}
          
          <button
            onClick={resetGame}
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white px-8 py-4 rounded-lg font-semibold transition-all shadow-lg shadow-red-500/25 flex items-center gap-2"
          >
            <RotateCcw size={20} />
            Reset
          </button>
        </div>

        {/* Settings and History */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2"
          >
            <Settings size={16} />
            Settings
          </button>
          
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2"
          >
            <Trophy size={16} />
            History
          </button>
          
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-gray-500/25 flex items-center gap-2"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            Sound
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-900/80 rounded-lg p-6 border border-cyan-500/30 shadow-2xl shadow-cyan-500/20 mb-6">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">Game Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-cyan-300 mb-2">Difficulty Level</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(DIFFICULTIES).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setDifficulty(key as keyof typeof DIFFICULTIES)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        difficulty === key
                          ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                      style={{ borderColor: config.color }}
                    >
                      {config.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="text-sm text-gray-400">
                <p><strong>Controls:</strong> Arrow Keys to move, Space to pause</p>
                <p><strong>Goal:</strong> Eat the pink food to grow and increase your score</p>
                <p><strong>Avoid:</strong> Walls and your own tail</p>
              </div>
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div className="bg-gray-900/80 rounded-lg p-6 border border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">Game History</h3>
            {gameState.gameHistory.length === 0 ? (
              <p className="text-gray-400">No games played yet!</p>
            ) : (
              <div className="space-y-2">
                {gameState.gameHistory.map((record, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-4">
                      <div className="text-cyan-400 font-bold">{record.score}</div>
                      <div className="text-purple-400">Level {record.level}</div>
                      <div className="text-pink-400">{record.difficulty}</div>
                    </div>
                    <div className="text-gray-400 text-sm">{record.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SnakeGame;