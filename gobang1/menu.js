(() => {
  const difficultyEl = document.getElementById('startDifficulty');
  const buttons = document.querySelectorAll('button[data-mode]');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      const difficulty = difficultyEl.value;
      const url = `/gobang2/?mode=${encodeURIComponent(mode)}&difficulty=${encodeURIComponent(difficulty)}`;
      window.location.href = url;
    });
  });
})();
