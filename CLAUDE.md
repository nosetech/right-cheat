# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RightCheat is a desktop cheat sheet application built with Tauri 2 + Next.js + React + Material-UI. It displays frequently used commands and shortcuts that can be copied to clipboard via click or keyboard navigation. The app supports global shortcuts for window toggle and loads command data from JSON files.

## Development Commands

### Frontend (Next.js)
- `yarn dev` - Start Next.js development server
- `yarn build` - Build Next.js frontend for production
- `yarn start` - Start Next.js production server

### Code Quality
- `yarn lint` - Run all linters (ESLint + Prettier)
- `yarn lint:eslint` - Run ESLint only
- `yarn lint:prettier` - Check Prettier formatting only
- `yarn fix` - Fix all formatting and linting issues
- `yarn fix:eslint` - Fix ESLint issues only
- `yarn fix:prettier` - Fix Prettier formatting only

### Tauri
- `yarn tauri dev` - Start Tauri app in development mode
- `yarn tauri build` - Build Tauri app for production

### Testing
- `cargo test` - Run Rust tests (from src-tauri directory)

## Architecture Overview

### Frontend (Next.js/React)
- **App Router**: Uses Next.js 14 app directory structure
- **Main Components**:
  - `CheatSheet.tsx`: Main UI component managing state and API calls
  - `CommandField.tsx`: Individual command display with clipboard functionality
  - Atomic design pattern with atoms/molecules/organisms structure
- **State Management**: Custom hooks (usePreferencesStore, useClipboard)
- **Tauri Integration**: Uses @tauri-apps/api for backend communication

### Backend (Rust/Tauri)
- **API Layer**: Modular API structure in src-tauri/src/api/
  - `cheatsheet.rs`: JSON file reading, caching, and command management
  - `global_shortcut.rs`: Keyboard shortcut configuration and handling
- **Data Flow**: JSON file → Cache → Frontend via Tauri commands
- **Settings**: Persistent storage using tauri-plugin-store
- **Menu System**: Native macOS menu with preferences and help options

### Key Design Patterns
- **Lazy Loading**: CheatSheet data cached in memory on first load
- **Event-Driven**: Uses Tauri events for window visibility toggle and reload
- **Type Safety**: Shared TypeScript types between frontend and backend communication

### File Structure
- `src/`: Next.js frontend code
- `src-tauri/`: Rust backend code and Tauri configuration
- `src-tauri/tests/`: Rust unit tests with test data files
- JSON configuration defines cheat sheet categories and commands

## Important Notes

- Application targets Japanese users (UI text in Japanese)
- Security-focused: No internet communication, local file access only
- Uses Yarn package manager
- TypeScript strict mode enabled
- Material-UI v6 for component library