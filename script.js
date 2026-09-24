const $ = s => document.querySelector(s);
const KEY = 'homework-planner-v1', THEME = 'homework-planner-theme';
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = s => new Date(s + 'T00:00').toLocaleDateString(LOC, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const LOC = 'uk-UA';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
 
let tasks = load();
let sel = today();
let view = new Date(); view.setDate(1);
let mode = 'day';
let editId = null;
 
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch {} }
function color(subject) {
  let h = 0;
  for (const ch of (subject || 'x').toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return subject ? `hsl(${h} 55% 42%)` : 'var(--muted)';
}
 
/* ---------- calendar ---------- */
function renderCalendar() {
  const y = view.getFullYear(), m = view.getMonth();
  $('#monthLabel').textContent = cap(view.toLocaleDateString(LOC, { month: 'long', year: 'numeric' }));
  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
  const t = today();
  let html = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m, 1 - offset + i), s = iso(d);
    const day = tasks.filter(x => x.date === s);
    const open = day.filter(x => !x.done).length;
    const cls = ['day',
      d.getMonth() !== m && 'other', s === t && 'today', s === sel && 'sel',
      open && s < t && 'late', day.length && !open && 'fin'].filter(Boolean).join(' ');
    const badge = day.length ? `<span class="n">${open || '✓'}</span>` : '';
    html += `<button class="${cls}" data-date="${s}" aria-label="${fmt(s)}, невиконаних: ${open}">${d.getDate()}${badge}</button>`;
  }
  $('#grid').innerHTML = html;
}
 
/* ---------- list ---------- */
function visible() {
  const q = $('#search').value.trim().toLowerCase(), t = today();
  return tasks
    .filter(x => mode === 'day' ? x.date === sel : mode === 'upcoming' ? !x.done && x.date >= t : true)
    .filter(x => !q || [x.title, x.subject, x.notes].join(' ').toLowerCase().includes(q))
    .sort((a, b) => a.date.localeCompare(b.date) || a.done - b.done || b.priority - a.priority);
}
 
function renderList() {
  const items = visible(), t = today();
  $('#listTitle').textContent = mode === 'day' ? fmt(sel) : mode === 'upcoming' ? 'Найближчі завдання' : 'Усі завдання';
  const done = items.filter(x => x.done).length;
  $('#stats').textContent = items.length ? `Виконано ${done} з ${items.length}` : '';
  $('#bar').style.width = items.length ? `${done / items.length * 100}%` : '0';
  $('#list').innerHTML = items.length ? items.map(x => `
    <li class="item ${x.done ? 'done' : ''}" data-id="${x.id}" style="--c:${color(x.subject)}">
      <input type="checkbox" ${x.done ? 'checked' : ''} aria-label="Позначити виконаним">
      <div>
        <div class="t">${esc(x.title)}</div>
        <div class="meta">
          ${x.subject ? `<span class="chip subj">${esc(x.subject)}</span>` : ''}
          ${mode !== 'day' ? `<span>${fmt(x.date)}</span>` : ''}
          ${x.priority == 3 ? '<span class="chip p3">Високий пріоритет</span>' : ''}
          ${!x.done && x.date < t ? '<span class="chip late">Прострочено</span>' : ''}
        </div>
        ${x.notes ? `<p class="note">${esc(x.notes)}</p>` : ''}
      </div>
      <div class="acts"><button class="edit">Змінити</button><button class="del">Видалити</button></div>
    </li>`).join('')
    : `<li class="empty">${mode === 'day' ? 'На цей день нічого не заплановано. Додайте завдання вище.' : 'Завдань не знайдено.'}</li>`;
  $('#subjects').innerHTML = [...new Set(tasks.map(x => x.subject).filter(Boolean))].map(s => `<option value="${esc(s)}">`).join('');
}
 
function render() { renderCalendar(); renderList(); $('#seg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode)); }
 
/* ---------- form ---------- */
function resetForm() {
  editId = null;
  $('#form').reset();
  $('#date').value = sel;
  $('#priority').value = '2';
  $('#formTitle').textContent = 'Нове завдання';
  $('#saveBtn').textContent = 'Додати завдання';
  $('#cancelBtn').hidden = true;
}
 
$('#form').addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    title: $('#title').value.trim(), subject: $('#subject').value.trim(),
    date: $('#date').value, priority: +$('#priority').value, notes: $('#notes').value.trim()
  };
  if (!data.title || !data.date) return;
  if (editId) Object.assign(tasks.find(x => x.id === editId), data);
  else tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), done: false, ...data });
  save();
  sel = data.date;
  view = new Date(sel + 'T00:00'); view.setDate(1);
  resetForm(); render();
});
$('#cancelBtn').addEventListener('click', resetForm);
 
/* ---------- interactions ---------- */
$('#grid').addEventListener('click', e => {
  const b = e.target.closest('.day'); if (!b) return;
  sel = b.dataset.date; mode = 'day';
  const d = new Date(sel + 'T00:00');
  if (d.getMonth() !== view.getMonth()) { view = new Date(d.getFullYear(), d.getMonth(), 1); }
  if (!editId) $('#date').value = sel;
  render();
});
$('#prev').onclick = () => { view.setMonth(view.getMonth() - 1); renderCalendar(); };
$('#next').onclick = () => { view.setMonth(view.getMonth() + 1); renderCalendar(); };
$('#todayBtn').onclick = () => { sel = today(); view = new Date(); view.setDate(1); mode = 'day'; if (!editId) $('#date').value = sel; render(); };
$('#seg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { mode = b.dataset.mode; render(); } });
$('#search').addEventListener('input', renderList);
 
$('#list').addEventListener('click', e => {
  const li = e.target.closest('.item'); if (!li) return;
  const t = tasks.find(x => x.id === li.dataset.id);
  if (e.target.matches('input[type=checkbox]')) { t.done = e.target.checked; save(); render(); }
  else if (e.target.classList.contains('del')) {
    if (confirm(`Видалити «${t.title}»?`)) { tasks = tasks.filter(x => x !== t); save(); render(); }
  } else if (e.target.classList.contains('edit')) {
    editId = t.id;
    $('#title').value = t.title; $('#subject').value = t.subject; $('#date').value = t.date;
    $('#priority').value = t.priority; $('#notes').value = t.notes || '';
    $('#formTitle').textContent = 'Редагування завдання';
    $('#saveBtn').textContent = 'Зберегти зміни';
    $('#cancelBtn').hidden = false;
    $('#form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#title').focus();
  }
});
 
/* ---------- export / import ---------- */
$('#exportBtn').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' }));
  a.download = `homework-${today()}.json`; a.click(); URL.revokeObjectURL(a.href);
};
$('#importFile').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const list = JSON.parse(r.result);
      if (!Array.isArray(list)) throw 0;
      const ids = new Set(tasks.map(x => x.id));
      const fresh = list.filter(x => x && x.id && x.title && /^\d{4}-\d\d-\d\d$/.test(x.date) && !ids.has(x.id));
      tasks.push(...fresh.map(x => ({ id: String(x.id), title: String(x.title), subject: String(x.subject || ''), date: x.date, priority: +x.priority || 2, notes: String(x.notes || ''), done: !!x.done })));
      save(); render(); alert(`Імпортовано завдань: ${fresh.length}.`);
    } catch { alert('Цей файл не є коректним експортом завдань (.json).'); }
    e.target.value = '';
  };
  r.readAsText(f);
});
 
/* ---------- theme ---------- */
function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem(THEME, t); } catch {} }
let saved = null; try { saved = localStorage.getItem(THEME); } catch {}
setTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('#themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
 
/* ---------- start ---------- */
$('#dow').innerHTML = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => `<span>${d}</span>`).join('');
resetForm(); render();
