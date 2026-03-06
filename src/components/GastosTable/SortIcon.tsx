import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export default function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: string
  sortField: string
  sortDir: 'asc' | 'desc'
}) {
  if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-600" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-green-400" />
    : <ChevronDown className="w-3.5 h-3.5 text-green-400" />
}
