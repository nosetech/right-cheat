import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'

export interface FontSizeSettings {
  level: number
  scale: number
}

const DEFAULT_FONT_SIZE_SETTINGS: FontSizeSettings = {
  level: 2,
  scale: 1.0,
}

export const useFontSize = () => {
  const [fontSizeSettings, setFontSizeSettings] = useState<FontSizeSettings>(
    DEFAULT_FONT_SIZE_SETTINGS,
  )

  useEffect(() => {
    // Load initial font size settings
    const loadFontSizeSettings = async () => {
      try {
        const settings = await invoke<FontSizeSettings>(
          'get_font_size_settings',
        )
        setFontSizeSettings(settings)
      } catch (error) {
        console.error('Failed to load font size settings:', error)
      }
    }

    loadFontSizeSettings()

    // Listen for font size changes
    const unlisten = listen<FontSizeSettings>('font_size_changed', (event) => {
      setFontSizeSettings(event.payload)
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  const increaseFontSize = async () => {
    try {
      const newSettings = await invoke<FontSizeSettings>('increase_font_size')
      setFontSizeSettings(newSettings)
    } catch (error) {
      console.error('Failed to increase font size:', error)
    }
  }

  const decreaseFontSize = async () => {
    try {
      const newSettings = await invoke<FontSizeSettings>('decrease_font_size')
      setFontSizeSettings(newSettings)
    } catch (error) {
      console.error('Failed to decrease font size:', error)
    }
  }

  const resetFontSize = async () => {
    try {
      const newSettings = await invoke<FontSizeSettings>('reset_font_size')
      setFontSizeSettings(newSettings)
    } catch (error) {
      console.error('Failed to reset font size:', error)
    }
  }

  return {
    fontSizeSettings,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
  }
}
