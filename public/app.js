const $ = (id) => document.getElementById(id);
let activeStatus = 'all';
let tasks = [];
let toastTimer;

const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prettyDate = (date) => date ? new Date(date + 'T00:00:00').toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'}) : '';
const statusLabel = s => ({todo:'To do',doing:'In progress',done:'Completed'}[s] || s);

async function api(url, options = {}) {
  const response = await fetch(url, { headers:{'Content-Type':'application/json'}, ...options });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
  return data;
}
function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>$('toast').classList.remove('show'),2500);
}
function currentParams() {
  const params = new URLSearchParams();
  params.set('search',$('searchInput').value.trim());
  params.set('status',activeStatus);
  params.set('category',$('categoryFilter').value);
  return params;
}
async function loadTasks() {
  try {
    tasks = await api('/api/tasks?' + currentParams().toString());
    renderTasks();
    await loadStats();
  } catch (e) { notify(e.message); }
}
async function loadStats() {
  const s = await api('/api/stats');
  $('totalStat').textContent = s.total || 0;
  $('doingStat').textContent = s.doing || 0;
  $('doneStat').textContent = s.done || 0;
  $('overdueStat').textContent = s.overdue || 0;
  $('allCount').textContent = s.total || 0;
}
function renderTasks() {
  const sort = $('sortFilter').value;
  const sorted = [...tasks];
  if (sort === 'date') sorted.sort((a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999'));
  if (sort === 'newest') sorted.sort((a,b)=>b.id-a.id);
  $('taskList').innerHTML = sorted.map(t => `
    <article class="task-card ${t.status==='done'?'is-done':''}">
      <button class="check-button ${t.status==='done'?'checked':''}" data-action="toggle" data-id="${t.id}" title="Mark completed">${t.status==='done'?'✓':''}</button>
      <div class="task-main">
        <div class="task-title">${escapeHTML(t.title)}</div>
        ${t.description?`<div class="task-description">${escapeHTML(t.description)}</div>`:''}
      </div>
      <div class="task-meta">
        <span class="pill">${escapeHTML(t.category)}</span>
        <span class="pill priority-${t.priority}">${({high:'High 🔥',medium:'Medium 🌼',low:'Low 🌱'})[t.priority]}</span>
        ${t.due_date?`<span class="due-date">♡ ${prettyDate(t.due_date)}</span>`:''}
        <select class="status-select" data-action="status" data-id="${t.id}" aria-label="Update status">
          <option value="todo" ${t.status==='todo'?'selected':''}>To do</option>
          <option value="doing" ${t.status==='doing'?'selected':''}>In progress</option>
          <option value="done" ${t.status==='done'?'selected':''}>Completed</option>
        </select>
      </div>
      <div class="task-actions"><button class="icon-btn" data-action="edit" data-id="${t.id}" title="Edit">✎</button><button class="icon-btn" data-action="delete" data-id="${t.id}" title="Delete">⌫</button></div>
    </article>`).join('');
  $('emptyState').classList.toggle('hidden', sorted.length > 0);
  $('taskList').classList.toggle('hidden', sorted.length === 0);
  $('taskSummary').textContent = `${sorted.length} ${sorted.length===1?'task':'tasks'} shown`;
}
function openModal(task = null) {
  $('taskForm').reset();
  $('taskId').value = task?.id || '';
  $('modalTitle').innerHTML = task ? 'Edit your task <span>♡</span>' : 'Create a task <span>✿</span>';
  $('taskTitle').value = task?.title || '';
  $('taskDescription').value = task?.description || '';
  $('taskCategory').value = task?.category || 'Personal';
  $('taskPriority').value = task?.priority || 'medium';
  $('taskDueDate').value = task?.due_date || '';
  $('taskStatus').value = task?.status || 'todo';
  $('modal').classList.remove('hidden');
  $('taskTitle').focus();
}
function closeModal() { $('modal').classList.add('hidden'); }
async function saveTask(event) {
  event.preventDefault();
  const id = $('taskId').value;
  const payload = {
    title:$('taskTitle').value, description:$('taskDescription').value,
    category:$('taskCategory').value, priority:$('taskPriority').value,
    due_date:$('taskDueDate').value || null, status:$('taskStatus').value
  };
  try {
    await api(id?`/api/tasks/${id}`:'/api/tasks',{method:id?'PUT':'POST',body:JSON.stringify(payload)});
    closeModal(); notify(id?'Task updated ♡':'A new task is added ✿'); await loadTasks();
  } catch(e) { notify(e.message); }
}

$('taskList').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || button.dataset.action === 'status') return;
  const id = Number(button.dataset.id);
  const task = tasks.find(t=>t.id===id);
  try {
    if (button.dataset.action === 'toggle') {
      await api(`/api/tasks/${id}/status`,{method:'PATCH',body:JSON.stringify({status:task.status==='done'?'todo':'done'})});
      notify(task.status==='done'?'Moved back to To do':'Task completed! Great job ✨');
      await loadTasks();
    }
    if (button.dataset.action === 'edit') openModal(task);
    if (button.dataset.action === 'delete') {
      if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
      await api(`/api/tasks/${id}`,{method:'DELETE'}); notify('Task deleted'); await loadTasks();
    }
  } catch(e) { notify(e.message); }
});
$('taskList').addEventListener('change', async (event) => {
  if (event.target.dataset.action !== 'status') return;
  try {
    await api(`/api/tasks/${event.target.dataset.id}/status`,{method:'PATCH',body:JSON.stringify({status:event.target.value})});
    notify('Status updated ♡'); await loadTasks();
  } catch(e) { notify(e.message); }
});
document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click',()=>{
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  button.classList.add('active'); activeStatus=button.dataset.filter; loadTasks();
}));
$('addTaskBtn').addEventListener('click',()=>openModal());
$('emptyAddBtn').addEventListener('click',()=>openModal());
$('closeModal').addEventListener('click',closeModal);
$('cancelModal').addEventListener('click',closeModal);
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal();});
$('taskForm').addEventListener('submit',saveTask);
$('searchInput').addEventListener('input',()=>{clearTimeout(window.searchDelay);window.searchDelay=setTimeout(loadTasks,250);});
$('categoryFilter').addEventListener('change',loadTasks);
$('sortFilter').addEventListener('change',renderTasks);
$('dateText').textContent = new Date().toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
loadTasks();
