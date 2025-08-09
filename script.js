// Simple game logic for the prototype
let state = {
  teams: [],
  currentTeamIndex: 0,
  selectedCard: null,
  timer: null,
  timeLeft: 30,
  lifelines: {}, // per team
  usedCards: new Set()
};

async function loadQuestions(){
  const res = await fetch('questions.json');
  return res.json();
}

document.getElementById('btn-start').onclick = ()=> {
  document.getElementById('main-area').classList.remove('hidden');
  document.getElementById('btn-start').disabled = true;
}
document.getElementById('add-team').onclick = ()=>{
  const name = document.getElementById('team-name').value.trim();
  if(!name) return alert('اكتب اسم الفريق');
  addTeam(name);
  document.getElementById('team-name').value='';
}
function addTeam(name){
  state.teams.push({name, score:0, lifelines:{'50':1,'skip':1,'double':1}});
  renderTeams();
}
function renderTeams(){
  const el = document.getElementById('teams-list');
  el.innerHTML='';
  state.teams.forEach((t,i)=>{
    const d = document.createElement('div');
    d.className='team-badge';
    d.innerHTML = `<strong>${t.name}</strong> <button onclick="removeTeam(${i})">×</button>`;
    el.appendChild(d);
  });
  document.getElementById('start-play').disabled = state.teams.length===0;
}
window.removeTeam = function(i){
  state.teams.splice(i,1);
  renderTeams();
}

document.getElementById('start-play').onclick = async ()=>{
  // prepare board
  const data = await loadQuestions();
  window.GAME_DATA = data;
  setupBoard(data);
  document.getElementById('setup').classList.add('hidden');
  document.getElementById('board').classList.remove('hidden');
  document.getElementById('scoreboard').classList.remove('hidden');
  renderScores();
}

function setupBoard(data){
  const cats = [...new Set(data.questions.map(q=>q.category))];
  const categoriesEl = document.getElementById('categories');
  categoriesEl.innerHTML='';
  cats.forEach(c=>{
    const cc = document.createElement('div');
    cc.className='category';
    cc.textContent=c;
    categoriesEl.appendChild(cc);
  });
  const grid = document.getElementById('board-grid');
  grid.innerHTML='';
  // create 6x6 grid values from available questions
  data.questions.forEach((q,idx)=>{
    const card = document.createElement('div');
    card.className='card';
    card.dataset.idx = idx;
    card.innerHTML = `<div>${q.category}<br>قيمة: ${q.value}</div>`;
    card.onclick = ()=> openQuestion(idx);
    grid.appendChild(card);
  });
}

function openQuestion(idx){
  if(state.usedCards.has(idx)) return;
  const q = window.GAME_DATA.questions[idx];
  state.selectedCard = idx;
  document.getElementById('board').classList.add('hidden');
  document.getElementById('question-panel').classList.remove('hidden');
  document.getElementById('current-category').textContent = q.category;
  document.getElementById('current-value').textContent = 'قيمة: ' + q.value;
  document.getElementById('question-text').textContent = q.question;
  const answers = document.getElementById('answers');
  answers.innerHTML='';
  q.options.forEach((opt,i)=>{
    const a = document.createElement('div');
    a.className='answer';
    a.textContent = opt;
    a.onclick = ()=> {
      document.querySelectorAll('.answer').forEach(x=>x.classList.remove('selected'));
      a.classList.add('selected');
    };
    answers.appendChild(a);
  });
  startTimer();
}

function startTimer(){
  clearInterval(state.timer);
  state.timeLeft = parseInt(document.getElementById('time-select').value || '30');
  document.getElementById('time-left').textContent = state.timeLeft;
  state.timer = setInterval(()=>{
    state.timeLeft--;
    document.getElementById('time-left').textContent = state.timeLeft;
    if(state.timeLeft<=0){
      clearInterval(state.timer);
      onTimeUp();
    }
  },1000);
}

function onTimeUp(){
  alert('انتهى الوقت! تُحسب الإجابة خاطئة.');
  resolveQuestion(false);
}

document.getElementById('btn-submit').onclick = ()=> {
  const sel = document.querySelector('.answer.selected');
  if(!sel){ return alert('اختَر إجابة أو اضغط إلغاء'); }
  const selectedIndex = [...document.querySelectorAll('.answer')].indexOf(sel);
  const q = window.GAME_DATA.questions[state.selectedCard];
  const correct = selectedIndex === q.answer_index;
  resolveQuestion(correct);
}

document.getElementById('btn-cancel').onclick = ()=> {
  // go back to board without using card
  document.getElementById('question-panel').classList.add('hidden');
  document.getElementById('board').classList.remove('hidden');
  clearInterval(state.timer);
  state.selectedCard = null;
}

function resolveQuestion(correct){
  clearInterval(state.timer);
  const q = window.GAME_DATA.questions[state.selectedCard];
  // award points to current team
  const team = state.teams[state.currentTeamIndex];
  if(correct){
    team.score += q.value;
    alert('إجابة صحيحة! نال الفريق ' + q.value + ' نقطة.');
  } else {
    team.score -= q.value;
    alert('إجابة خاطئة! تُخصم ' + q.value + ' نقطة.');
  }
  state.usedCards.add(state.selectedCard);
  document.querySelectorAll('.card')[state.selectedCard].classList.add('locked');
  state.selectedCard = null;
  // next team
  state.currentTeamIndex = (state.currentTeamIndex + 1) % state.teams.length;
  renderScores();
  document.getElementById('question-panel').classList.add('hidden');
  document.getElementById('board').classList.remove('hidden');

  // check if all used
  if(state.usedCards.size === window.GAME_DATA.questions.length){
    endGame();
  }
}

function renderScores(){
  const el = document.getElementById('scores');
  el.innerHTML = '';
  state.teams.forEach((t,i)=>{
    const d = document.createElement('div');
    d.innerHTML = `<strong>${t.name}</strong> — ${t.score} نقطة`;
    el.appendChild(d);
  });
}

function endGame(){
  alert('انتهت اللعبة! سيتم عرض النتيجة النهائية.');
  document.getElementById('board').classList.add('hidden');
  document.getElementById('question-panel').classList.add('hidden');
  const sb = document.getElementById('scoreboard');
  sb.classList.remove('hidden');
  renderScores();
}

document.getElementById('btn-reset').onclick = ()=> location.reload();

// lifelines (basic placeholders)
document.getElementById('ll-50').onclick = ()=>{
  alert('ميزة إلغاء خيارين: يتم إخفاء خيارين عشوائياً (إن لم تُستخدم) — في الإصدار النهائي سيتم تخصيصها للفريق الحالي.');
}
document.getElementById('ll-skip').onclick = ()=> alert('تجاوز السؤال: يتخطى الفريق السؤال دون تغيير النقاط.');
document.getElementById('ll-double').onclick = ()=> alert('ضربة مزدوجة: تضاعف نقاط السؤال عند الإجابة الصحيحة.');
