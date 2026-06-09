const socket = io();

let myId = null;
let currentRoom = null;
let tickTimer = null;
let autoSaveTimer = null;

const $ = (id) => document.getElementById(id);
const screens = { join: $('joinScreen'), game: $('gameScreen') };
const inputs = { name: $('answerName'), animal: $('answerAnimal'), place: $('answerPlace'), object: $('answerObject') };

function showGame(){ screens.join.classList.remove('active'); screens.game.classList.add('active'); }
function setError(m=''){ $('joinError').textContent = m; }
function playerName(){ return $('playerName').value.trim() || 'Player'; }
function roomInput(){ return $('roomCodeInput').value.trim().toUpperCase(); }
function allAnswersFilled(){ return Object.values(inputs).every(i => i.value.trim().length > 0); }
function answerPayload(){ return { name: inputs.name.value.trim(), animal: inputs.animal.value.trim(), place: inputs.place.value.trim(), object: inputs.object.value.trim() }; }
function clearAnswers(){ Object.values(inputs).forEach(i => i.value = ''); $('autoSaveBadge').textContent = 'Auto-saves'; }
function lockAnswers(locked){ Object.values(inputs).forEach(i => i.disabled = locked); }
function canAnswer(){ return currentRoom && ['playing','rushing'].includes(currentRoom.state); }
function escapeHtml(str){ return String(str || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function autoSubmitNow(){
  if(!canAnswer()) return;
  socket.emit('answer:submit', { answers: answerPayload() }, res => {
    $('autoSaveBadge').textContent = res?.ok ? 'Saved' : 'Not saved';
    updateRushButton();
  });
}
function scheduleAutoSubmit(){
  if(!canAnswer()) return;
  $('autoSaveBadge').textContent = 'Saving...';
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(autoSubmitNow, 250);
}
function updateRushButton(){ $('rushBtn').disabled = !(currentRoom?.state === 'playing' && allAnswersFilled()); }

function joinCallback(res){ if(!res.ok) return setError(res.error || 'Something went wrong'); myId = res.playerId; setError(''); showGame(); }
$('createRoomBtn').addEventListener('click', () => socket.emit('room:create', { name: playerName() }, joinCallback));
$('joinRoomBtn').addEventListener('click', () => { const code = roomInput(); if(!code) return setError('Enter a room code first.'); socket.emit('room:join', { code, name: playerName() }, joinCallback); });
$('copyCodeBtn').addEventListener('click', async () => { if(!currentRoom) return; await navigator.clipboard?.writeText(currentRoom.code); $('copyCodeBtn').textContent='Copied!'; setTimeout(()=>$('copyCodeBtn').textContent='Copy code',1200); });
$('startBtn').addEventListener('click', () => socket.emit('round:start', res => { if(!res?.ok) alert(res?.error || 'Could not start round'); }));
$('nextRoundBtn').addEventListener('click', () => socket.emit('round:start', res => { if(!res?.ok) alert(res?.error || 'Could not start round'); }));
$('endGameBtn').addEventListener('click', () => { if(confirm('End the game and show the final table?')) socket.emit('game:end', res => { if(!res?.ok) alert(res?.error || 'Could not end game'); }); });
$('rushBtn').addEventListener('click', () => { clearTimeout(autoSaveTimer); socket.emit('rush:start', { answers: answerPayload() }, res => { if(!res?.ok) alert(res?.error || 'Could not start Rush'); }); });
Object.values(inputs).forEach(input => input.addEventListener('input', () => { scheduleAutoSubmit(); updateRushButton(); $('formHint').textContent = allAnswersFilled() ? 'All filled. Press RUSH! when you are finished.' : 'Keep typing. Your answers save automatically.'; }));

$('closeChallengeModal').addEventListener('click', () => $('challengeModal').classList.add('hidden'));

document.addEventListener('click', e => {
  const challenge = e.target.closest('[data-challenge]');
  if(challenge){
    const [playerId, category] = challenge.dataset.challenge.split('|');
    socket.emit('dispute:create', { playerId, category }, res => { if(!res?.ok) alert(res?.error || 'Could not challenge'); });
  }
  const vote = e.target.closest('[data-vote]');
  if(vote){
    const [key, choice] = vote.dataset.vote.split('|');
    socket.emit('dispute:vote', { key, vote: choice }, res => { if(!res?.ok) alert(res?.error || 'Could not vote'); });
  }
});

function renderPlayers(room){
  $('playerList').innerHTML = room.players.map(p => `<div class="player"><div><strong>${escapeHtml(p.name)}</strong>${p.isHost ? '<span class="pill">Host</span>' : ''}</div><span class="pill ${p.submitted ? 'submitted' : ''}">${p.submitted ? 'Ready' : 'Thinking'}</span></div>`).join('') || '<p class="hint">No players yet.</p>';
}
function renderLeaderboard(room){
  const sorted = [...room.players].sort((a,b)=>b.score-a.score);
  $('leaderboard').innerHTML = sorted.map((p,i)=>`<div class="leader-row"><strong>${i+1}. ${escapeHtml(p.name)}</strong><span class="pill">${p.score} pts</span></div>`).join('');
}
function renderDisputes(room){
  if(!room.disputes?.length) return '';
  return `<div class="dispute-box"><h4>Player votes</h4>${room.disputes.map(d => `<div class="dispute"><b>${escapeHtml(d.playerName)}</b> challenged <b>${escapeHtml(d.category)}</b>: “${escapeHtml(d.answer || '—')}”<br><small>Current: ${d.currentPoints >= 0 ? '+' : ''}${d.currentPoints} pts · ${d.status === 'closed' ? (d.passed ? 'Accepted by vote' : 'Rejected by vote') : 'Vote if it should count as valid'}</small><div class="vote-row"><button data-vote="${escapeHtml(d.key)}|yes" class="secondary">Count it (${d.yes.length})</button><button data-vote="${escapeHtml(d.key)}|no" class="ghost">Reject (${d.no.length})</button></div></div>`).join('')}</div>`;
}
function renderChallengeModal(room){
  const modal = $('challengeModal');
  const text = $('challengeModalText');
  const votes = $('challengeModalVotes');
  const open = (room.disputes || []).find(d => d.status === 'open');
  if(!open){ modal.classList.add('hidden'); return; }
  modal.classList.remove('hidden');
  text.innerHTML = `<strong>${escapeHtml(open.challengedBy || 'Someone')}</strong> challenged <strong>${escapeHtml(open.playerName)}</strong>'s <strong>${escapeHtml(open.category)}</strong> answer:<br><br><span class="quoted-answer">“${escapeHtml(open.answer || '—')}”</span><br><small>Current score for this answer: ${open.currentPoints >= 0 ? '+' : ''}${open.currentPoints} pts</small>`;
  if(open.challengedById === myId){
    votes.innerHTML = `<p class="hint">You created this challenge, so you cannot vote on it.</p>`;
  } else {
    votes.innerHTML = `<button data-vote="${escapeHtml(open.key)}|yes" class="primary">Count it (${open.yes.length})</button><button data-vote="${escapeHtml(open.key)}|no" class="danger">Reject it (${open.no.length})</button>`;
  }
}

function renderResults(room){
  const panel = $('resultsPanel');
  if(room.state !== 'results' || !room.results?.length){ panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  $('resultsList').innerHTML = room.results.map(r => `<div class="result-card"><div class="result-title"><span>${escapeHtml(r.name)}</span><span>${r.roundScore >= 0 ? '+' : ''}${r.roundScore} pts · Total ${r.totalScore}</span></div><div class="result-grid">${['name','animal','place','object'].map(cat => { const item = r.breakdown[cat]; return `<div class="answer-result"><b>${cat}</b><span>${escapeHtml(item.answer || '—')}</span><small>${escapeHtml(item.status)} · ${item.points >= 0 ? '+' : ''}${item.points} pts</small><button class="challenge-btn" data-challenge="${r.id}|${cat}">Challenge / vote</button></div>`; }).join('')}</div></div>`).join('') + renderDisputes(room);
}
function renderFinal(room){
  const panel = $('finalPanel');
  if(room.state !== 'ended' || !room.finalTable){ panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  $('finalTable').innerHTML = `<table><thead><tr><th>Rank</th><th>Player</th><th>Total</th></tr></thead><tbody>${room.finalTable.map(row => `<tr><td>#${row.rank}</td><td>${escapeHtml(row.name)}</td><td>${row.score} pts</td></tr>`).join('')}</tbody></table>`;
}
function renderStatus(room){
  $('roomCode').textContent = room.code; $('letterDisplay').textContent = room.letter || '?'; const used = room.usedLetters?.length ? room.usedLetters.join(', ') : 'none'; $('usedLetters').textContent = `Used letters: ${used}`;
  const amHost = room.hostId === myId;
  $('startBtn').classList.toggle('hidden', !amHost || room.state !== 'lobby');
  $('nextRoundBtn').classList.toggle('hidden', !amHost || room.state !== 'results');
  $('endGameBtn').classList.toggle('hidden', !amHost || !['lobby','results'].includes(room.state));
  if(room.state === 'lobby'){ $('roundStatus').textContent = amHost ? 'Start when everyone has joined' : 'Waiting for host'; $('timer').textContent='--'; lockAnswers(true); $('formHint').textContent='Waiting for the host to start.'; $('autoSaveBadge').textContent='Auto-saves'; }
  if(room.state === 'playing'){ $('roundStatus').textContent='Round live'; lockAnswers(false); $('formHint').textContent = allAnswersFilled() ? 'All filled. Press RUSH!' : 'Fill the boxes. Answers auto-save.'; }
  if(room.state === 'rushing'){ $('roundStatus').textContent='Rush countdown active'; lockAnswers(false); $('formHint').textContent='Rush has started. Type quickly before it locks.'; }
  if(room.state === 'results'){ $('roundStatus').textContent='Round finished'; $('timer').textContent='Results'; lockAnswers(true); $('formHint').textContent='Round locked. Use Challenge if an answer was marked unfairly.'; $('autoSaveBadge').textContent='Locked'; }
  if(room.state === 'ended'){ $('roundStatus').textContent='Game ended'; $('timer').textContent='Final'; lockAnswers(true); $('rushBtn').disabled=true; }
  const rushActive = room.state === 'rushing'; $('rushBanner').classList.toggle('hidden', !rushActive); if(rushActive){ $('rushText').textContent = `🚨 ${room.rushBy} started a Category Rush!`; $('rushCountdown').textContent = room.rushRemaining ?? 5; }
  updateRushButton();
}
function startLocalTimer(){
  clearInterval(tickTimer);
  function paint(){ if(!currentRoom || !['playing','rushing'].includes(currentRoom.state) || !currentRoom.roundEndsAt) return; const remaining = Math.max(0, Math.ceil((currentRoom.roundEndsAt - Date.now()) / 1000)); $('timer').textContent = `${remaining}s`; }
  paint(); tickTimer = setInterval(paint, 500);
}
socket.on('room:update', room => {
  const wasRound = currentRoom?.letter; const newRound = room.state === 'playing' && room.letter !== wasRound;
  currentRoom = room; if(newRound) clearAnswers(); renderStatus(room); renderPlayers(room); renderLeaderboard(room); renderResults(room); renderChallengeModal(room); renderFinal(room); startLocalTimer();
});
