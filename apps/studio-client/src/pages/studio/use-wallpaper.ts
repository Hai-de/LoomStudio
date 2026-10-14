import { useEffect, useRef, useState } from 'react'

export function useWallpaper(url?: string) {
  const [currentWallpaper, setCurrentWallpaper] = useState<string | undefined>(url)
  const [previousWallpaper, setPreviousWallpaper] = useState<string | undefined>(undefined)
  const wallpaperTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (wallpaperTimerRef.current) clearTimeout(wallpaperTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (url === currentWallpaper) return

    if (!url) {
      if (currentWallpaper) {
        setPreviousWallpaper(currentWallpaper)
        setCurrentWallpaper(undefined)
        if (wallpaperTimerRef.current) clearTimeout(wallpaperTimerRef.current)
        wallpaperTimerRef.current = setTimeout(() => {
          setPreviousWallpaper(undefined)
          wallpaperTimerRef.current = null
        }, 1250)
      }
      return
    }

    const img = new Image()
    img.fetchPriority = 'high'
    let active = true

    const apply = () => {
      if (!active) return
      active = false
      if (wallpaperTimerRef.current) clearTimeout(wallpaperTimerRef.current)
      wallpaperTimerRef.current = null
      setPreviousWallpaper(currentWallpaper)
      if (currentWallpaper) {
        wallpaperTimerRef.current = setTimeout(() => {
          setPreviousWallpaper(undefined)
          wallpaperTimerRef.current = null
        }, 1250)
      }
      setCurrentWallpaper(url)
    }

    img.onload = apply
    img.onerror = () => {
      if (active) console.warn('Wallpaper image failed to load', url)
    }
    img.src = url
    if (img.complete && img.naturalWidth > 0) apply()

    return () => {
      active = false
      img.onload = null
      img.onerror = null
    }
  }, [url, currentWallpaper])

  return { currentWallpaper, previousWallpaper }
}
