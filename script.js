/* =====================================================================
   SmartRenoCalc — script.js
   Pure vanilla JavaScript. Zero external dependencies.
   Safe to include, unmodified, on every page of the site.
   ===================================================================== */
(function () {
  'use strict';

  /* -------------------------------------------------------------------
     1. Reference dataset
     ------------------------------------------------------------------- */
  var PROJECT_DATA = {
    kitchen: {
      label: 'Kitchen Remodel',
      sqftRange: { min: 50, max: 800, default: 200 },
      costPerSqFt: { budget: [75, 150], midRange: [150, 250], highEnd: [250, 425] },
      roiPercent: { budget: 85, midRange: 70, highEnd: 50 }
    },
    bathroom: {
      label: 'Bathroom Remodel',
      sqftRange: { min: 20, max: 300, default: 50 },
      costPerSqFt: { budget: [80, 150], midRange: [180, 280], highEnd: [300, 500] },
      roiPercent: { budget: 70, midRange: 63, highEnd: 45 }
    },
    fullhouse: {
      label: 'Full House Renovation',
      sqftRange: { min: 500, max: 8000, default: 1800 },
      costPerSqFt: { budget: [15, 30], midRange: [40, 70], highEnd: [100, 150] },
      roiPercent: { budget: 65, midRange: 55, highEnd: 45 }
    },
    basement: {
      label: 'Basement Finishing',
      sqftRange: { min: 200, max: 3000, default: 800 },
      costPerSqFt: { budget: [25, 45], midRange: [50, 80], highEnd: [90, 150] },
      roiPercent: { budget: 75, midRange: 71, highEnd: 65 }
    },
    roof: {
      label: 'Roof Replacement',
      sqftRange: { min: 500, max: 6000, default: 2000 },
      costPerSqFt: { budget: [4.5, 7], midRange: [7, 12], highEnd: [13, 30] },
      roiPercent: { budget: 68, midRange: 62, highEnd: 55 }
    },
    attic: {
      label: 'Attic Conversion',
      sqftRange: { min: 100, max: 1500, default: 400 },
      costPerSqFt: { budget: [80, 120], midRange: [120, 165], highEnd: [165, 250] },
      roiPercent: { budget: 68, midRange: 65, highEnd: 55 }
    }
  };

  // Keyed by the FIRST DIGIT of the ZIP code (standard USPS ZIP prefix regions)
  var REGION_MULTIPLIERS = {
    '0': { name: 'Northeast (New England & NJ)', multiplier: 1.28 },
    '1': { name: 'Mid-Atlantic (NY, PA, DE)', multiplier: 1.22 },
    '2': { name: 'Capital & Mid-Atlantic South (DC, MD, VA, NC, SC, WV)', multiplier: 1.08 },
    '3': { name: 'Southeast (FL, GA, AL, MS, TN)', multiplier: 0.95 },
    '4': { name: 'Great Lakes (OH, MI, IN, KY)', multiplier: 0.90 },
    '5': { name: 'Upper Midwest (WI, MN, IA, ND, SD, MT)', multiplier: 0.88 },
    '6': { name: 'Central Midwest (IL, MO, KS, NE)', multiplier: 0.92 },
    '7': { name: 'South Central (TX, OK, AR, LA)', multiplier: 0.93 },
    '8': { name: 'Mountain West (CO, AZ, UT, NV, NM, ID, WY)', multiplier: 1.05 },
    '9': { name: 'Pacific (CA, OR, WA, HI, AK)', multiplier: 1.35 }
  };

  var ADDONS = {
    permits: { label: 'Permits & Inspection Fees', type: 'flat', amount: 1200 },
    structural: { label: 'Structural Changes (load-bearing wall, foundation work)', type: 'percent', amount: 0.12 },
    smartHome: { label: 'Smart Home Integration', type: 'flat', amount: 3500 }
  };

  var BREAKDOWN_SPLIT = { materials: 0.45, labor: 0.55 };
  var CONTINGENCY_RATE = 0.12;

  // Set to 1.0 for the 2026 baseline. In future years, without re-researching
  // every base cost, increase by roughly 0.03-0.05 per year (e.g. 1.04 for 2027).
  var INFLATION_ADJUSTMENT_FACTOR = 1.0;

  var TIER_KEYS = ['budget', 'midRange', 'highEnd'];

  /* -------------------------------------------------------------------
     2. Small utilities
     ------------------------------------------------------------------- */
  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0
    }).format(roundToNearestHundred(value));
  }

  function roundToNearestHundred(value) {
    return Math.round(value / 100) * 100;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /* -------------------------------------------------------------------
     3. Site-wide behavior (runs on every page)
     ------------------------------------------------------------------- */
  function initYearStamp() {
    var el = document.getElementById('year');
    if (el) { el.textContent = new Date().getFullYear(); }
  }

  function initNavToggle() {
    var toggle = document.querySelector('.nav-toggle');
    var list = document.querySelector('.nav-list');
    if (!toggle || !list) { return; }
    toggle.addEventListener('click', function () {
      var isOpen = list.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  /* -------------------------------------------------------------------
     4. Calculator page logic
     ------------------------------------------------------------------- */
  function initCalculatorPage() {
    var form = document.getElementById('calculator-form');
    if (!form) { return; }

    var els = {
      form: form,
      projectRadios: form.querySelectorAll('input[name="projectType"]'),
      sqftRange: document.getElementById('sqft-range'),
      sqftNumber: document.getElementById('sqft-number'),
      sqftUnitHint: document.getElementById('sqft-hint'),
      zipInput: document.getElementById('zip-input'),
      zipError: document.getElementById('zip-error'),
      regionHint: document.getElementById('region-hint'),
      tierRadios: form.querySelectorAll('input[name="qualityTier"]'),
      addonPermits: document.getElementById('addon-permits'),
      addonStructural: document.getElementById('addon-structural'),
      addonSmartHome: document.getElementById('addon-smart-home'),
      calculateBtn: document.getElementById('calculate-btn'),
      resultsSection: document.getElementById('results'),
      resultsEmpty: document.getElementById('results-empty'),
      resultsContent: document.getElementById('results-content'),
      totalFigure: document.getElementById('result-total-figure'),
      totalAccent: document.getElementById('result-total-accent'),
      costPerSqFt: document.getElementById('result-cost-per-sqft'),
      materialsBar: document.getElementById('bar-materials'),
      materialsValue: document.getElementById('value-materials'),
      laborBar: document.getElementById('bar-labor'),
      laborValue: document.getElementById('value-labor'),
      contingencyBar: document.getElementById('bar-contingency'),
      contingencyValue: document.getElementById('value-contingency'),
      addonsSelected: document.getElementById('addons-selected'),
      addonsSelectedList: document.getElementById('addons-selected-list'),
      roiNote: document.getElementById('roi-note'),
      resetBtn: document.getElementById('reset-btn'),
      printBtn: document.getElementById('print-btn'),
      stickyBar: document.getElementById('sticky-summary-bar'),
      stickyFigure: document.getElementById('sticky-figure'),
      printProjectType: document.getElementById('print-project-type'),
      printSqft: document.getElementById('print-sqft'),
      printZip: document.getElementById('print-zip'),
      printTier: document.getElementById('print-tier'),
      printDate: document.getElementById('print-date')
    };

    var hasCalculatedOnce = false;
    var lastTotals = { low: 0, high: 0 };

    function getSelectedProjectKey() {
      var checked = form.querySelector('input[name="projectType"]:checked');
      return checked ? checked.value : 'kitchen';
    }

    function getSelectedTierKey() {
      var checked = form.querySelector('input[name="qualityTier"]:checked');
      return checked ? checked.value : 'midRange';
    }

    function applySqftRangeForProject(projectKey, preserveRatio) {
      var range = PROJECT_DATA[projectKey].sqftRange;
      var prevMin = parseFloat(els.sqftRange.min) || range.min;
      var prevMax = parseFloat(els.sqftRange.max) || range.max;
      var prevVal = parseFloat(els.sqftRange.value) || range.default;
      var ratio = preserveRatio && prevMax > prevMin ? (prevVal - prevMin) / (prevMax - prevMin) : null;

      els.sqftRange.min = range.min;
      els.sqftRange.max = range.max;
      els.sqftNumber.min = range.min;
      els.sqftNumber.max = range.max;

      var newVal = ratio === null ? range.default : Math.round(range.min + ratio * (range.max - range.min));
      newVal = clamp(newVal, range.min, range.max);
      els.sqftRange.value = newVal;
      els.sqftNumber.value = newVal;
      if (els.sqftUnitHint) {
        els.sqftUnitHint.textContent = 'Typical range for this project: ' + range.min + '\u2013' + range.max + ' sq ft.';
      }
    }

    function getFormState() {
      return {
        projectType: getSelectedProjectKey(),
        sqft: clamp(parseFloat(els.sqftNumber.value) || 0, 1, 100000),
        zip: els.zipInput.value.trim(),
        tier: getSelectedTierKey(),
        addons: {
          permits: els.addonPermits.checked,
          structural: els.addonStructural.checked,
          smartHome: els.addonSmartHome.checked
        }
      };
    }

    function validateZip(zip) {
      return /^[0-9]{5}$/.test(zip);
    }

    function getRegionForZip(zip) {
      if (!validateZip(zip)) { return null; }
      return REGION_MULTIPLIERS[zip.charAt(0)];
    }

    function calculateEstimate(state) {
      var project = PROJECT_DATA[state.projectType];
      var region = getRegionForZip(state.zip);
      if (!region) { return null; }

      var costRange = project.costPerSqFt[state.tier];
      var sqft = state.sqft;

      var baseLow = sqft * costRange[0] * region.multiplier * INFLATION_ADJUSTMENT_FACTOR;
      var baseHigh = sqft * costRange[1] * region.multiplier * INFLATION_ADJUSTMENT_FACTOR;
      var baseMid = (baseLow + baseHigh) / 2;

      var addonTotal = 0;
      var addonBreakdown = [];
      if (state.addons.permits) {
        addonTotal += ADDONS.permits.amount;
        addonBreakdown.push({ label: ADDONS.permits.label, amount: ADDONS.permits.amount });
      }
      if (state.addons.structural) {
        var structuralCost = ADDONS.structural.amount * baseMid;
        addonTotal += structuralCost;
        addonBreakdown.push({ label: ADDONS.structural.label, amount: structuralCost });
      }
      if (state.addons.smartHome) {
        addonTotal += ADDONS.smartHome.amount;
        addonBreakdown.push({ label: ADDONS.smartHome.label, amount: ADDONS.smartHome.amount });
      }

      var subtotalLow = baseLow + addonTotal;
      var subtotalHigh = baseHigh + addonTotal;
      var subtotalMid = (subtotalLow + subtotalHigh) / 2;

      var materials = subtotalMid * BREAKDOWN_SPLIT.materials;
      var labor = subtotalMid * BREAKDOWN_SPLIT.labor;
      var contingency = subtotalMid * CONTINGENCY_RATE;

      var totalLow = subtotalLow + subtotalLow * CONTINGENCY_RATE;
      var totalHigh = subtotalHigh + subtotalHigh * CONTINGENCY_RATE;
      var totalMid = (totalLow + totalHigh) / 2;

      var costPerSqFtFinal = totalMid / sqft;

      var roiPct = project.roiPercent[state.tier];
      var roiLow = totalLow * (roiPct / 100);
      var roiHigh = totalHigh * (roiPct / 100);

      return {
        projectLabel: project.label,
        regionName: region.name,
        totalLow: totalLow, totalHigh: totalHigh,
        costPerSqFt: costPerSqFtFinal,
        materials: materials, labor: labor, contingency: contingency,
        subtotalMid: subtotalMid,
        addonBreakdown: addonBreakdown,
        roiPct: roiPct, roiLow: roiLow, roiHigh: roiHigh,
        tierKey: state.tier
      };
    }

    function animateCountUp(el, from, to, formatFn, duration) {
      duration = duration || 700;
      if (prefersReducedMotion()) {
        el.textContent = formatFn(to);
        return;
      }
      var start = null;
      function step(timestamp) {
        if (start === null) { start = timestamp; }
        var progress = Math.min((timestamp - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = from + (to - from) * eased;
        el.textContent = formatFn(current);
        if (progress < 1) { window.requestAnimationFrame(step); }
      }
      window.requestAnimationFrame(step);
    }

    function updateStickySummaryBar(results) {
      if (!els.stickyBar) { return; }
      if (window.innerWidth >= 1024 || !hasCalculatedOnce) {
        els.stickyBar.classList.remove('is-visible');
        return;
      }
      els.stickyFigure.textContent = formatCurrency(results.totalLow) + '\u2013' + formatCurrency(results.totalHigh);
      els.stickyBar.classList.add('is-visible');
    }

    function renderResults(results) {
      els.resultsEmpty.style.display = 'none';
      els.resultsContent.style.display = 'block';

      animateCountUp(els.totalFigure, lastTotals.low, results.totalLow, function (v) {
        return formatCurrency(v) + '\u2013' + formatCurrency(results.totalHigh);
      });
      lastTotals.low = results.totalLow;
      lastTotals.high = results.totalHigh;

      var accentColors = { budget: 'var(--color-slate-500)', midRange: 'var(--color-navy-500)', highEnd: 'var(--color-emerald-600)' };
      els.totalAccent.style.background = accentColors[results.tierKey];

      els.costPerSqFt.textContent = formatCurrency(results.costPerSqFt) + ' / sq ft';

      var subtotalForBars = results.materials + results.labor + results.contingency;
      els.materialsBar.style.width = ((results.materials / subtotalForBars) * 100).toFixed(0) + '%';
      els.materialsValue.textContent = formatCurrency(results.materials) + ' (' + Math.round(BREAKDOWN_SPLIT.materials * 100) + '%)';
      els.laborBar.style.width = ((results.labor / subtotalForBars) * 100).toFixed(0) + '%';
      els.laborValue.textContent = formatCurrency(results.labor) + ' (' + Math.round(BREAKDOWN_SPLIT.labor * 100) + '%)';
      els.contingencyBar.style.width = ((results.contingency / subtotalForBars) * 100).toFixed(0) + '%';
      els.contingencyValue.textContent = formatCurrency(results.contingency) + ' (' + Math.round(CONTINGENCY_RATE * 100) + '%)';

      if (results.addonBreakdown.length > 0) {
        els.addonsSelected.style.display = 'block';
        els.addonsSelectedList.innerHTML = '';
        results.addonBreakdown.forEach(function (addon) {
          var li = document.createElement('li');
          var nameSpan = document.createElement('span');
          nameSpan.textContent = addon.label;
          var valueSpan = document.createElement('span');
          valueSpan.textContent = formatCurrency(addon.amount);
          li.appendChild(nameSpan);
          li.appendChild(valueSpan);
          els.addonsSelectedList.appendChild(li);
        });
      } else {
        els.addonsSelected.style.display = 'none';
      }

      els.roiNote.innerHTML =
        '<p>Projects like this typically recoup about ' + results.roiPct + '% of their cost at resale \u2014 an estimated ' +
        formatCurrency(results.roiLow) + '\u2013' + formatCurrency(results.roiHigh) + ' added to your home\u2019s value.</p>' +
        '<p>ROI varies by home price tier, local market, and timing of sale.</p>';

      // Print-only summary
      if (els.printProjectType) { els.printProjectType.textContent = results.projectLabel; }
      if (els.printSqft) { els.printSqft.textContent = els.sqftNumber.value + ' sq ft'; }
      if (els.printZip) { els.printZip.textContent = els.zipInput.value + ' (' + results.regionName + ')'; }
      if (els.printTier) {
        var tierLabels = { budget: 'Budget / Essential', midRange: 'Mid-Range / Standard', highEnd: 'High-End / Luxury' };
        els.printTier.textContent = tierLabels[results.tierKey];
      }
      if (els.printDate) { els.printDate.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }

      updateStickySummaryBar(results);
    }

    function tryCalculateAndRender(scrollToResults) {
      var state = getFormState();

      if (!validateZip(state.zip)) {
        if (state.zip.length > 0) {
          els.zipInput.classList.add('is-invalid');
          els.zipError.classList.add('is-visible');
        }
        els.regionHint.classList.remove('is-visible');
        return;
      }
      els.zipInput.classList.remove('is-invalid');
      els.zipError.classList.remove('is-visible');

      var region = getRegionForZip(state.zip);
      els.regionHint.textContent = 'Region: ' + region.name;
      els.regionHint.classList.add('is-visible');

      var results = calculateEstimate(state);
      if (!results) { return; }

      if (!hasCalculatedOnce) {
        hasCalculatedOnce = true;
      }
      renderResults(results);

      if (scrollToResults) {
        els.resultsSection.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
    }

    function handleRecalculateIfActive() {
      if (hasCalculatedOnce) {
        tryCalculateAndRender(false);
      }
    }

    function syncSliderAndNumberInput() {
      els.sqftRange.addEventListener('input', function () {
        els.sqftNumber.value = els.sqftRange.value;
        handleRecalculateIfActive();
      });
      els.sqftNumber.addEventListener('input', function () {
        var min = parseFloat(els.sqftNumber.min);
        var max = parseFloat(els.sqftNumber.max);
        var val = clamp(parseFloat(els.sqftNumber.value) || min, min, max);
        els.sqftRange.value = val;
        handleRecalculateIfActive();
      });
    }

    function initZipValidationLive() {
      els.zipInput.addEventListener('input', function () {
        els.zipInput.value = els.zipInput.value.replace(/[^0-9]/g, '').slice(0, 5);
        if (els.zipInput.value.length === 5) {
          handleRecalculateIfActive();
          if (!validateZip(els.zipInput.value)) {
            els.zipInput.classList.add('is-invalid');
            els.zipError.classList.add('is-visible');
          } else {
            els.zipInput.classList.remove('is-invalid');
            els.zipError.classList.remove('is-visible');
            var region = getRegionForZip(els.zipInput.value);
            els.regionHint.textContent = 'Region: ' + region.name;
            els.regionHint.classList.add('is-visible');
          }
        } else {
          els.zipError.classList.remove('is-visible');
          els.regionHint.classList.remove('is-visible');
        }
      });
      els.zipInput.addEventListener('blur', function () {
        if (els.zipInput.value.length > 0 && !validateZip(els.zipInput.value)) {
          els.zipInput.classList.add('is-invalid');
          els.zipError.classList.add('is-visible');
        }
      });
    }

    function initProjectTypeCards() {
      els.projectRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
          applySqftRangeForProject(radio.value, false);
          handleRecalculateIfActive();
        });
      });
    }

    function initTierCards() {
      els.tierRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
          handleRecalculateIfActive();
        });
      });
    }

    function initAddonCheckboxes() {
      [els.addonPermits, els.addonStructural, els.addonSmartHome].forEach(function (checkbox) {
        checkbox.addEventListener('change', handleRecalculateIfActive);
      });
    }

    function resetForm() {
      form.reset();
      applySqftRangeForProject('kitchen', false);
      els.zipInput.value = '';
      els.zipInput.classList.remove('is-invalid');
      els.zipError.classList.remove('is-visible');
      els.regionHint.classList.remove('is-visible');
      hasCalculatedOnce = false;
      lastTotals = { low: 0, high: 0 };
      els.resultsEmpty.style.display = 'block';
      els.resultsContent.style.display = 'none';
      els.stickyBar.classList.remove('is-visible');
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }

    function handlePrint() {
      window.print();
    }

    // Wire everything up
    applySqftRangeForProject(getSelectedProjectKey(), false);
    syncSliderAndNumberInput();
    initZipValidationLive();
    initProjectTypeCards();
    initTierCards();
    initAddonCheckboxes();

    els.calculateBtn.addEventListener('click', function () {
      tryCalculateAndRender(true);
    });
    els.resetBtn.addEventListener('click', resetForm);
    els.printBtn.addEventListener('click', handlePrint);
    els.stickyBar.addEventListener('click', function () {
      els.resultsSection.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });
    window.addEventListener('resize', function () {
      if (hasCalculatedOnce) {
        var state = getFormState();
        var results = calculateEstimate(state);
        if (results) { updateStickySummaryBar(results); }
      }
    });
  }

  /* -------------------------------------------------------------------
     5. Boot
     ------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initYearStamp();
    initNavToggle();
    initCalculatorPage();
  });
})();
