import { reactive } from 'vue'

function fieldCss() {
  return {
    left: '0px',
    top: '0px',
    width: '1px',
    height: '1px',
    fontSize: '16px',
    padding: '0px',
    lineHeight: '16px',
    '--pda-inset': '1px',
    '--pda-radius': '0px',
  }
}

const fieldIds = ['name', 'mail', 'subject', 'msg'] as const
type FieldId = typeof fieldIds[number]
const typeMs = 420

export const pdaFields = reactive({
  show: false,
  name: '',
  mail: '',
  subject: '',
  msg: '',
  css: {
    name: fieldCss(),
    mail: fieldCss(),
    subject: fieldCss(),
    msg: fieldCss(),
  },
})

export const pdaType = reactive({
  on: false,
  name: '',
  mail: '',
  subject: '',
  msg: '',
})

let typeRaf = 0

export function stopPdaType() {
  pdaType.on = false
  if (!typeRaf) {
    return
  }
  cancelAnimationFrame(typeRaf)
  typeRaf = 0
}

export function revealPdaType() {
  stopPdaType()
}

function playPdaType() {
  stopPdaType()
  if (!fieldIds.some(id => pdaFields[id])) {
    return
  }
  for (const id of fieldIds) {
    const text = pdaFields[id]
    pdaType[id] = text.slice(0, text ? 1 : 0)
  }
  pdaType.on = true
  const started = performance.now()
  const step = (now: number) => {
    if (!pdaType.on) {
      return
    }
    const t = Math.min(1, (now - started) / typeMs)
    for (const id of fieldIds) {
      const text = pdaFields[id]
      pdaType[id] = text.slice(0, Math.ceil(text.length * t))
    }
    if (t < 1) {
      typeRaf = requestAnimationFrame(step)
      return
    }
    stopPdaType()
  }
  typeRaf = requestAnimationFrame(step)
}

export function hidePdaFields() {
  stopPdaType()
  pdaFields.show = false
}

export function showPdaFields() {
  if (!pdaFields.show) {
    playPdaType()
  }
  pdaFields.show = true
}

export function onPdaInput(id: FieldId, value: string) {
  if (pdaType.on) {
    revealPdaType()
    return
  }
  pdaFields[id] = value
}
