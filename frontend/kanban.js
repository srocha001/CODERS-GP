// Glassy PM — Drag and Drop do Kanban (HTML5 Drag & Drop, Vanilla JS)
// Uso: depois de renderizar as 3 colunas, chame initKanban({ onMove }).
// Cada card precisa de: class="kanban-card", draggable="true", data-task-id="..."
// Cada coluna precisa de: class="kanban-column", data-status="todo|doing|done"
// Ao soltar, a nova coluna + posição são enviadas para PATCH /api/tasks/:id/move
// e salvas no PostgreSQL em transação. Se a API falhar, o card volta ao lugar.

function initKanban({ onMove } = {}) {
  let draggedId = null;

  document.querySelectorAll('.kanban-card').forEach((card) => {
    if (card.dataset.kanbanInit) return; card.dataset.kanbanInit = '1';
    card.draggable = true;
    card.addEventListener('dragstart', (e) => {
      draggedId = card.dataset.taskId;
      e.dataTransfer.setData('text/plain', draggedId);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });

  document.querySelectorAll('.kanban-column').forEach((col) => {
    if (col.dataset.kanbanInit) return; col.dataset.kanbanInit = '1';
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain') || draggedId;
      if (!id) return;
      const status = col.dataset.status;
      // Posição = onde o card foi solto dentro da coluna (antes do card mais próximo)
      const cards = [...col.querySelectorAll('.kanban-card:not(.dragging)')];
      const after = cards.find((c) => e.clientY < c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2);
      const position = after ? cards.indexOf(after) : cards.length;
      const card = document.querySelector(`.kanban-card[data-task-id="${id}"]`);
      const oldParent = card.parentElement;
      const oldNext = card.nextElementSibling;
      if (after) col.insertBefore(card, after); else col.appendChild(card);
      try {
        const updated = await PM_API.moveTask(id, status, position);
        if (onMove) onMove(updated);
      } catch (err) {
        // Rollback visual se o banco não salvou
        if (oldNext) oldParent.insertBefore(card, oldNext); else oldParent.appendChild(card);
        alert('Não consegui salvar a movimentação: ' + err.message);
      }
    });
  });
}

// Exemplo de renderização de uma coluna (adapte ao seu HTML atual):
function kanbanCardHTML(task) {
  return `<div class="kanban-card" draggable="true" data-task-id="${task.id}">
    <b>${task.title}</b>
    <p>${task.priority || ''} • ${task.due_date || ''}</p>
  </div>`;
}
window.initKanban = initKanban;
window.kanbanCardHTML = kanbanCardHTML;
