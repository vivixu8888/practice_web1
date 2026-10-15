/* 无需安装工具。此文件负责页面交互，所有日期使用电脑的本地时间。 */
'use strict';
const STORAGE_KEY = 'manmanlai-dashboard-v1';
const $ = id => document.getElementById(id);
const habits = [ ['water', '💧', '好好喝水'], ['read', '📖', '阅读几页'], ['move', '🧘', '活动身体'], ['sleep', '🌙', '早点休息'] ];
const moods = [ ['happy', '😆', '超开心'], ['good', '😊', '还不错'], ['calm', '😌', '很平静'], ['low', '😔', '有点低落'], ['tired', '😴', '有些疲惫'] ];
const quotes = [ '慢慢来，你想要的都会在路上。', '把平凡的小事，做成温柔的坚持。', '不必追赶别人，你有自己的花期。', '今天的一小步，也是向前的一大步。', '允许自己休息，也相信自己会发光。', '认真生活的你，本身就很美好。', '种下小小的努力，等待花开的日子。' ];
const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
let state = { days: {}, timer: { elapsed: 0, startedAt: null } };
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved && typeof saved.days === 'object' && saved.days && !Array.isArray(saved.days)) {
    state.days = saved.days;
    if (saved.timer && Number.isFinite(saved.timer.elapsed) && saved.timer.elapsed >= 0) {
      state.timer = { elapsed: saved.timer.elapsed, startedAt: Number.isFinite(saved.timer.startedAt) ? saved.timer.startedAt : null };
    }
  }
} catch (error) {
  storageAvailable = false;
  $('storage-warning').hidden = false;
}
let today = dateKey();
let chosenMood = null;
let toastTimeout;
function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $('toast').classList.remove('visible'), 2600);
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageAvailable = true;
    $('storage-warning').hidden = true;
    return true;
  } catch (error) {
    storageAvailable = false;
    $('storage-warning').hidden = false;
    return false;
  }
}
function day(key = today) {
  if (!Object.prototype.hasOwnProperty.call(state.days, key)) state.days[key] = {};
  const entry = state.days[key];
  if (!Array.isArray(entry.tasks)) entry.tasks = [];
  entry.tasks = entry.tasks.filter(task => task && typeof task.text === 'string' && typeof task.id === 'string');
  if (!entry.habits || typeof entry.habits !== 'object') entry.habits = {};
  if (!Number.isFinite(entry.studySeconds) || entry.studySeconds < 0) entry.studySeconds = 0;
  return entry;
}
function renderDate() {
  const now = new Date();
  $('date-label').textContent = `${now.getFullYear()} 年 ${now.getMonth()+1} 月 ${now.getDate()} 日`;
  $('weekday-label').textContent = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][now.getDay()];
  const ordinal = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  $('quote').textContent = quotes[ordinal % quotes.length];
  $('quote-source').textContent = '— 写给今天的你，也写给慢慢变好的自己';
}
function renderTasks() {
  const tasks = day().tasks;
  $('task-list').replaceChildren();
  if (!tasks.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = '新的一天，从一件小事开始吧 ✧';
    $('task-list').append(empty);
  }
  tasks.forEach(task => {
    const row = document.createElement('div');
    row.className = `task-row${task.done ? ' done' : ''}`;
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.done);
    checkbox.addEventListener('change', () => {
      task.done = checkbox.checked;
      row.classList.toggle('done', task.done);
      save();
      renderStats();
    });
    const text = document.createElement('span');
    text.textContent = task.text; // 使用文本节点，避免将用户输入作为 HTML 执行。
    label.append(checkbox, text);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-task';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `删除待办：${task.text}`);
    remove.addEventListener('click', () => {
      day().tasks = day().tasks.filter(item => item.id !== task.id);
      save(); renderTasks(); renderStats();
    });
    row.append(label, remove);
    $('task-list').append(row);
  });
}
function renderStats() {
  const entry = day();
  const completed = entry.tasks.filter(task => task.done).length;
  $('task-stat').replaceChildren(document.createTextNode(`${completed} `));
  const taskTotal = document.createElement('em');
  taskTotal.textContent = `/ ${entry.tasks.length}`;
  $('task-stat').append(taskTotal);
  $('task-badge').textContent = `${completed} 项完成`;
  $('task-progress').style.width = `${entry.tasks.length ? completed / entry.tasks.length * 100 : 0}%`;
  $('study-stat').textContent = Math.floor(entry.studySeconds / 60);
  const habitCount = habits.filter(([id]) => entry.habits[id]).length;
  $('habit-stat').replaceChildren(document.createTextNode(`${habitCount} `));
  const habitTotal = document.createElement('em');
  habitTotal.textContent = '/ 4';
  $('habit-stat').append(habitTotal);
  $('study-summary').textContent = entry.studySeconds ? `今天已积累 ${Math.floor(entry.studySeconds / 60)} 分 ${Math.floor(entry.studySeconds % 60)} 秒专注时光，真棒！` : '今天还没有记录，随时都可以开始。';
}
function renderHabits() {
  $('habit-list').replaceChildren();
  habits.forEach(([id, emoji, name]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'habit';
    button.setAttribute('aria-pressed', Boolean(day().habits[id]));
    button.setAttribute('aria-label', name);
    [['emoji', emoji], ['habit-name', name], ['check', '✓']].forEach(([className, text]) => {
      const span = document.createElement('span'); span.className = className; span.textContent = text; button.append(span);
    });
    button.addEventListener('click', () => {
      day().habits[id] = !day().habits[id];
      button.setAttribute('aria-pressed', Boolean(day().habits[id]));
      save(); renderStats(); renderWeek();
    });
    $('habit-list').append(button);
  });
  renderWeek();
}
function renderWeek() {
  $('habit-week').replaceChildren();
  let total = 0;
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate() - offset);
    const key = dateKey(date);
    const entry = Object.prototype.hasOwnProperty.call(state.days,key) ? state.days[key] : null;
    const count = habits.filter(([id]) => entry && entry.habits && entry.habits[id]).length;
    total += count;
    const cell = document.createElement('div'); cell.className = `day${offset === 0 ? ' today' : ''}`;
    cell.title = `${key}：完成 ${count} / 4 个习惯`;
    const dot = document.createElement('span'); dot.className = 'day-dot'; dot.textContent = count ? (count === 4 ? '✿' : count) : '·';
    if (count) dot.style.background = '#e6ecd9';
    const label = document.createElement('span'); label.textContent = offset === 0 ? '今天' : `${date.getMonth()+1}/${date.getDate()}`;
    cell.append(dot, label); $('habit-week').append(cell);
  }
  $('week-total').textContent = `累计 ${total} 次浇水`;
}
function renderMoods() {
  $('mood-options').replaceChildren();
  moods.forEach(([id, emoji, name]) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'mood-button';
    button.setAttribute('aria-pressed', chosenMood === id); button.setAttribute('aria-label', name);
    const icon = document.createElement('span'); icon.textContent = emoji;
    button.append(icon, document.createTextNode(name));
    button.addEventListener('click', () => { chosenMood = id; renderMoods(); $('mood-saved').textContent = '心情已选择，记得点击保存'; });
    $('mood-options').append(button);
  });
}
function loadMood() {
  chosenMood = day().mood || null;
  $('mood-note').value = typeof day().note === 'string' ? day().note : '';
  $('mood-saved').textContent = day().mood || day().note ? '已记录今天的心情 ♡' : '只属于你的小小心事';
  renderMoods();
}
function elapsedMilliseconds() {
  return state.timer.elapsed + (state.timer.startedAt === null ? 0 : Math.max(0, Date.now() - state.timer.startedAt));
}
function renderTimer() {
  const seconds = Math.floor(elapsedMilliseconds() / 1000);
  $('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
  const running = state.timer.startedAt !== null;
  $('timer-toggle').textContent = running ? 'Ⅱ 暂停一下' : (seconds ? '▷ 继续专注' : '▷ 开始专注');
  $('timer-status').textContent = running ? '专注当下，慢慢积累' : (seconds ? '休息一下，随时继续' : '准备好，开始一段专注');
}
function checkDay() {
  const next = dateKey();
  if (next === today) return;
  // 跨天前保存正在编辑的心情，计时会继续，结束时计入结束当天。
  day().mood = chosenMood; day().note = $('mood-note').value; save();
  today = next; renderAll();
  notify('新的一天开始了，昨天的记录已保留');
}
function renderAll() { day(); renderDate(); renderTasks(); renderHabits(); loadMood(); renderStats(); renderTimer(); }
$('task-form').addEventListener('submit', event => {
  event.preventDefault(); checkDay();
  const text = $('task-input').value.trim();
  if (!text) { $('task-input').value = ''; return; }
  day().tasks.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text, done: false });
  save(); $('task-input').value = ''; renderTasks(); renderStats(); $('task-input').focus();
});
$('timer-toggle').addEventListener('click', () => {
  checkDay();
  if (state.timer.startedAt !== null) { state.timer.elapsed = elapsedMilliseconds(); state.timer.startedAt = null; }
  else state.timer.startedAt = Date.now();
  save(); renderTimer();
});
$('timer-finish').addEventListener('click', () => {
  checkDay();
  const seconds = Math.floor(elapsedMilliseconds() / 1000);
  if (!seconds) { notify('先开始一小段专注吧'); return; }
  day().studySeconds += seconds;
  state.timer = { elapsed: 0, startedAt: null };
  const persisted = save(); renderTimer(); renderStats();
  notify(persisted ? `已记录 ${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒学习时光 ✨` : '已记录在页面中，但本地保存失败');
});
$('study-form').addEventListener('submit', event => {
  event.preventDefault(); checkDay();
  const minutes = Number($('study-minutes').value);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) { notify('请输入 1 到 1440 的整数分钟'); return; }
  day().studySeconds += minutes * 60;
  const persisted = save(); renderStats(); $('study-minutes').value = '';
  notify(persisted ? `已补记 ${minutes} 分钟，付出都算数 ♡` : '已记录在页面中，但本地保存失败');
});
$('save-mood').addEventListener('click', () => {
  checkDay();
  if (!chosenMood && !$('mood-note').value.trim()) { notify('选一个心情，或写下一点感受吧'); return; }
  day().mood = chosenMood; day().note = $('mood-note').value.trim();
  const persisted = save();
  $('mood-saved').textContent = persisted ? '已保存，抱抱今天的自己 ♡' : '暂未保存，请检查浏览器存储';
  notify(persisted ? '今天的心情，已温柔收藏 ♡' : '本地保存失败，请允许浏览器存储');
});
$('mood-note').addEventListener('input', () => { $('mood-saved').textContent = '正在编辑，记得点击保存'; });
document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('nav a').forEach(item => item.classList.toggle('active', item === link));
}));
renderAll();
setInterval(() => { checkDay(); renderTimer(); }, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkDay(); renderTimer(); } });
