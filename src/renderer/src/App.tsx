import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  Home, 
  Star, 
  Settings, 
  Plus,
  X
} from 'lucide-react';

interface Tab {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
}

interface Bookmark {
  title: string;
  url: string;
}

function App() {
  const webviewRef = useRef<any>(null);
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'New Tab', url: 'https://www.google.com', isActive: true }
  ]);
  const [currentUrl, setCurrentUrl] = useState('https://www.google.com');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const activeTab = tabs.find(tab => tab.isActive);

  useEffect(() => {
    loadBookmarks();
    
    // Setup webview event listeners
    const webview = webviewRef.current;
    if (webview) {
      const handleDidNavigate = (e: any) => {
        setCurrentUrl(e.url);
        setTabs(tabs.map(tab => 
          tab.isActive ? { ...tab, url: e.url } : tab
        ));
      };
      
      const handlePageTitleUpdated = (e: any) => {
        setTabs(tabs.map(tab => 
          tab.isActive ? { ...tab, title: e.title } : tab
        ));
      };
      
      webview.addEventListener('did-navigate', handleDidNavigate);
      webview.addEventListener('page-title-updated', handlePageTitleUpdated);
      
      return () => {
        webview.removeEventListener('did-navigate', handleDidNavigate);
        webview.removeEventListener('page-title-updated', handlePageTitleUpdated);
      };
    }
  }, [tabs]);

  const loadBookmarks = async () => {
    try {
      const savedBookmarks = await window.electronAPI?.getBookmarks();
      setBookmarks(savedBookmarks || []);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  };

  const handleNavigate = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        // Treat as search query
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    }
    
    setCurrentUrl(url);
    
    // Update active tab
    setTabs(tabs.map(tab => 
      tab.isActive ? { ...tab, url, title: new URL(url).hostname } : tab
    ));

    // Navigate webview directly
    if (webviewRef.current) {
      webviewRef.current.src = url;
    }
  };

  const handleBack = () => {
    if (webviewRef.current && webviewRef.current.canGoBack()) {
      webviewRef.current.goBack();
    }
  };

  const handleForward = () => {
    if (webviewRef.current && webviewRef.current.canGoForward()) {
      webviewRef.current.goForward();
    }
  };

  const handleReload = () => {
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  };

  const handleHome = () => {
    handleNavigate('https://www.google.com');
  };

  const addBookmark = async () => {
    if (!activeTab) return;
    
    const bookmark = { title: activeTab.title, url: activeTab.url };
    try {
      await window.electronAPI?.addBookmark(bookmark);
      setBookmarks([...bookmarks, bookmark]);
    } catch (error) {
      console.error('Failed to add bookmark:', error);
    }
  };

  const removeBookmark = async (url: string) => {
    try {
      await window.electronAPI?.removeBookmark(url);
      setBookmarks(bookmarks.filter(b => b.url !== url));
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
    }
  };

  const addNewTab = () => {
    const newTab: Tab = {
      id: Date.now().toString(),
      title: 'New Tab',
      url: 'https://www.google.com',
      isActive: true
    };
    
    setTabs([
      ...tabs.map(tab => ({ ...tab, isActive: false })),
      newTab
    ]);
    setCurrentUrl(newTab.url);
  };

  const closeTab = (tabId: string) => {
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    
    if (newTabs.length === 0) {
      addNewTab();
      return;
    }
    
    if (tabs[tabIndex]?.isActive) {
      const nextActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      newTabs[nextActiveIndex].isActive = true;
      setCurrentUrl(newTabs[nextActiveIndex].url);
    }
    
    setTabs(newTabs);
  };

  const switchTab = (tabId: string) => {
    const newTabs = tabs.map(tab => ({
      ...tab,
      isActive: tab.id === tabId
    }));
    setTabs(newTabs);
    
    const activeTab = newTabs.find(tab => tab.isActive);
    if (activeTab) {
      setCurrentUrl(activeTab.url);
    }
  };

  const isBookmarked = activeTab ? bookmarks.some(b => b.url === activeTab.url) : false;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Tab Bar */}
      <div className="flex bg-gray-200 border-b border-gray-300">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`flex items-center px-4 py-2 border-r border-gray-300 cursor-pointer min-w-0 max-w-xs ${
              tab.isActive ? 'bg-white' : 'bg-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => switchTab(tab.id)}
          >
            <span className="truncate flex-1 text-sm">{tab.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="ml-2 p-1 hover:bg-gray-300 rounded"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
          onClick={addNewTab}
          className="px-3 py-2 hover:bg-gray-100 border-r border-gray-300"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center p-3 bg-white border-b border-gray-300 space-x-2">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back"
        >
          <ArrowLeft size={20} />
        </button>
        
        <button
          onClick={handleForward}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Forward"
        >
          <ArrowRight size={20} />
        </button>
        
        <button
          onClick={handleReload}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Reload"
        >
          <RotateCcw size={20} />
        </button>
        
        <button
          onClick={handleHome}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Home"
        >
          <Home size={20} />
        </button>

        {/* Address Bar */}
        <div className="flex-1 mx-4">
          <input
            type="text"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleNavigate(currentUrl);
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter URL or search..."
          />
        </div>

        <button
          onClick={isBookmarked ? () => removeBookmark(activeTab!.url) : addBookmark}
          className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${
            isBookmarked ? 'text-yellow-500' : 'text-gray-600'
          }`}
          title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          <Star size={20} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>

        <button
          onClick={() => setShowBookmarks(!showBookmarks)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Bookmarks"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Bookmarks Bar */}
      {showBookmarks && (
        <div className="bg-gray-50 border-b border-gray-300 p-2">
          <div className="flex flex-wrap gap-2">
            {bookmarks.map((bookmark, index) => (
              <button
                key={index}
                onClick={() => handleNavigate(bookmark.url)}
                className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm truncate max-w-xs"
                title={bookmark.url}
              >
                {bookmark.title}
              </button>
            ))}
            {bookmarks.length === 0 && (
              <span className="text-gray-500 text-sm">No bookmarks yet</span>
            )}
          </div>
        </div>
      )}

      {/* Web View */}
      <div className="flex-1 bg-white">
        <webview
          ref={webviewRef}
          src={currentUrl}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}

export default App;
