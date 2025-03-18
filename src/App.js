import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [deckId, setDeckId] = useState(null);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [gameState, setGameState] = useState('idle'); // idle, playing, playerBust, dealerBust, playerWin, dealerWin, push
  const [message, setMessage] = useState('Welcome to Blackjack!');

  // Wrap dealCard in useCallback to avoid dependency issues
  const dealCard = useCallback(async (target) => {
    try {
      const response = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=1`);
      const data = await response.json();
      
      if (data.success) {
        const card = data.cards[0];
        if (target === 'player') {
          setPlayerHand(prevHand => [...prevHand, card]);
        } else {
          setDealerHand(prevHand => [...prevHand, card]);
        }
      } else {
        // If we run out of cards, get a new deck
        if (data.remaining === 0) {
          await fetchNewDeck();
          setMessage('New deck shuffled.');
        } else {
          setMessage('Error drawing card. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error dealing card:', error);
      setMessage('Error dealing card. Please try again.');
    }
  }, [deckId]);

  // Initialize a new deck when the component mounts
  useEffect(() => {
    fetchNewDeck();
  }, []);

  // Calculate score whenever hands change
  useEffect(() => {
    if (playerHand.length > 0) {
      const score = calculateScore(playerHand);
      setPlayerScore(score);
      
      if (score > 21 && gameState === 'playing') {
        setGameState('playerBust');
        setMessage('Bust! You went over 21.');
      }
    }
  }, [playerHand, gameState]);

  useEffect(() => {
    if (dealerHand.length > 0) {
      const score = calculateScore(dealerHand);
      setDealerScore(score);
      
      if (score > 21 && gameState === 'dealerTurn') {
        setGameState('dealerBust');
        setMessage('Dealer busts! You win!');
      } else if (gameState === 'dealerTurn' && score >= 17) {
        // Dealer stands on 17 or higher
        determineWinner(playerScore, score);
      }
    }
  }, [dealerHand, gameState, playerScore]);

  // Continue dealer's turn if needed
  useEffect(() => {
    if (gameState === 'dealerTurn' && dealerScore < 17) {
      // Dealer hits until 17 or higher
      const timeout = setTimeout(() => {
        dealCard('dealer');
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [dealerScore, gameState, dealCard]);

  const fetchNewDeck = async () => {
    try {
      const response = await fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
      const data = await response.json();
      setDeckId(data.deck_id);
    } catch (error) {
      console.error('Error fetching deck:', error);
      setMessage('Error fetching deck. Please try again.');
    }
  };

  const startNewGame = async () => {
    // Reset game state
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerScore(0);
    setDealerScore(0);
    setGameState('playing');
    setMessage('Game started! Your turn.');
    
    // Shuffle the deck
    try {
      await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/shuffle/`);
      
      // Deal initial cards
      dealInitialCards();
    } catch (error) {
      console.error('Error shuffling deck:', error);
      setMessage('Error shuffling deck. Please try again.');
    }
  };

  const dealInitialCards = async () => {
    // Deal 2 cards to player and dealer
    try {
      const response = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=4`);
      const data = await response.json();
      
      if (data.success) {
        const cards = data.cards;
        setPlayerHand([cards[0], cards[2]]);
        setDealerHand([cards[1], cards[3]]);
      } else {
        setMessage('Error dealing cards. Please try again.');
      }
    } catch (error) {
      console.error('Error dealing initial cards:', error);
      setMessage('Error dealing cards. Please try again.');
    }
  };

  const handleHit = () => {
    if (gameState === 'playing') {
      dealCard('player');
    }
  };

  const handleStand = () => {
    if (gameState === 'playing') {
      setGameState('dealerTurn');
      setMessage("Dealer's turn.");
    }
  };

  const calculateScore = (hand) => {
    let score = 0;
    let aces = 0;
    
    hand.forEach(card => {
      if (card.value === 'ACE') {
        aces += 1;
        score += 11;
      } else if (['KING', 'QUEEN', 'JACK'].includes(card.value)) {
        score += 10;
      } else {
        score += parseInt(card.value);
      }
    });
    
    // Adjust for aces
    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }
    
    return score;
  };

  const determineWinner = (playerScore, dealerScore) => {
    if (playerScore > dealerScore) {
      setGameState('playerWin');
      setMessage('You win!');
    } else if (dealerScore > playerScore) {
      setGameState('dealerWin');
      setMessage('Dealer wins!');
    } else {
      setGameState('push');
      setMessage("It's a push (tie)!");
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Kartenspili Blackjack</h1>
        <div className="game-container">
          <div className="message-box">
            <p>{message}</p>
            <p>Player Score: {playerScore} | Dealer Score: {gameState === 'playing' ? '?' : dealerScore}</p>
          </div>
          
          <div className="dealer-hand">
            <h2>Dealer's Hand</h2>
            <div className="cards">
              {dealerHand.map((card, index) => (
                <div key={index} className="card">
                  {/* Hide dealer's second card until player stands */}
                  {index === 1 && gameState === 'playing' ? (
                    <div className="card-back"></div>
                  ) : (
                    <>
                      <img src={card.image} alt={`${card.value} of ${card.suit}`} />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="player-hand">
            <h2>Your Hand</h2>
            <div className="cards">
              {playerHand.map((card, index) => (
                <div key={index} className="card">
                  <img src={card.image} alt={`${card.value} of ${card.suit}`} />
                </div>
              ))}
            </div>
          </div>
          
          <div className="controls">
            {gameState === 'idle' || ['playerBust', 'dealerBust', 'playerWin', 'dealerWin', 'push'].includes(gameState) ? (
              <button onClick={startNewGame}>New Game</button>
            ) : (
              <>
                <button onClick={handleHit} disabled={gameState !== 'playing'}>Hit</button>
                <button onClick={handleStand} disabled={gameState !== 'playing'}>Stand</button>
              </>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;