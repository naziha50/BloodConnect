import { ref, type Ref } from 'vue'

interface Donor {
  id: number
  name: string
  blood_group: string
  phone: string
  email: string
  address: string
  lat: number
  lng: number
  available: boolean
  last_donation_date: string | null
  distance_km?: number
}

interface CreateDonorData {
  name: string
  blood_group: string
  phone: string
  email: string
  address: string
  lat: number
  lng: number
}

interface SearchParams {
  blood_group?: string
  lat: number
  lng: number
  radius_km: number
  availability?: string
}

interface ApiComposable {
  createDonor: (data: CreateDonorData) => Promise<Donor>
  searchDonors: (params: SearchParams) => Promise<Donor[]>
  getAllDonors: () => Promise<Donor[]>
  loading: Ref<boolean>
  error: Ref<string | null>
}

const API_BASE = import.meta.env.VITE_API_BASE || ''

export const useApi = (): ApiComposable => {
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const createDonor = async (data: CreateDonorData): Promise<Donor> => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE}/api/donors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Failed to create donor')
      const result: Donor = await response.json()
      loading.value = false
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      loading.value = false
      throw err
    }
  }

  const searchDonors = async (params: SearchParams): Promise<Donor[]> => {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams(params as any).toString()
      const response = await fetch(`${API_BASE}/api/donors?${query}`)
      if (!response.ok) throw new Error('Failed to search donors')
      const result: Donor[] = await response.json()
      loading.value = false
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      loading.value = false
      throw err
    }
  }

  const getAllDonors = async (): Promise<Donor[]> => {
    loading.value = true
    error.value = null
    console.log('Fetching all donors from:', `${API_BASE}/api/donors/all`)
    try {
      const response = await fetch(`${API_BASE}/api/donors/all`)
      console.log('Response status:', response.status)
      if (!response.ok) throw new Error(`Failed to fetch all donors: ${response.status}`)
      const result: Donor[] = await response.json()
      console.log('Fetched donors:', result)
      loading.value = false
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      console.error('API Error:', err)
      loading.value = false
      throw err
    }
  }

  return {
    createDonor,
    searchDonors,
    getAllDonors,
    loading,
    error
  }
}