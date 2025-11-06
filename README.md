# V3X Browser

A modern, fully-functional web browser built with Electron, React, and TypeScript.

## Features

- **Multi-tab browsing**: Open multiple websites in separate tabs
- **Navigation controls**: Back, forward, reload, and home buttons
- **Address bar**: Enter URLs or search terms
- **Bookmarks**: Save and manage your favorite websites
- **Modern UI**: Clean, intuitive interface built with Tailwind CSS
- **Cross-platform**: Works on Windows, macOS, and Linux

## Technology Stack

- **Electron**: Desktop application framework with Chromium rendering engine
- **React**: Modern UI library for building user interfaces
- **TypeScript**: Type-safe JavaScript for better development experience
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Beautiful, customizable icons

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

To run the browser in development mode:

```bash
npm run dev
```

This will start both the React development server and the Electron application.

## Building

To build the application for production:

```bash
npm run build
```

To create distributable packages:

```bash
npm run dist
```

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── main.ts     # Main Electron application
│   └── preload.ts  # Preload script for IPC
└── renderer/       # React renderer process
    └── src/
        ├── App.tsx     # Main browser component
        ├── main.tsx    # React entry point
        └── index.css   # Global styles
```

## Browser Features

### Navigation
- **Back/Forward**: Navigate through browsing history
- **Reload**: Refresh the current page
- **Home**: Go to the default homepage (Google)
- **Address Bar**: Enter URLs or search terms

### Tabs
- **New Tab**: Create new browsing tabs
- **Close Tab**: Close individual tabs
- **Switch Tabs**: Click to switch between open tabs

### Bookmarks
- **Add Bookmark**: Star icon to bookmark current page
- **View Bookmarks**: Toggle bookmarks bar visibility
- **Quick Access**: Click bookmarks to navigate

### Security
- **Context Isolation**: Secure communication between main and renderer processes
- **No Node Integration**: Renderer process runs in secure context
- **Preload Script**: Safe IPC communication

## Customization

The browser can be customized by modifying:
- **UI Components**: Edit `src/renderer/src/App.tsx`
- **Styling**: Modify Tailwind classes or `src/renderer/src/index.css`
- **Main Process**: Update `src/main/main.ts` for Electron behavior
- **IPC Handlers**: Add new functionality in preload and main process

## License

MIT License - feel free to use this project as a starting point for your own browser!
