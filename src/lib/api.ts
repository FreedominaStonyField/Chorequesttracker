import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api'
const PIN_STORAGE_KEY = 'questboard:household-pin'

let householdPin: string | undefined

if (typeof window !== 'undefined') {
  const stored = window.localStorage.getItem(PIN_STORAGE_KEY)
  if (stored) {
    householdPin = stored
  }
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  if (householdPin) {
    config.headers = config.headers ?? {}
    config.headers['x-household-pin'] = householdPin
  }
  return config
})

export function setHouseholdPin(pin?: string) {
  householdPin = pin?.trim() ? pin.trim() : undefined
  if (typeof window !== 'undefined') {
    if (householdPin) {
      window.localStorage.setItem(PIN_STORAGE_KEY, householdPin)
    } else {
      window.localStorage.removeItem(PIN_STORAGE_KEY)
    }
  }
}

export function getHouseholdPin() {
  return householdPin
}
