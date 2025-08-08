import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function calculateAge(birthDate: Date | string): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'SCHEDULED': 'bg-medical-primary',
    'IN_PROGRESS': 'bg-medical-warning',
    'ACQUIRED': 'bg-medical-secondary',
    'REPORTING': 'bg-purple-600',
    'VALIDATED': 'bg-green-700',
    'CANCELLED': 'bg-medical-error',
    'EMERGENCY': 'bg-red-600',
  }
  return colors[status] || 'bg-gray-400'
}

export function getModalityColor(modality: string): string {
  const colors: Record<string, string> = {
    'CT': 'bg-orange-100 text-orange-800 border-orange-200',
    'MR': 'bg-blue-100 text-blue-800 border-blue-200',
    'RX': 'bg-purple-100 text-purple-800 border-purple-200',
    'CR': 'bg-purple-100 text-purple-800 border-purple-200',
    'DX': 'bg-purple-100 text-purple-800 border-purple-200',
    'US': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'MG': 'bg-pink-100 text-pink-800 border-pink-200',
    'RF': 'bg-green-100 text-green-800 border-green-200',
    'NM': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'PT': 'bg-teal-100 text-teal-800 border-teal-200',
    'XA': 'bg-red-100 text-red-800 border-red-200',
  }
  return colors[modality] || 'bg-gray-100 text-gray-800 border-gray-200'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    'LOW': 'text-gray-400',
    'NORMAL': 'text-gray-600',
    'HIGH': 'text-orange-600 font-medium',
    'URGENT': 'text-red-600 font-semibold',
    'EMERGENCY': 'text-red-600 font-semibold animate-pulse',
  }
  return colors[priority] || 'text-gray-600'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'SCHEDULED': 'Programmé',
    'IN_PROGRESS': 'En cours',
    'ACQUIRED': 'Acquis',
    'REPORTING': 'En lecture',
    'VALIDATED': 'Validé',
    'CANCELLED': 'Annulé',
    'EMERGENCY': 'Urgence',
  }
  return labels[status] || status
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    'LOW': 'Faible',
    'NORMAL': 'Normale',
    'HIGH': 'Haute',
    'URGENT': 'Urgente',
    'EMERGENCY': 'Urgence vitale',
  }
  return labels[priority] || priority
}

export function getModalityLabel(modality: string): string {
  const labels: Record<string, string> = {
    'CR': 'Radiographie numérisée',
    'CT': 'Scanner',
    'MR': 'IRM',
    'US': 'Échographie',
    'MG': 'Mammographie',
    'RF': 'Radioscopie',
    'DX': 'Radiographie directe',
    'NM': 'Médecine nucléaire',
    'PT': 'TEP Scan',
    'XA': 'Angiographie',
  }
  return labels[modality] || modality
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func(...args)
  }
}

export function generateAccessionNumber(): string {
  const year = new Date().getFullYear().toString().slice(-2)
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const day = new Date().getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  
  return `${year}${month}${day}${random}`
}