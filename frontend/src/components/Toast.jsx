import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, X, AlertCircle } from 'lucide-react'
const ToastContext = createContext(() => {})
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setItems((old) => [...old, { id, message, type }])
    setTimeout(() => setItems((old) => old.filter((item) => item.id !== id)), 3500)
  }, [])
  return <ToastContext.Provider value={showToast}>{children}<div className="toast-stack">{items.map((item) => <div className={`toast ${item.type}`} key={item.id}>{item.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}<span>{item.message}</span><button onClick={() => setItems((old) => old.filter((x) => x.id !== item.id))} aria-label="Dismiss"><X size={16}/></button></div>)}</div></ToastContext.Provider>
}
export const useToast = () => useContext(ToastContext)
