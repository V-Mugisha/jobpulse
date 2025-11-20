(function(){
  function qs(selector, root=document){ return root.querySelector(selector); }

  function getFilterPanel() {
    return document.querySelector('[data-component] .filters-panel') || document.querySelector('[data-component="filters"] .filters-panel');
  }

  function openPanel(panel){
    if(!panel) return;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden','false');
  }
  function closePanel(panel){
    if(!panel) return;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden','true');
  }

  function togglePanel(panel){
    if(!panel) return;
    if(panel.classList.contains('open')) closePanel(panel); else openPanel(panel);
  }

  function readFilters(panel){
    if(!panel) return null;
    const employment = Array.from(panel.querySelectorAll('input[name="employment"]:checked')).map(n=>n.value);
    const experience = Array.from(panel.querySelectorAll('input[name="experience"]:checked')).map(n=>n.value);
    const min = parseInt(panel.querySelector('.range-min').value,10);
    const max = parseInt(panel.querySelector('.range-max').value,10);
    return { employment, experience, salaryK: { min, max } };
  }

  function wire(panel){
    if(!panel) return;
    // toggle close button
    const applyBtn = panel.querySelector('[data-action="apply-filters"]');
    const minEl = panel.querySelector('.range-min');
    const maxEl = panel.querySelector('.range-max');
    const minLabel = panel.querySelector('.min-val');
    const maxLabel = panel.querySelector('.max-val');

    if(applyBtn) applyBtn.addEventListener('click', ()=>{
      const data = readFilters(panel);
      console.log('Applied filters:', data);
      // For now just log; later will apply to results
    });

    // Simple numeric inputs for min/max salary (no slider)
    if (minEl && maxEl) {
      function updateLabelsFromInputs() {
        let minV = parseInt(minEl.value, 10);
        let maxV = parseInt(maxEl.value, 10);
        if (Number.isNaN(minV)) minV = 0;
        if (Number.isNaN(maxV)) maxV = 0;
        // keep values consistent
        if (minV > maxV) {
          // if min is greater than max, set max = min
          maxV = minV;
          maxEl.value = String(maxV);
        }
        if (minLabel) minLabel.textContent = `$${minV}K`;
        if (maxLabel) maxLabel.textContent = `$${maxV}K`;
      }
      minEl.addEventListener('input', updateLabelsFromInputs);
      maxEl.addEventListener('input', updateLabelsFromInputs);
      // initialize labels
      updateLabelsFromInputs();
    }
  }

  function init(){
    const panel = document.querySelector('[data-component="filters"] .filters-panel');
    // keep filters panel open permanently
    if(panel) {
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      wire(panel);
    }
  }

  document.addEventListener('components:loaded', init);
  document.addEventListener('DOMContentLoaded', ()=>{
    // if components already present, init after short delay to allow injection
    setTimeout(init, 50);
  });
})();
