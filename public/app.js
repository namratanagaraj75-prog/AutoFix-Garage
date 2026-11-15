'use strict'

const messageBox = document.getElementById('message')
const baysTable = document.getElementById('bays-table')
const mechanicsTable = document.getElementById('mechanics-table')
const assignmentsTable = document.getElementById('assignments-table')

let currentBays = []
let currentMechanics = []
let currentAssignments = []

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

async function apiRequest(url, options = {}) {
  let response
  try {
    response = await fetch(url, options)
  } catch {
    throw new Error('Could not reach the API. Check that the server is running.')
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.success === false) {
    throw new Error(body.error || `Request failed with status ${response.status}`)
  }
  return body
}

function showMessage(text, isSuccess = false) {
  messageBox.textContent = text
  messageBox.hidden = false
  messageBox.classList.toggle('success', isSuccess)
  window.clearTimeout(showMessage.timer)
  showMessage.timer = window.setTimeout(() => { messageBox.hidden = true }, 4500)
}

function setConnection(isConnected) {
  const dot = document.getElementById('connection-dot')
  dot.classList.toggle('connected', isConnected)
  dot.classList.toggle('disconnected', !isConnected)
  document.getElementById('connection-label').textContent = isConnected ? 'API connected' : 'API unavailable'
}

function actionButtons(type, id) {
  const safeId = escapeHtml(id)
  return `<div class="row-actions">
    <button class="table-action" type="button" data-action="edit-${type}" data-id="${safeId}">Edit</button>
    <button class="table-action danger" type="button" data-action="delete-${type}" data-id="${safeId}">Delete</button>
  </div>`
}

function renderBays(bays) {
  if (!bays.length) {
    baysTable.innerHTML = '<tr><td colspan="4" class="empty">No bays found for this filter.</td></tr>'
    return
  }
  baysTable.innerHTML = bays.map((bay) => `
    <tr>
      <td>${escapeHtml(bay.name)}</td>
      <td><span class="vehicle-pill">${escapeHtml(bay.vehicle)}</span></td>
      <td>#${escapeHtml(bay.id)}</td>
      <td>${actionButtons('bay', bay.id)}</td>
    </tr>`).join('')
}

function renderMechanics(mechanics) {
  document.getElementById('team-pill').textContent = `${mechanics.length} ${mechanics.length === 1 ? 'member' : 'members'}`
  if (!mechanics.length) {
    mechanicsTable.innerHTML = '<tr><td colspan="4" class="empty">No mechanics have been added.</td></tr>'
    return
  }
  mechanicsTable.innerHTML = mechanics.map((mechanic) => `
    <tr>
      <td>${escapeHtml(mechanic.name)}</td>
      <td>${escapeHtml(mechanic.specialty)}</td>
      <td>#${escapeHtml(mechanic.id)}</td>
      <td>${actionButtons('mechanic', mechanic.id)}</td>
    </tr>`).join('')
}

function renderAssignments(assignments) {
  document.getElementById('jobs-pill').textContent = `${assignments.length} ${assignments.length === 1 ? 'job' : 'jobs'}`
  if (!assignments.length) {
    assignmentsTable.innerHTML = '<tr><td colspan="5" class="empty">No assignments have been added.</td></tr>'
    return
  }
  assignmentsTable.innerHTML = assignments.map((assignment) => {
    const statusClass = assignment.status.toLowerCase().replaceAll(' ', '-')
    return `<tr>
      <td>${escapeHtml(assignment.job_description)}</td>
      <td>${escapeHtml(assignment.mechanic_name)}</td>
      <td>${escapeHtml(assignment.bay_name)} <span class="muted">· ${escapeHtml(assignment.vehicle)}</span></td>
      <td><span class="status-pill ${escapeHtml(statusClass)}">${escapeHtml(assignment.status)}</span></td>
      <td>${actionButtons('assignment', assignment.id)}</td>
    </tr>`
  }).join('')
}

function renderAssignmentOptions() {
  const mechanicSelect = document.getElementById('assignment-mechanic')
  const baySelect = document.getElementById('assignment-bay')
  const oldMechanic = mechanicSelect.value
  const oldBay = baySelect.value

  mechanicSelect.innerHTML = currentMechanics.length
    ? currentMechanics.map((mechanic) => `<option value="${escapeHtml(mechanic.id)}">${escapeHtml(mechanic.name)}</option>`).join('')
    : '<option value="">Add a mechanic first</option>'
  baySelect.innerHTML = currentBays.length
    ? currentBays.map((bay) => `<option value="${escapeHtml(bay.id)}">${escapeHtml(bay.name)} · ${escapeHtml(bay.vehicle)}</option>`).join('')
    : '<option value="">Add a bay first</option>'

  if (currentMechanics.some((mechanic) => String(mechanic.id) === oldMechanic)) mechanicSelect.value = oldMechanic
  if (currentBays.some((bay) => String(bay.id) === oldBay)) baySelect.value = oldBay
}

async function loadDashboard() {
  const [baysResponse, mechanicsResponse, assignmentsResponse] = await Promise.all([
    apiRequest('/bays'),
    apiRequest('/mechanics'),
    apiRequest('/assignments/with-details'),
  ])

  currentBays = baysResponse.data
  currentMechanics = mechanicsResponse.data
  currentAssignments = assignmentsResponse.data

  document.getElementById('bay-count').textContent = currentBays.length
  document.getElementById('mechanic-count').textContent = currentMechanics.length
  document.getElementById('assignment-count').textContent = currentAssignments.length
  document.getElementById('open-count').textContent = currentAssignments.filter((item) => item.status !== 'Completed').length
  renderMechanics(currentMechanics)
  renderAssignments(currentAssignments)
  renderAssignmentOptions()

  const vehicle = document.getElementById('vehicle-filter').value
  if (vehicle) {
    const filtered = await apiRequest(`/bays?vehicle=${encodeURIComponent(vehicle)}`)
    renderBays(filtered.data)
  } else {
    renderBays(currentBays)
  }
  setConnection(true)
}

function resetForm(type) {
  const form = document.getElementById(`${type}-form`)
  form.reset()
  document.getElementById(`${type}-id`).value = ''
  document.getElementById(`${type}-form-title`).textContent = `Add ${type === 'bay' ? 'a service bay' : type === 'mechanic' ? 'a mechanic' : 'an assignment'}`
  document.getElementById(`${type}-submit`).textContent = `Add ${type}`
  document.getElementById(`${type}-cancel`).hidden = true
}

function startEditing(type, item) {
  document.getElementById(`${type}-id`).value = item.id
  document.getElementById(`${type}-submit`).textContent = 'Save changes'
  document.getElementById(`${type}-cancel`).hidden = false

  if (type === 'bay') {
    document.getElementById('bay-form-title').textContent = `Edit ${item.name}`
    document.getElementById('bay-name').value = item.name
    document.getElementById('bay-vehicle').value = item.vehicle
    document.getElementById('bay-form').scrollIntoView({ behavior: 'smooth', block: 'center' })
  } else if (type === 'mechanic') {
    document.getElementById('mechanic-form-title').textContent = `Edit ${item.name}`
    document.getElementById('mechanic-name').value = item.name
    document.getElementById('mechanic-specialty').value = item.specialty
    document.getElementById('mechanic-form').scrollIntoView({ behavior: 'smooth', block: 'center' })
  } else {
    document.getElementById('assignment-form-title').textContent = `Edit job #${item.id}`
    document.getElementById('assignment-mechanic').value = item.mechanic_id
    document.getElementById('assignment-bay').value = item.bay_id
    document.getElementById('assignment-job').value = item.job_description
    document.getElementById('assignment-status').value = item.status
    document.getElementById('assignment-form').scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

async function saveRecord(type, form) {
  const id = document.getElementById(`${type}-id`).value
  let data

  if (type === 'bay') {
    data = {
      name: document.getElementById('bay-name').value.trim(),
      vehicle: document.getElementById('bay-vehicle').value,
    }
  } else if (type === 'mechanic') {
    data = {
      name: document.getElementById('mechanic-name').value.trim(),
      specialty: document.getElementById('mechanic-specialty').value.trim(),
    }
  } else {
    data = {
      mechanicId: Number(document.getElementById('assignment-mechanic').value),
      bayId: Number(document.getElementById('assignment-bay').value),
      jobDescription: document.getElementById('assignment-job').value.trim(),
      status: document.getElementById('assignment-status').value,
    }
  }

  const endpoint = `/${type === 'bay' ? 'bays' : type === 'mechanic' ? 'mechanics' : 'assignments'}${id ? `/${id}` : ''}`
  const response = await apiRequest(endpoint, {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  resetForm(type)
  if (type === 'bay') document.getElementById('vehicle-filter').value = ''
  showMessage(response.message || 'Saved successfully.', true)
  await loadDashboard()
  form.querySelector('button[type="submit"]').focus()
}

async function deleteRecord(type, id) {
  const collection = type === 'bay' ? 'bays' : type === 'mechanic' ? 'mechanics' : 'assignments'
  const item = (type === 'bay' ? currentBays : type === 'mechanic' ? currentMechanics : currentAssignments)
    .find((record) => String(record.id) === String(id))
  const label = type === 'bay' ? item?.name : type === 'mechanic' ? item?.name : item?.job_description
  if (!window.confirm(`Delete ${label || `${type} #${id}`}?`)) return

  const response = await apiRequest(`/${collection}/${id}`, { method: 'DELETE' })
  showMessage(response.message || 'Deleted successfully.', true)
  await loadDashboard()
}

async function handleTableAction(event, type) {
  const button = event.target.closest('button[data-action]')
  if (!button) return
  const id = button.dataset.id

  try {
    if (button.dataset.action.startsWith('edit-')) {
      const collection = type === 'bay' ? currentBays : type === 'mechanic' ? currentMechanics : currentAssignments
      const item = collection.find((record) => String(record.id) === String(id))
      if (item) startEditing(type, item)
    } else {
      await deleteRecord(type, id)
    }
  } catch (error) {
    showMessage(error.message)
  }
}

document.getElementById('vehicle-filter').addEventListener('change', async (event) => {
  const vehicle = event.target.value
  const url = vehicle ? `/bays?vehicle=${encodeURIComponent(vehicle)}` : '/bays'
  try {
    const response = await apiRequest(url)
    renderBays(response.data)
  } catch (error) {
    showMessage(error.message)
  }
})

document.getElementById('refresh-button').addEventListener('click', async () => {
  try {
    await loadDashboard()
    showMessage('Garage information refreshed.', true)
  } catch (error) {
    setConnection(false)
    showMessage(error.message)
  }
})

for (const type of ['bay', 'mechanic', 'assignment']) {
  const form = document.getElementById(`${type}-form`)
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    try {
      await saveRecord(type, form)
    } catch (error) {
      showMessage(error.message)
    }
  })
  document.getElementById(`${type}-cancel`).addEventListener('click', () => resetForm(type))
}

baysTable.addEventListener('click', (event) => handleTableAction(event, 'bay'))
mechanicsTable.addEventListener('click', (event) => handleTableAction(event, 'mechanic'))
assignmentsTable.addEventListener('click', (event) => handleTableAction(event, 'assignment'))

document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('active'))
    link.classList.add('active')
  })
})

loadDashboard().catch((error) => {
  setConnection(false)
  showMessage(error.message)
})
