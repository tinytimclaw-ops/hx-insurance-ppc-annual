// Form state
const formData = {
  coverType: 'single', // Default to single trip
  region: null,
  destId: null,
  startDate: null,
  endDate: null,
  travellers: [],
  holidayValue: null,
  certificateID: null,
  hash: null,
  policySubtype: 'non-medical'
};

// Get agent code from URL param or default
const agent = new URLSearchParams(window.location.search).get('agent') || 'WT411';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeForm();
  setupEventListeners();
  updateComparisonVisibility();
});

function initializeForm() {
  // Set minimum start date to today
  const today = new Date().toISOString().split('T')[0];
  const startDateInput = document.getElementById('startDate');
  if (startDateInput) {
    startDateInput.setAttribute('min', today);
    startDateInput.value = datePlus(1); // Default to tomorrow
  }

  // Set default end date (7 days from start)
  const endDateInput = document.getElementById('endDate');
  if (endDateInput) {
    endDateInput.value = datePlus(8);
    endDateInput.setAttribute('min', datePlus(1));
  }

  // Initialize annual start date
  const annualStartInput = document.getElementById('annualStart');
  if (annualStartInput) {
    annualStartInput.setAttribute('min', today);
    annualStartInput.value = datePlus(1);
  }

  // Initialize traveller details
  handleTravellerCountChange();
}

function setupEventListeners() {
  // Region selection
  const regionSelect = document.getElementById('region');
  if (regionSelect) {
    regionSelect.addEventListener('change', handleRegionChange);
  }

  // Start date changes
  const startDateInput = document.getElementById('startDate');
  if (startDateInput) {
    startDateInput.addEventListener('change', handleStartDateChange);
  }

  // End date changes
  const endDateInput = document.getElementById('endDate');
  if (endDateInput) {
    endDateInput.addEventListener('change', (e) => {
      formData.endDate = e.target.value;
    });
  }

  // Traveller count changes
  const travellerCountSelect = document.getElementById('travellerCount');
  if (travellerCountSelect) {
    travellerCountSelect.addEventListener('change', handleTravellerCountChange);
  }

  // Holiday value - fire certificate in background when selected
  const holidayValueSelect = document.getElementById('holidayValue');
  if (holidayValueSelect) {
    holidayValueSelect.addEventListener('change', handleHolidayValueChange);
  }

  // Medical conditions
  const medicalConditionsInputs = document.querySelectorAll('input[name="medicalConditions"]');
  medicalConditionsInputs.forEach(input => {
    input.addEventListener('change', handleMedicalConditionsChange);
  });

  // Undiagnosed symptoms
  const symptomInputs = document.querySelectorAll('input[name="undiagnosedSymptoms"]');
  symptomInputs.forEach(input => {
    input.addEventListener('change', handleSymptomChange);
  });

  // Form submission
  const form = document.getElementById('quoteForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

// Cover type switching
function switchCoverType(type) {
  formData.coverType = type;
  document.getElementById('coverType').value = type;

  // Update toggle buttons
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  // Update form visibility
  const singleTripDates = document.getElementById('singleTripDates');
  const annualStartDate = document.getElementById('annualStartDate');

  if (type === 'single') {
    singleTripDates.style.display = 'block';
    annualStartDate.style.display = 'none';

    // Make single trip dates required
    document.getElementById('startDate').required = true;
    document.getElementById('endDate').required = true;
    document.getElementById('annualStart').required = false;
  } else {
    singleTripDates.style.display = 'none';
    annualStartDate.style.display = 'block';

    // Make annual start required
    document.getElementById('startDate').required = false;
    document.getElementById('endDate').required = false;
    document.getElementById('annualStart').required = true;
  }

  // Update value message
  updateValueMessage(type);

  // Update comparison section visibility
  updateComparisonVisibility();

  // Recalculate destination ID
  calculateDestinationId();
}

function updateValueMessage(type) {
  const valueMessage = document.getElementById('valueMessage');
  if (type === 'single') {
    valueMessage.innerHTML = '💡 <strong>Taking 2+ trips?</strong> Annual could save you money';
  } else {
    valueMessage.innerHTML = '✓ <strong>Smart choice!</strong> Unlimited trips up to 31 days each';
  }
}

function updateComparisonVisibility() {
  const comparisonSection = document.getElementById('comparisonSection');
  if (comparisonSection) {
    // Only show comparison if user selected single trip
    comparisonSection.style.display = formData.coverType === 'single' ? 'block' : 'none';
  }
}

function scrollToForm() {
  const form = document.getElementById('quoteForm');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Region and destination handling
function handleRegionChange(e) {
  const region = e.target.value;
  formData.region = region;

  const europeQuestion = document.getElementById('europeQuestion');
  const worldwideQuestion = document.getElementById('worldwideQuestion');

  if (europeQuestion) {
    europeQuestion.style.display = region === 'Europe' ? 'block' : 'none';
  }
  if (worldwideQuestion) {
    worldwideQuestion.style.display = region === 'Worldwide' ? 'block' : 'none';
  }

  // Calculate initial dest_id
  calculateDestinationId();
}

function calculateDestinationId() {
  const { coverType, region } = formData;

  if (!region) return;

  const europeHighRisk = document.getElementById('europeHighRisk')?.checked || false;
  const worldwideUSA = document.getElementById('worldwideUSA')?.checked || false;

  // Destination ID mapping from insurance_search.md
  const destMap = {
    'single-UK': 1,
    'single-Europe-no': 6,
    'single-Europe-yes': 7,
    'single-ANZ': 4,
    'single-Worldwide-no': 5,
    'single-Worldwide-yes': 3,
    'annual-UK': 1,
    'annual-Europe': 7, // annual Europe is always 7
    'annual-ANZ': 5,
    'annual-Worldwide-no': 5,
    'annual-Worldwide-yes': 3
  };

  let key = `${coverType}-${region}`;

  if (region === 'Europe' && coverType === 'single') {
    key += europeHighRisk ? '-yes' : '-no';
  } else if (region === 'Worldwide') {
    key += worldwideUSA ? '-yes' : '-no';
  }

  formData.destId = destMap[key] || 1;
}

// Date handling
function handleStartDateChange(e) {
  formData.startDate = e.target.value;

  const endDateInput = document.getElementById('endDate');
  if (endDateInput && formData.coverType === 'single') {
    // Set minimum end date to start date
    endDateInput.setAttribute('min', formData.startDate);

    // If end date is before start date, adjust it
    if (endDateInput.value && endDateInput.value < formData.startDate) {
      const defaultEnd = new Date(formData.startDate);
      defaultEnd.setDate(defaultEnd.getDate() + 7);
      endDateInput.value = defaultEnd.toISOString().split('T')[0];
      formData.endDate = endDateInput.value;
    }
  }
}

// Traveller handling
function handleTravellerCountChange() {
  const count = parseInt(document.getElementById('travellerCount').value);
  const container = document.getElementById('travellerDetails');

  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'traveller-card';
    card.innerHTML = `
      <div class="traveller-header">Traveller ${i + 1}</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Title</label>
          <select class="form-control traveller-title" data-index="${i}" required>
            <option value="">Select</option>
            <option value="Mr">Mr</option>
            <option value="Mrs">Mrs</option>
            <option value="Ms">Ms</option>
            <option value="Miss">Miss</option>
            <option value="Dr">Dr</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">First name</label>
          <input type="text" class="form-control traveller-firstname" data-index="${i}" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Last name</label>
          <input type="text" class="form-control traveller-lastname" data-index="${i}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Date of birth</label>
          <input type="date" class="form-control traveller-dob" data-index="${i}" max="${getMaxDob()}" required>
        </div>
      </div>
    `;
    container.appendChild(card);
  }
}

function getMaxDob() {
  const today = new Date();
  today.setFullYear(today.getFullYear() - 18); // Minimum age 18
  return today.toISOString().split('T')[0];
}

function collectTravellerData() {
  const count = parseInt(document.getElementById('travellerCount').value);
  const travellers = [];

  for (let i = 0; i < count; i++) {
    const title = document.querySelector(`.traveller-title[data-index="${i}"]`).value;
    const firstName = document.querySelector(`.traveller-firstname[data-index="${i}"]`).value;
    const lastName = document.querySelector(`.traveller-lastname[data-index="${i}"]`).value;
    const dobInput = document.querySelector(`.traveller-dob[data-index="${i}"]`).value;

    travellers.push({
      title,
      first_name: firstName,
      last_name: lastName,
      dob: dobInput // Already in YYYY-MM-DD format
    });
  }

  formData.travellers = travellers;
}

// Holiday value - fire certificate in background
function handleHolidayValueChange(e) {
  formData.holidayValue = parseInt(e.target.value);

  // Fire certificate call immediately in background with non-medical subtype
  // Per insurance_search.md: "After collecting cost: immediately fire the HAPI certificate call"
  if (formData.startDate && formData.endDate && formData.destId && formData.travellers.length > 0) {
    formData.policySubtype = 'non-medical';
    callHapiCertificateBackground();
  }
}

async function callHapiCertificateBackground() {
  try {
    collectTravellerData(); // Ensure traveller data is current

    const sid = generateRandomHex(32);
    const certResponse = await fetch(
      `https://hapi.holidayextras.co.uk/insurance/certificates/new?token=4ad4966f-0b6a-49a9-8601-2a456aeb5c03&sid=${sid}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: formData.startDate,
          to: formData.endDate,
          destination_id: formData.destId,
          agent: agent,
          policySubtype: formData.policySubtype,
          holidayValue: formData.holidayValue,
          family_group_id: 1,
          country: 'GBR',
          cruise: false,
          email: null,
          unrecSend: 1,
          renewal: 0,
          people: formData.travellers
        })
      }
    );

    if (certResponse.ok) {
      const certData = await certResponse.json();
      formData.certificateID = certData.certificateID;
      formData.hash = certData.insHash;
      console.log('Background certificate created:', certData.certificateID);
    }
  } catch (error) {
    console.error('Background certificate API error:', error);
  }
}

// Medical screening
function handleMedicalConditionsChange(e) {
  const symptomQuestion = document.getElementById('symptomQuestion');

  if (e.target.value === 'no') {
    if (symptomQuestion) {
      symptomQuestion.style.display = 'block';
    }
    formData.policySubtype = 'non-medical';
    // Keep the non-medical cert that was fired after holiday cost
  } else {
    if (symptomQuestion) {
      symptomQuestion.style.display = 'none';
    }
    formData.policySubtype = 'medical';

    // Fire new certificate with medical subtype
    // Per insurance_search.md: "Yes → fire a new HAPI cert with policySubtype: 'medical'"
    if (formData.holidayValue && formData.startDate && formData.endDate && formData.destId && formData.travellers.length > 0) {
      callHapiCertificateBackground();
    }
  }
}

function handleSymptomChange(e) {
  const symptomWarning = document.getElementById('symptomWarning');

  if (symptomWarning) {
    if (e.target.value === 'yes') {
      symptomWarning.style.display = 'block';
    } else {
      symptomWarning.style.display = 'none';
    }
  }
}

// Form submission and redirect
async function handleFormSubmit(e) {
  e.preventDefault();

  // Validate form
  if (!validateForm()) {
    return;
  }

  // Show loading
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
  }

  // Collect all form data
  if (formData.coverType === 'single') {
    formData.startDate = document.getElementById('startDate').value;
    formData.endDate = document.getElementById('endDate').value;
  } else {
    formData.startDate = document.getElementById('annualStart').value;
    // Annual: end date is start + 1 year - 1 day
    const start = new Date(formData.startDate);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    formData.endDate = end.toISOString().split('T')[0];
  }

  calculateDestinationId();
  collectTravellerData();
  formData.holidayValue = parseInt(document.getElementById('holidayValue').value);

  // Get medical answer
  const medicalConditions = document.querySelector('input[name="medicalConditions"]:checked')?.value;

  // Certificate was already fired in background after holiday cost selection
  // Just use the existing certificateID and hash from formData

  // Build redirect URL
  const redirectUrl = buildRedirectUrl(medicalConditions === 'yes');

  // Redirect
  window.location.href = redirectUrl;
}

function validateForm() {
  const requiredInputs = document.querySelectorAll('[required]');
  let isValid = true;
  let firstInvalid = null;

  requiredInputs.forEach(input => {
    // Skip hidden inputs
    if (input.offsetParent === null) return;

    if (input.type === 'radio') {
      const radioGroup = document.querySelectorAll(`[name="${input.name}"]`);
      const checked = Array.from(radioGroup).some(radio => radio.checked);
      if (!checked && !firstInvalid) {
        isValid = false;
        firstInvalid = input;
        input.parentElement.style.borderColor = '#FF5F68';
      }
    } else if (!input.value) {
      isValid = false;
      if (!firstInvalid) {
        firstInvalid = input;
      }
      input.style.borderColor = '#FF5F68';
    } else {
      input.style.borderColor = '#E0E0E0';
    }
  });

  if (!isValid) {
    alert('Please fill in all required fields');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return isValid;
}

async function callHapiCertificate() {
  const sid = generateRandomHex(32);

  const requestBody = {
    from: formData.startDate,
    to: formData.endDate,
    destination_id: formData.destId,
    agent: agent,
    policySubtype: formData.policySubtype,
    holidayValue: formData.holidayValue,
    family_group_id: 1,
    country: 'GBR',
    cruise: false,
    email: null,
    unrecSend: 1,
    renewal: 0,
    people: formData.travellers
  };

  const response = await fetch(
    `https://hapi.holidayextras.co.uk/insurance/certificates/new?token=4ad4966f-0b6a-49a9-8601-2a456aeb5c03&sid=${sid}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    throw new Error('Certificate API call failed');
  }

  return await response.json();
}

function buildRedirectUrl(isMedical) {
  const baseUrl = 'https://www.holidayextras.com/static/?selectProduct=ins&#/insurance';
  const path = isMedical ? '/medicalScreening' : '';

  const params = new URLSearchParams({
    agent: agent,
    ppts: '',
    customer_ref: '',
    annual_only: formData.coverType === 'annual' ? '1' : '0',
    out: formData.startDate,
    in: formData.endDate,
    destination: '',
    destination_id: formData.destId.toString(),
    travellers: formData.travellers.length.toString(),
    renewal: '0',
    cruise: '0',
    winterSports: '0',
    carHireExcess: '0',
    unrecSend: '0',
    holidayValue: formData.holidayValue.toString(),
    familyGroupID: '1',
    policySubtype: formData.policySubtype
  });

  if (formData.certificateID) {
    params.set('certificateID', formData.certificateID.toString());
    params.set('hash', formData.hash);
  }

  return `${baseUrl}${path}?${params.toString()}`;
}

// Utilities
function datePlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function generateRandomHex(length) {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
