import { PackageOpen } from 'lucide-react'
export default function EmptyState({ title = 'Nothing here yet', description = 'Add your first item to get started.' }) { return <div className="empty-state"><div className="empty-icon"><PackageOpen size={25}/></div><h3>{title}</h3><p>{description}</p></div> }
