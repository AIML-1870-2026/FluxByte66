'use strict';

// ===================== CONSTANTS =====================
const SUITS = ['♠','♥','♦','♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const SUIT_NAMES = { '♠':'spades','♥':'hearts','♦':'diamonds','♣':'clubs' };
const RED_SUITS = new Set(['♥','♦']);
const CHIP_DENOMS = [500,100,25,5];
const LS = {
  BALANCE: 'bj_session_balance',
  SETTINGS: 'bj_settings',
  THEME: 'bj_table_theme',
  HISTORY: 'bj_hand_history',
};

// ===================== STATE =====================
const G = {
  state: 'IDLE',
  shoe: [],
  shoeTotalCards: 0,
  playerHands: [[]],
  dealerHand: [],
  currentHandIndex: 0,
  bets: [0],
  bet: 0,
  insuranceBet: 0,
  previousBet: 0,
  balance: 1000,
  roundNum: 0,
  soft17Hit: false,
  insuranceTimeout: null,
  insuranceInterval: null,
  pendingDeckChange: null,
  isSplit: false,
  splitAces: false,
  dealerRevealed: false,
  stats: { wins:0, losses:0, pushes:0, netPL:0, streak:0, streakType:null },
  history: [],
  settings: { decks:6, animSpeed:1, particles:true },
  particles: [],
  particleRAF: null,
};

// ===================== DECK =====================
function buildShoe(numDecks) {
  const shoe = [];
  for (let d = 0; d < numDecks; d++)
    for (const suit of SUITS)
      for (const rank of RANKS)
        shoe.push({ rank, suit });
  return shuffle(shoe);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function dealCard() {
  if (G.shoe.length === 0) reshoeNow();
  return G.shoe.pop();
}

function reshoeNow() {
  const n = G.pendingDeckChange || G.settings.decks;
  G.settings.decks = n;
  G.pendingDeckChange = null;
  G.shoe = buildShoe(n);
  G.shoeTotalCards = G.shoe.length;
  updateShoeIndicator();
  toast('Shoe reshuffled.');
  hideDeckBanner();
}

function checkReshuffle() {
  const pct = G.shoe.length / G.shoeTotalCards;
  if (pct <= 0.1) {
    toast('Shoe running low — reshuffling after this hand.');
    el('shoeBar').classList.add('low');
  }
}

// ===================== CARD VALUE =====================
function cardValue(rank) {
  if (rank === 'A') return 11;
  if (['J','Q','K'].includes(rank)) return 10;
  return parseInt(rank);
}

function handTotal(hand) {
  let total = 0, aces = 0;
  for (const c of hand) {
    total += cardValue(c.rank);
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function isSoft(hand) {
  let total = 0, aces = 0;
  for (const c of hand) {
    total += cardValue(c.rank);
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return aces > 0 && total <= 21;
}

function isBlackjack(hand) {
  return hand.length === 2 && handTotal(hand) === 21;
}

function totalLabel(hand) {
  const t = handTotal(hand);
  if (hand.some(c => c.rank === 'A') && isSoft(hand)) {
    const hard = t - 10;
    return `Soft ${t}`;
  }
  return String(t);
}

// ===================== DOM HELPERS =====================
function el(id) { return document.getElementById(id); }

function show(id) { const e = el(id); if (e) e.style.display = ''; }
function hide(id) { const e = el(id); if (e) e.style.display = 'none'; }
function showEl(e) { if (e) e.style.display = ''; }
function hideEl(e) { if (e) e.style.display = 'none'; }

function setAnim(mult) {
  document.documentElement.style.setProperty('--anim-mult', mult);
}

// ===================== CARD RENDERING =====================
function createCardEl(card, faceDown = false) {
  const wrap = document.createElement('div');
  wrap.className = 'card-wrap dealing';
  wrap.style.setProperty('--tx', `${(Math.random()-0.5)*40}px`);
  wrap.style.setProperty('--ty', '-60px');

  const inner = document.createElement('div');
  inner.className = 'card-inner' + (faceDown ? ' flipped' : '');

  // Face
  const face = document.createElement('div');
  const isRed = RED_SUITS.has(card.suit);
  face.className = 'card-face ' + (isRed ? 'red-suit' : 'black-suit');

  const topCorner = document.createElement('div');
  topCorner.className = 'card-corner-top';
  topCorner.innerHTML = `<span class="card-rank">${card.rank}</span><span class="card-suit-small">${card.suit}</span>`;

  const center = document.createElement('div');
  center.className = 'card-center-suit';
  center.textContent = card.suit;

  const botCorner = document.createElement('div');
  botCorner.className = 'card-corner-bot';
  botCorner.innerHTML = `<span class="card-rank">${card.rank}</span><span class="card-suit-small">${card.suit}</span>`;

  face.appendChild(topCorner);
  face.appendChild(center);
  face.appendChild(botCorner);

  // Back
  const back = document.createElement('div');
  back.className = 'card-back';

  inner.appendChild(face);
  inner.appendChild(back);
  wrap.appendChild(inner);
  return wrap;
}

function flipCard(wrap) {
  const inner = wrap.querySelector('.card-inner');
  inner.classList.toggle('flipped');
}

// ===================== TOAST =====================
function toast(msg, duration = 2500) {
  const container = el('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('exiting');
    setTimeout(() => t.remove(), 400);
  }, duration);
}

// ===================== SHOE INDICATOR =====================
function updateShoeIndicator() {
  const pct = G.shoeTotalCards > 0 ? G.shoe.length / G.shoeTotalCards : 1;
  el('shoeBar').style.width = (pct * 100) + '%';
  const n = G.settings.decks;
  el('shoeLabel').textContent = `Shoe: ${n} Deck${n>1?'s':''}`;
  const bar = el('shoeBar');
  if (pct <= 0.1) bar.classList.add('low');
  else bar.classList.remove('low');
}

function hideDeckBanner() { hide('deckBanner'); }
function showDeckBanner() { show('deckBanner'); }

// ===================== SIDEBAR =====================
function updateSidebar() {
  el('sideBalance').textContent = fmt(G.balance);
  const totalBet = G.bets.reduce((a,b)=>a+b,0) + (G.bet || 0);
  const betDisplay = G.isSplit
    ? `${fmt(G.bets[0])} / ${fmt(G.bets[1])}`
    : fmt(G.bet);
  el('sideBet').textContent = betDisplay;

  const { wins, losses, pushes, netPL, streak, streakType } = G.stats;
  el('statWins').textContent = wins;
  el('statLosses').textContent = losses;
  el('statPushes').textContent = pushes;

  const plEl = el('statNetPL');
  plEl.textContent = (netPL >= 0 ? '+' : '') + fmt(netPL);
  plEl.className = 'stat-val ' + (netPL > 0 ? 'positive' : netPL < 0 ? 'negative' : '');

  const total = wins + losses;
  el('statWinRate').textContent = total > 0 ? Math.round(wins/total*100) + '%' : '—';

  let streakStr = '—';
  if (streak > 0 && streakType) {
    streakStr = streakType.toUpperCase() + streak;
    if (streakType === 'W' && streak >= 3) streakStr += ' 🔥';
    if (streakType === 'L' && streak >= 3) streakStr += ' 🧊';
  }
  el('statStreak').textContent = streakStr;
}

function fmt(n) {
  return '$' + Math.abs(n).toLocaleString('en-US');
}

function addHistory(entry) {
  G.history.unshift(entry);
  try { sessionStorage.setItem(LS.HISTORY, JSON.stringify(G.history)); } catch(e){}
  renderHistory();
}

function renderHistory() {
  const list = el('historyList');
  list.innerHTML = '';
  for (const h of G.history) {
    const row = document.createElement('div');
    row.className = 'history-entry';

    const isWin = h.plClass === 'win';
    const isLoss = h.plClass === 'loss';
    const isSplitH = h.type === 'split';

    row.innerHTML = `
      <span class="he-round">#${h.round}</span>
      <span class="he-outcome ${h.plClass}${isSplitH?' split':''}">${h.outcome}</span>
      <span class="he-pl ${h.pl >= 0 ? 'positive' : 'negative'}">${h.pl >= 0 ? '+':'-'}${fmt(Math.abs(h.pl))}</span>
      <span class="he-summary">${h.summary}</span>
    `;
    list.appendChild(row);
  }
}

// ===================== CHIP STACK DISPLAY =====================
function renderBetStacks() {
  renderOneStack(G.bets[0], 'chipStack0', 'betLabel0', 'Bet');
  if (G.isSplit) {
    show('betStack1');
    renderOneStack(G.bets[1], 'chipStack1', 'betLabel1', 'Hand 2');
  } else {
    hide('betStack1');
  }
}

function renderOneStack(amount, stackId, labelId, prefix) {
  const stack = el(stackId);
  stack.innerHTML = '';
  let rem = amount;
  for (const d of CHIP_DENOMS) {
    while (rem >= d) {
      const chip = document.createElement('div');
      chip.className = `stacked-chip c${d}`;
      chip.textContent = d >= 100 ? `$${d}` : '';
      stack.appendChild(chip);
      rem -= d;
    }
  }
  el(labelId).textContent = `${prefix}: ${fmt(amount)}`;
}

// ===================== HAND TOTAL DISPLAY =====================
function updateHandTotal(handIndex, hand, hide_dealer = false) {
  const totalEl = el(`playerTotal${handIndex}`);
  if (!totalEl) return;
  const t = handTotal(hand);
  let label = totalLabel(hand);
  totalEl.textContent = label;
  totalEl.className = 'hand-total' + (t > 21 ? ' bust' : isBlackjack(hand) ? ' blackjack' : '');
}

function updateDealerTotal(revealAll = false) {
  const hand = G.dealerHand;
  const dealerTotalEl = el('dealerTotal');
  if (!revealAll) {
    const visibleCards = hand.filter((_,i) => i !== 1);
    const t = handTotal(visibleCards);
    dealerTotalEl.textContent = visibleCards.length > 0 ? String(t) : '';
  } else {
    const t = handTotal(hand);
    dealerTotalEl.textContent = totalLabel(hand);
    dealerTotalEl.className = 'hand-total dealer-total' + (t > 21 ? ' bust' : '');
  }
}

// ===================== DEAL ANIMATION HELPERS =====================
function ms(base) { return base * G.settings.animSpeed; }

function sleep(t) { return new Promise(r => setTimeout(r, t)); }

async function dealCardTo(hand, row, faceDown = false, handIndex = null) {
  const card = dealCard();
  hand.push(card);
  const cardEl = createCardEl(card, faceDown);
  row.appendChild(cardEl);
  await sleep(ms(320 + 80));
  if (handIndex !== null) updateHandTotal(handIndex, hand);
  checkReshuffle();
  updateShoeIndicator();
  return card;
}

// ===================== GAME ACTIONS =====================
async function startDeal() {
  if (G.bet < 5) return;
  if (G.state !== 'BETTING' && G.state !== 'IDLE') return;

  G.roundNum++;
  G.state = 'DEALING';
  G.isSplit = false;
  G.splitAces = false;
  G.dealerRevealed = false;
  G.playerHands = [[]];
  G.dealerHand = [];
  G.insuranceBet = 0;
  G.bets = [G.bet];
  G.currentHandIndex = 0;

  // Check reshuffle
  const threshold = G.shoeTotalCards * 0.5;
  if (G.shoe.length <= G.shoeTotalCards - threshold || G.shoe.length < 10) {
    if (G.pendingDeckChange) {
      G.settings.decks = G.pendingDeckChange;
      G.pendingDeckChange = null;
    }
    G.shoe = buildShoe(G.settings.decks);
    G.shoeTotalCards = G.shoe.length;
    toast('Shoe reshuffled.');
    hideDeckBanner();
    updateShoeIndicator();
  }

  // Roll soft 17 rule
  G.soft17Hit = Math.random() < 0.5;
  el('soft17Badge').textContent = `S17: ${G.soft17Hit ? 'Hit' : 'Stand'}`;

  // Clear table
  el('dealerCards').innerHTML = '';
  el('playerCards0').innerHTML = '';
  el('playerCards1').innerHTML = '';
  el('playerTotal0').textContent = '';
  el('playerTotal1').textContent = '';
  el('dealerTotal').textContent = '';
  el('handBetLabel0').textContent = '';
  el('handBetLabel1').textContent = '';

  // Reset split UI
  el('hand1').style.display = 'none';
  el('hand0').className = 'hand-container active-hand';
  el('splitHands').style.gap = '20px';

  renderBetStacks();
  hideButtons();
  hide('btnNext');
  hide('btnRebet');
  hide('deckBanner');

  updateSidebar();
  hideResultOverlay();

  // Deal sequence
  await dealCardTo(G.playerHands[0], el('playerCards0'), false, 0);
  await sleep(ms(120));
  await dealCardTo(G.dealerHand, el('dealerCards'), false);
  updateDealerTotal(false);
  await sleep(ms(120));
  await dealCardTo(G.playerHands[0], el('playerCards0'), false, 0);
  await sleep(ms(120));
  await dealCardTo(G.dealerHand, el('dealerCards'), true); // hole card
  updateDealerTotal(false);

  // Check natural blackjack
  const playerBJ = isBlackjack(G.playerHands[0]);
  const dealerFaceUp = G.dealerHand[0];

  if (playerBJ) {
    G.state = 'NATURAL_BLACKJACK';
    await revealHoleCard();
    const dealerBJ = isBlackjack(G.dealerHand);
    if (dealerBJ) {
      await resolveRound([{ outcome:'PUSH', hand:G.playerHands[0] }]);
    } else {
      await resolveRound([{ outcome:'BLACKJACK_WIN', hand:G.playerHands[0] }]);
    }
    return;
  }

  // Insurance offer?
  if (dealerFaceUp.rank === 'A') {
    await offerInsurance();
    return;
  }

  G.state = 'PLAYER_TURN';
  showActionButtons();
}

async function offerInsurance() {
  G.state = 'INSURANCE_OFFER';
  const halfBet = Math.floor(G.bets[0] / 2 / 5) * 5;
  show('btnInsurance');
  show('btnDecline');
  show('insuranceTimer');

  let count = 10;
  const circumference = 100;
  const timerRing = el('timerRing');
  timerRing.style.strokeDashoffset = 0;
  el('timerCount').textContent = count;

  G.insuranceInterval = setInterval(() => {
    count--;
    el('timerCount').textContent = count;
    const offset = circumference - (count / 10) * circumference;
    timerRing.style.strokeDashoffset = offset;
    if (count <= 3) timerRing.classList.add('urgent');
    if (count <= 0) {
      clearInterval(G.insuranceInterval);
      G.insuranceInterval = null;
      declineInsurance(true);
    }
  }, 1000);
}

function clearInsuranceTimer() {
  if (G.insuranceInterval) { clearInterval(G.insuranceInterval); G.insuranceInterval = null; }
  hide('insuranceTimer');
  hide('btnInsurance');
  hide('btnDecline');
  el('timerRing').classList.remove('urgent');
}

async function takeInsurance() {
  clearInsuranceTimer();
  const halfBet = Math.floor(G.bets[0] / 2 / 5) * 5;
  if (halfBet < 5) { toast('Minimum insurance bet is $5.'); return; }
  G.insuranceBet = halfBet;
  G.balance -= halfBet;
  toast(`Insurance placed: ${fmt(halfBet)}`);
  updateSidebar();
  await resolveInsurance();
}

async function declineInsurance(timeout = false) {
  clearInsuranceTimer();
  if (timeout) toast('Insurance declined (timeout).');
  await resolveInsurance(false);
}

async function resolveInsurance(tookInsurance = null) {
  // Check if dealer has blackjack
  const dealerBJ = isBlackjack(G.dealerHand);
  if (tookInsurance === null) tookInsurance = G.insuranceBet > 0;

  if (dealerBJ) {
    await revealHoleCard();
    if (tookInsurance) {
      const ins_pay = G.insuranceBet * 2;
      G.balance += ins_pay + G.insuranceBet;
      toast('Insurance saved you! Dealer has blackjack.');
    } else {
      toast('Dealer has blackjack!');
    }
    await resolveRound([{ outcome:'LOSS', hand:G.playerHands[0] }]);
    return;
  }

  // No dealer BJ
  if (tookInsurance && G.insuranceBet > 0) {
    toast('Dealer has no blackjack. Insurance lost.');
    // insurance already deducted
  }

  G.state = 'PLAYER_TURN';
  showActionButtons();
}

async function playerHit() {
  if (G.state !== 'PLAYER_TURN' && G.state !== 'SPLIT_TURN') return;
  const hi = G.currentHandIndex;
  const row = el(`playerCards${hi}`);
  await dealCardTo(G.playerHands[hi], row, false, hi);
  const t = handTotal(G.playerHands[hi]);
  if (t > 21) {
    updateHandTotal(hi, G.playerHands[hi]);
    await sleep(ms(200));
    if (G.isSplit) {
      await advanceSplitHand();
    } else {
      await resolveRound([{ outcome:'BUST', hand:G.playerHands[hi] }]);
    }
    return;
  }
  updateHandTotal(hi, G.playerHands[hi]);
  showActionButtons();
}

async function playerStand() {
  if (G.state !== 'PLAYER_TURN' && G.state !== 'SPLIT_TURN') return;
  hideButtons();
  if (G.isSplit) {
    await advanceSplitHand();
  } else {
    await dealerTurn();
  }
}

async function playerDouble() {
  if (G.state !== 'PLAYER_TURN' && G.state !== 'SPLIT_TURN') return;
  const hi = G.currentHandIndex;
  if (G.balance < G.bets[hi]) { toast('Insufficient balance to double.'); return; }
  G.balance -= G.bets[hi];
  G.bets[hi] *= 2;
  renderBetStacks();
  updateSidebar();
  hideButtons();
  const row = el(`playerCards${hi}`);
  await dealCardTo(G.playerHands[hi], row, false, hi);
  const t = handTotal(G.playerHands[hi]);
  if (t > 21) {
    if (G.isSplit) { await advanceSplitHand(); return; }
    await resolveRound([{ outcome:'BUST', hand:G.playerHands[hi] }]);
    return;
  }
  if (G.isSplit) { await advanceSplitHand(); return; }
  await dealerTurn();
}

async function playerSplit() {
  if (G.state !== 'PLAYER_TURN') return;
  const hand = G.playerHands[0];
  if (hand.length !== 2 || hand[0].rank !== hand[1].rank) return;
  if (G.balance < G.bets[0]) { toast('Insufficient balance to split.'); return; }

  G.balance -= G.bets[0];
  G.isSplit = true;
  G.splitAces = hand[0].rank === 'A';
  G.state = 'SPLIT_TURN';
  G.currentHandIndex = 0;

  // Move second card to hand 1
  const card2 = G.playerHands[0].pop();
  G.playerHands[1] = [card2];
  G.bets[1] = G.bets[0];

  hideButtons();
  updateSidebar();

  // Show split layout
  el('hand1').style.display = '';
  el('playerCards1').innerHTML = '';

  // Move card from hand0 display to hand1 display
  const hand0Row = el('playerCards0');
  const hand1Row = el('playerCards1');
  const allCards = hand0Row.querySelectorAll('.card-wrap');
  if (allCards.length >= 2) {
    const movedCard = allCards[allCards.length - 1];
    hand0Row.removeChild(movedCard);
    movedCard.classList.remove('dealing');
    hand1Row.appendChild(movedCard);
  }

  // Show Hand 1 active
  el('hand0').className = 'hand-container active-hand split-active';
  el('hand1').className = 'hand-container';

  updateHandTotal(0, G.playerHands[0]);
  updateHandTotal(1, G.playerHands[1]);
  renderBetStacks();

  await sleep(ms(350));

  // Deal one card to hand 0
  await dealCardTo(G.playerHands[0], hand0Row, false, 0);

  if (G.splitAces) {
    // Deal one card to hand 1, then go to dealer
    await dealCardTo(G.playerHands[1], hand1Row, false, 1);
    await sleep(ms(300));
    await dealerTurn();
    return;
  }

  showActionButtons();
}

async function advanceSplitHand() {
  if (G.currentHandIndex === 0) {
    // Move to hand 1
    G.currentHandIndex = 1;
    el('hand0').className = 'hand-container';
    el('hand1').className = 'hand-container active-hand split-active';

    const hand1Row = el('playerCards1');
    await dealCardTo(G.playerHands[1], hand1Row, false, 1);

    if (G.splitAces) {
      await dealerTurn();
      return;
    }

    showActionButtons();
  } else {
    // Both hands done, dealer turn
    el('hand1').className = 'hand-container';
    await dealerTurn();
  }
}

async function playerSurrender() {
  if (G.state !== 'PLAYER_TURN') return;
  hideButtons();
  const half = Math.floor(G.bets[0] / 2);
  G.balance += half;
  G.bets[0] = half;
  updateSidebar();
  const ploss = -half;
  G.stats.netPL += ploss;
  G.stats.losses++;
  updateStreak('L');
  addHistory({
    round: G.roundNum, outcome:'SURR', plClass:'loss', pl: ploss,
    summary: `${handTotal(G.playerHands[0])} surrendered`, type:'standard'
  });
  updateSidebar();
  showResultOverlay('Surrendered', 'push', fmt(half) + ' returned');
  scheduleNext();
}

// ===================== DEALER TURN =====================
async function dealerTurn() {
  G.state = 'DEALER_TURN';
  await revealHoleCard();
  await sleep(ms(400));

  // Dealer does not play if all non-split hands busted
  const activePlayers = G.playerHands.filter(h => handTotal(h) <= 21);
  if (activePlayers.length === 0) {
    await resolveAllHands();
    return;
  }

  // Dealer draws
  const dealerRow = el('dealerCards');
  while (true) {
    const t = handTotal(G.dealerHand);
    const soft = isSoft(G.dealerHand);
    if (t < 17) {
      await sleep(ms(600));
      await dealCardTo(G.dealerHand, dealerRow, false);
      updateDealerTotal(true);
    } else if (t === 17 && soft && G.soft17Hit) {
      await sleep(ms(600));
      await dealCardTo(G.dealerHand, dealerRow, false);
      updateDealerTotal(true);
    } else {
      break;
    }
  }

  await resolveAllHands();
}

async function revealHoleCard() {
  if (G.dealerRevealed) return;
  G.dealerRevealed = true;
  const dealerRow = el('dealerCards');
  const cards = dealerRow.querySelectorAll('.card-wrap');
  if (cards.length >= 2) {
    const holeCard = cards[1];
    // Replace with correct face
    const card = G.dealerHand[1];
    const newCardEl = createCardEl(card, false);
    newCardEl.classList.remove('dealing');
    dealerRow.replaceChild(newCardEl, holeCard);
  }
  updateDealerTotal(true);
  await sleep(ms(300));
}

// ===================== RESOLUTION =====================
async function resolveAllHands() {
  const dealerT = handTotal(G.dealerHand);
  const dealerBust = dealerT > 21;

  if (G.isSplit) {
    const results = [];
    for (let i = 0; i < 2; i++) {
      const pT = handTotal(G.playerHands[i]);
      const pBust = pT > 21;
      let outcome;
      if (pBust) outcome = 'BUST';
      else if (dealerBust) outcome = 'DEALER_BUST';
      else if (pT > dealerT) outcome = 'WIN';
      else if (pT < dealerT) outcome = 'LOSS';
      else outcome = 'PUSH';
      results.push({ outcome, hand: G.playerHands[i], handIndex: i });
    }
    await resolveRound(results);
  } else {
    const pT = handTotal(G.playerHands[0]);
    const pBust = pT > 21;
    let outcome;
    if (pBust) outcome = 'BUST';
    else if (dealerBust) outcome = 'DEALER_BUST';
    else if (pT > dealerT) outcome = 'WIN';
    else if (pT < dealerT) outcome = 'LOSS';
    else outcome = 'PUSH';
    await resolveRound([{ outcome, hand: G.playerHands[0] }]);
  }
}

async function resolveRound(results) {
  G.state = 'RESOLUTION';
  hideButtons();

  let totalPL = 0;
  let overallClass = 'push';
  let overallText = 'Push';
  let overallSub = '';

  if (G.isSplit && results.length === 2) {
    const r0 = results[0], r1 = results[1];
    const [pl0, text0, cls0] = calcOutcome(r0.outcome, G.bets[0]);
    const [pl1, text1, cls1] = calcOutcome(r1.outcome, G.bets[1]);
    totalPL = pl0 + pl1;

    G.balance += G.bets[0] + pl0 + G.bets[0] * (pl0 > 0 ? 1 : 0);
    G.balance += G.bets[1] + pl1 + G.bets[1] * (pl1 > 0 ? 1 : 0);
    // Simpler: just add the net
    // Actually recalc properly:
    G.balance -= (G.bets[0] + G.bets[1]); // already deducted at split time; re-add base
    // Let's just use pl directly
    G.balance = G.balance; // already handled
    // Reset and redo balance properly:
    // At split: balance was already debited bets[0]*2. So now add back winnings:
    if (pl0 > 0) G.balance += G.bets[0] * 2; // return bet + win
    else if (pl0 === 0) G.balance += G.bets[0]; // push return
    if (pl1 > 0) G.balance += G.bets[1] * 2;
    else if (pl1 === 0) G.balance += G.bets[1];

    // Determine display
    const bothWin = (cls0 === 'win' && cls1 === 'win');
    const bothLoss = (cls0 === 'loss' && cls1 === 'loss');
    const mixedWP = (cls0 === 'win' || cls1 === 'win') && (cls0 === 'push' || cls1 === 'push');

    if (bothWin) { overallText = 'Both Hands Win!'; overallClass = 'win'; }
    else if (bothLoss) { overallText = 'Both Hands Lost'; overallClass = 'loss'; }
    else if (mixedWP) { overallText = 'Split: Win & Push'; overallClass = 'win'; }
    else { overallText = 'Split: Win & Loss'; overallClass = 'push'; }

    overallSub = (totalPL >= 0 ? '+' : '') + fmt(Math.abs(totalPL));

    // Glow each hand
    applyHandGlow(0, cls0);
    applyHandGlow(1, cls1);
    if (cls0 === 'win' || cls1 === 'win') triggerParticles();

    G.stats.netPL += totalPL;
    if (totalPL > 0) { G.stats.wins++; updateStreak('W'); }
    else if (totalPL < 0) { G.stats.losses++; updateStreak('L'); }
    else { G.stats.pushes++; updateStreak(null); }

    const pT0 = handTotal(G.playerHands[0]);
    const pT1 = handTotal(G.playerHands[1]);
    const dealerT = handTotal(G.dealerHand);
    addHistory({
      round: G.roundNum,
      outcome: overallText.startsWith('Both Hands Win') ? 'SP W/W' : totalPL > 0 ? 'SP W/L' : totalPL < 0 ? 'SP L/L' : 'SP W/L',
      plClass: totalPL > 0 ? 'win' : totalPL < 0 ? 'loss' : 'push',
      pl: totalPL,
      summary: `(${pT0},${pT1}) vs ${dealerT}`,
      type: 'split'
    });

  } else {
    const r = results[0];
    const [pl, text, cls] = calcOutcome(r.outcome, G.bets[0]);

    // Update balance
    if (pl > 0) G.balance += G.bets[0] + pl; // return stake + winnings
    else if (pl === 0) G.balance += G.bets[0]; // push: return stake
    // loss: stake already deducted

    totalPL = pl;
    overallText = text;
    overallClass = cls;

    if (r.outcome === 'BLACKJACK_WIN') {
      const bjPay = Math.floor(G.bets[0] * 1.5);
      G.balance -= G.bets[0] + pl; // undo above
      G.balance += G.bets[0] + bjPay; // re-add with 3:2
      totalPL = bjPay;
      overallSub = `+${fmt(bjPay)} (3:2)`;
    } else {
      overallSub = (pl >= 0 ? (pl === 0 ? 'Bet returned' : '+') : '-') + (pl !== 0 ? fmt(Math.abs(pl)) : '');
    }

    // Apply glow to player zone
    const playerZone = el('playerZone');
    playerZone.classList.remove('win-glow','loss-glow','push-glow');
    void playerZone.offsetWidth;
    if (cls === 'win') { playerZone.classList.add('win-glow'); if (r.outcome === 'BLACKJACK_WIN') triggerParticles(true); else triggerParticles(); }
    else if (cls === 'loss') playerZone.classList.add('loss-glow');
    else playerZone.classList.add('push-glow');

    G.stats.netPL += totalPL;
    if (cls === 'win') { G.stats.wins++; updateStreak('W'); }
    else if (cls === 'loss') { G.stats.losses++; updateStreak('L'); }
    else { G.stats.pushes++; updateStreak(null); }

    const pT = handTotal(G.playerHands[0]);
    const dealerT = handTotal(G.dealerHand);
    const outKey = { WIN:'WIN', LOSS:'LOSS', BUST:'BUST', PUSH:'PUSH', BLACKJACK_WIN:'BJ', DEALER_BUST:'WIN', SURRENDER:'SURR' };
    addHistory({
      round: G.roundNum,
      outcome: outKey[r.outcome] || r.outcome,
      plClass: cls,
      pl: totalPL,
      summary: r.outcome === 'BUST' ? `${pT} bust` : `${pT} vs ${dealerT}`,
      type: 'standard'
    });
  }

  updateSidebar();
  showResultOverlay(overallText, overallClass, overallSub);

  await sleep(ms(1500));
  show('btnNext');

  if (G.balance <= 0) {
    await sleep(ms(500));
    showNoChipsModal();
  }
}

function calcOutcome(outcome, bet) {
  switch(outcome) {
    case 'WIN': case 'DEALER_BUST': return [bet, outcome === 'DEALER_BUST' ? 'Dealer Busts!' : 'You Win!', 'win'];
    case 'BLACKJACK_WIN': return [Math.floor(bet*1.5), 'Blackjack! 🂡', 'win'];
    case 'LOSS': case 'BUST': return [-bet, outcome === 'BUST' ? 'Bust!' : 'Dealer Wins', 'loss'];
    case 'PUSH': return [0, 'Push', 'push'];
    default: return [0, outcome, 'push'];
  }
}

function applyHandGlow(handIndex, cls) {
  const hEl = el(`hand${handIndex}`);
  hEl.classList.remove('win-hand','loss-hand','push-hand');
  void hEl.offsetWidth;
  if (cls === 'win') hEl.classList.add('win-hand');
  else if (cls === 'loss') hEl.classList.add('loss-hand');
  else hEl.classList.add('push-hand');
}

// ===================== RESULT OVERLAY =====================
function showResultOverlay(text, cls, sub) {
  const overlay = el('resultOverlay');
  el('resultText').textContent = text;
  el('resultText').className = 'result-text ' + cls;
  el('resultAmount').textContent = sub;
  overlay.style.display = '';
  overlay.addEventListener('click', hideResultOverlay, { once:true });
}

function hideResultOverlay() {
  const overlay = el('resultOverlay');
  overlay.style.display = 'none';
}

function scheduleNext() {
  setTimeout(() => show('btnNext'), ms(1500));
}

// ===================== NEXT HAND / RESET =====================
function nextHand() {
  hide('btnNext');
  hideResultOverlay();

  // Clear glows
  const pz = el('playerZone');
  pz.classList.remove('win-glow','loss-glow','push-glow');
  el('hand0').classList.remove('win-hand','loss-hand','push-hand','split-active');
  el('hand1').classList.remove('win-hand','loss-hand','push-hand','split-active');

  G.state = 'IDLE';
  G.bet = 0;
  G.bets = [0];
  G.isSplit = false;

  if (G.pendingDeckChange) showDeckBanner();

  renderBetStacks();
  updateSidebar();
  updateShoeIndicator();
  show('btnRebet');
  el('btnDeal').disabled = true;

  // Show chip selector
  el('bettingArea').style.display = '';
}

// ===================== BETTING =====================
function addChip(value) {
  if (G.state !== 'IDLE' && G.state !== 'BETTING') return;
  if (G.bet + value > G.balance) {
    const chip = document.querySelector(`.chip[data-value="${value}"]`);
    chip.classList.remove('shake');
    void chip.offsetWidth;
    chip.classList.add('shake');
    toast('Not enough chips.');
    return;
  }
  G.bet += value;
  G.bets = [G.bet];
  G.state = 'BETTING';
  renderBetStacks();
  updateSidebar();
  el('btnDeal').disabled = G.bet < 5;
}

function clearBet() {
  G.balance += G.bet;
  // Note: bet wasn't deducted yet from balance on chip click;
  // chips just accumulate. Balance is debited on Deal.
  // Correction: track it properly.
  G.bet = 0;
  G.bets = [0];
  G.state = 'IDLE';
  renderBetStacks();
  updateSidebar();
  el('btnDeal').disabled = true;
}

function rebet() {
  if (G.previousBet <= 0) return;
  if (G.previousBet > G.balance) { toast('Insufficient balance to rebet.'); return; }
  G.bet = G.previousBet;
  G.bets = [G.bet];
  G.state = 'BETTING';
  renderBetStacks();
  updateSidebar();
  el('btnDeal').disabled = false;
}

// ===================== ACTION BUTTONS =====================
function hideButtons() {
  ['btnHit','btnStand','btnDouble','btnSplit','btnSurrender','btnInsurance','btnDecline'].forEach(hide);
}

function showActionButtons() {
  const hi = G.currentHandIndex;
  const hand = G.playerHands[hi];
  const isFirstTwo = hand.length === 2;
  const isSplitAceHand = G.splitAces;
  const bet = G.bets[hi];

  show('btnHit');
  show('btnStand');

  if (!isSplitAceHand) {
    if (isFirstTwo && G.balance >= bet) el('btnDouble').style.display = '';
    else hide('btnDouble');
  } else {
    hide('btnHit');
    hide('btnDouble');
  }

  // Split: only on first hand, not yet split, identical ranks, first two cards
  if (!G.isSplit && isFirstTwo && hand[0].rank === hand[1].rank && G.balance >= bet) {
    show('btnSplit');
  } else {
    hide('btnSplit');
  }

  // Surrender: first two cards, before any split, not after insurance resolution
  if (!G.isSplit && isFirstTwo && G.state === 'PLAYER_TURN') {
    show('btnSurrender');
  } else {
    hide('btnSurrender');
  }
}

// ===================== STREAK =====================
function updateStreak(type) {
  if (!type) { G.stats.streak = 0; G.stats.streakType = null; return; }
  if (type === G.stats.streakType) G.stats.streak++;
  else { G.stats.streak = 1; G.stats.streakType = type; }
}

// ===================== PARTICLES =====================
function triggerParticles(blackjack = false) {
  if (!G.settings.particles) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = el('particleCanvas');
  const rect = el('tableArea').getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const cx = rect.width / 2;
  const cy = rect.height * 0.55;
  const count = blackjack ? 80 : 40;
  const colors = ['#c9a84c','#e8d48b','#f5e9a0','#ffffff'];

  const particles = [];
  function spawn(n, cx, cy) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x: cx, y: cy,
        vx: (Math.random()-0.5)*12,
        vy: -(Math.random()*14)-4,
        gravity: 0.45,
        drag: 0.97,
        rotation: Math.random()*Math.PI*2,
        rotationSpeed: (Math.random()-0.5)*0.3,
        life: 1.0,
        decay: 0.018 + Math.random()*0.012,
        scale: 0.8 + Math.random()*0.6,
        color: colors[Math.floor(Math.random()*colors.length)],
        size: 6 + Math.random()*4,
        star: false
      });
    }
  }

  spawn(count, cx, cy);
  if (blackjack) {
    for (let i = 0; i < 15; i++) {
      particles.push({ x:cx, y:cy, vx:(Math.random()-0.5)*6, vy:-(Math.random()*8)-2,
        gravity:0.2, drag:0.98, rotation:0, rotationSpeed:0.05,
        life:1.0, decay:0.008, scale:2, color:'#c9a84c', size:16, star:true });
    }
    setTimeout(() => spawn(30, cx, cy), 400);
  }

  if (G.particleRAF) cancelAnimationFrame(G.particleRAF);

  const ctx = canvas.getContext('2d');
  function animate() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive = false;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;
      p.x += p.vx; p.y += p.vy;
      p.vy += p.gravity; p.vx *= p.drag; p.vy *= p.drag;
      p.rotation += p.rotationSpeed;
      p.life -= p.decay;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(p.scale, p.scale);
      ctx.fillStyle = p.color;
      if (p.star) {
        drawStar(ctx, 0, 0, p.size/2, p.size, 5);
      } else {
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      }
      ctx.restore();
    }
    if (alive) G.particleRAF = requestAnimationFrame(animate);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  animate();
}

function drawStar(ctx, cx, cy, r1, r2, points) {
  ctx.beginPath();
  for (let i = 0; i < points*2; i++) {
    const r = i%2===0 ? r2 : r1;
    const a = (i*Math.PI/points) - Math.PI/2;
    ctx[i===0?'moveTo':'lineTo'](cx+r*Math.cos(a), cy+r*Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();
}

// ===================== SETTINGS =====================
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(LS.SETTINGS) || '{}');
    G.settings = { decks:6, animSpeed:1, particles:true, ...s };
  } catch(e) {}
  try {
    const theme = localStorage.getItem(LS.THEME) || 'dark';
    applyTheme(theme);
  } catch(e) {}

  setAnim(G.settings.animSpeed);
  el('particlesToggle').checked = G.settings.particles;
  updateShoeIndicator();
}

function saveSettings() {
  try { localStorage.setItem(LS.SETTINGS, JSON.stringify(G.settings)); } catch(e) {}
}

function applyTheme(theme) {
  document.body.classList.toggle('theme-green', theme === 'green');
  el('themeLight').classList.toggle('active', theme === 'dark');
  el('themeGreen').classList.toggle('active', theme === 'green');
  try { localStorage.setItem(LS.THEME, theme); } catch(e) {}
}

function openSettings() {
  show('settingsPanel');
  show('settingsOverlay');
  // Sync UI
  document.querySelectorAll('.seg-btn[data-decks]').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.decks) === G.settings.decks);
  });
  document.querySelectorAll('.seg-btn[data-speed]').forEach(b => {
    b.classList.toggle('active', parseFloat(b.dataset.speed) === G.settings.animSpeed);
  });
}

function closeSettings() {
  hide('settingsPanel');
  hide('settingsOverlay');
}

// ===================== MODALS =====================
function showNoChipsModal() { el('noChipsModal').style.display = 'flex'; }
function hideNoChipsModal() { el('noChipsModal').style.display = 'none'; }

function newSession() {
  G.balance = 1000;
  G.stats = { wins:0, losses:0, pushes:0, netPL:0, streak:0, streakType:null };
  G.history = [];
  G.bet = 0;
  G.bets = [0];
  G.previousBet = 0;
  G.state = 'IDLE';
  try { sessionStorage.removeItem(LS.HISTORY); } catch(e) {}
  try { localStorage.setItem(LS.BALANCE, G.balance); } catch(e) {}
  hideNoChipsModal();
  hide('resetModal');
  renderHistory();
  renderBetStacks();
  updateSidebar();
  el('dealerCards').innerHTML = '';
  el('playerCards0').innerHTML = '';
  el('playerCards1').innerHTML = '';
  el('dealerTotal').textContent = '';
  el('playerTotal0').textContent = '';
  el('playerTotal1').textContent = '';
  hideResultOverlay();
  hide('btnNext');
  el('btnDeal').disabled = true;
}

// ===================== BALANCE PERSISTENCE =====================
function saveBalance() {
  try { localStorage.setItem(LS.BALANCE, G.balance); } catch(e) {}
}

function loadBalance() {
  try {
    const b = parseInt(localStorage.getItem(LS.BALANCE));
    if (!isNaN(b) && b > 0) G.balance = b;
  } catch(e) {}
}

// ===================== INIT =====================
function init() {
  loadBalance();
  loadSettings();

  const n = G.settings.decks;
  G.shoe = buildShoe(n);
  G.shoeTotalCards = G.shoe.length;
  updateShoeIndicator();
  updateSidebar();
  renderBetStacks();

  // Load history
  try {
    const h = JSON.parse(sessionStorage.getItem(LS.HISTORY) || '[]');
    G.history = h;
    renderHistory();
  } catch(e) {}

  // Chip clicks
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => addChip(parseInt(chip.dataset.value)));
  });

  // Betting controls
  el('btnDeal').addEventListener('click', () => {
    G.previousBet = G.bet;
    G.balance -= G.bet;
    saveBalance();
    startDeal();
  });
  el('btnClear').addEventListener('click', clearBet);
  el('btnRebet').addEventListener('click', rebet);
  el('btnNext').addEventListener('click', () => {
    saveBalance();
    nextHand();
  });

  // Action buttons
  el('btnHit').addEventListener('click', playerHit);
  el('btnStand').addEventListener('click', playerStand);
  el('btnDouble').addEventListener('click', playerDouble);
  el('btnSplit').addEventListener('click', playerSplit);
  el('btnSurrender').addEventListener('click', playerSurrender);
  el('btnInsurance').addEventListener('click', takeInsurance);
  el('btnDecline').addEventListener('click', () => declineInsurance(false));

  // Settings
  el('settingsBtn').addEventListener('click', openSettings);
  el('settingsClose').addEventListener('click', closeSettings);
  el('settingsOverlay').addEventListener('click', closeSettings);

  document.querySelectorAll('.toggle-btn[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });

  document.querySelectorAll('.seg-btn[data-decks]').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.decks);
      document.querySelectorAll('.seg-btn[data-decks]').forEach(b => b.classList.toggle('active', b === btn));
      if (G.state !== 'IDLE' && G.state !== 'BETTING') {
        G.pendingDeckChange = n;
        showDeckBanner();
        toast(`Deck change to ${n} will apply after this round.`);
      } else {
        G.settings.decks = n;
        G.shoe = buildShoe(n);
        G.shoeTotalCards = G.shoe.length;
        updateShoeIndicator();
        toast(`Shoe changed to ${n} deck${n>1?'s':''}. Reshuffled.`);
      }
      saveSettings();
    });
  });

  document.querySelectorAll('.seg-btn[data-speed]').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = parseFloat(btn.dataset.speed);
      document.querySelectorAll('.seg-btn[data-speed]').forEach(b => b.classList.toggle('active', b === btn));
      G.settings.animSpeed = s;
      setAnim(s);
      saveSettings();
    });
  });

  el('particlesToggle').addEventListener('change', () => {
    G.settings.particles = el('particlesToggle').checked;
    saveSettings();
  });

  el('btnReset').addEventListener('click', () => { show('resetModal'); closeSettings(); });
  el('btnConfirmReset').addEventListener('click', newSession);
  el('btnCancelReset').addEventListener('click', () => hide('resetModal'));

  // No chips modal
  el('btnNewSession').addEventListener('click', newSession);
  el('btnReviewHistory').addEventListener('click', () => { hideNoChipsModal(); });

  // Canvas resize
  const resizeCanvas = () => {
    const canvas = el('particleCanvas');
    const rect = el('tableArea').getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  };
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
}

document.addEventListener('DOMContentLoaded', init);
