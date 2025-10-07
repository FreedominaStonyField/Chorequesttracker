import { useEffect } from 'react'
import { apiRepository } from './apiRepository'

export function useSeedData() {
  useEffect(() => {
    apiRepository.getUsers().catch(() => {
      // The backend seeds users/templates automatically; failures will surface via React Query
    })
  }, [])
}
