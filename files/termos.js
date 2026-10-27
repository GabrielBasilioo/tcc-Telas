document.getElementById('abas').addEventListener('click', e => {
    const b = e.target.closest('.filter-tab');
    if (!b) return;
    document.querySelectorAll('.filter-tab').forEach(x => x.classList.toggle('active', x === b));
    document.querySelectorAll('.sec').forEach(s => s.classList.toggle('on', s.id === b.dataset.s));
});
