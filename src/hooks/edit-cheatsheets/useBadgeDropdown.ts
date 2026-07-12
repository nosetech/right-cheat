import { useEffect, useRef, useState } from 'react'

/**
 * バッジ型セレクタ（TypeBadge / LayoutBadge）のドロップダウン開閉・位置計算・
 * 外側クリック / Esc 検知を共通化するフック。
 */
export function useBadgeDropdown() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const [hov, setHov] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  // ボタン直下・右揃えでドロップダウンを開く。locked 時は呼び出し側で抑止する。
  const openMenu = () => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !popRef.current?.contains(e.target as Node)
      )
        setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // ドロップダウンを閉じるだけにし、window の Esc ハンドラ（ウィンドウを
        // 閉じる）まで伝播させない
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return { open, setOpen, pos, hov, setHov, btnRef, popRef, openMenu }
}
