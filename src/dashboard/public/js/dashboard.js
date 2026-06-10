// Void Bot Dashboard - Interactive Features

// Toggle feature on/off
document.querySelectorAll('input[data-feature]').forEach(input => {
  input.addEventListener('change', async () => {
    const guildId = input.dataset.guild;
    const feature = input.dataset.feature;
    const enabled = input.checked;

    try {
      const res = await fetch(`/api/${guildId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, enabled }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${feature.split('.')[0]} ${enabled ? 'enabled' : 'disabled'}`, 'success');
      } else {
        input.checked = !enabled;
        showToast(data.error || 'Failed to update', 'error');
      }
    } catch (err) {
      input.checked = !enabled;
      showToast('Network error', 'error');
    }
  });
});

// Save all settings on the page
async function saveSettings(guildId) {
  const updates = {};

  // Collect all setting inputs
  document.querySelectorAll('[data-setting]').forEach(el => {
    const key = el.dataset.setting;
    if (el.type === 'checkbox') {
      updates[key] = el.checked;
    } else if (el.type === 'number') {
      updates[key] = Number(el.value);
    } else if (el.tagName === 'TEXTAREA') {
      // Check if it's a comma-separated list (like badWords)
      if (key.includes('badWords')) {
        updates[key] = el.value.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        updates[key] = el.value;
      }
    } else {
      updates[key] = el.value;
    }
  });

  try {
    const res = await fetch(`/api/${guildId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Settings saved!', 'success');
    } else {
      showToast(data.error || 'Failed to save', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

// Toast notification
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}
