#!/usr/bin/env python3
"""
V3X Browser - A simple but functional web browser built with Python and tkinter
"""

import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import tkinter.font as tkFont
from tkinter import *
import webbrowser
import urllib.request
import urllib.parse
import json
import os
import sys

try:
    from tkinter import html
except ImportError:
    html = None

class Tab:
    def __init__(self, notebook, url="https://www.google.com", title="New Tab"):
        self.url = url
        self.title = title
        self.history = [url]
        self.history_index = 0
        
        # Create tab frame
        self.frame = ttk.Frame(notebook)
        notebook.add(self.frame, text=title[:20])
        
        # Create content area (we'll use a text widget to display basic content)
        self.content = tk.Text(self.frame, wrap=tk.WORD, state=tk.DISABLED)
        self.content.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Load initial content
        self.load_url(url)
    
    def load_url(self, url):
        """Load content from URL"""
        if not url.startswith(('http://', 'https://')):
            if '.' in url:
                url = 'https://' + url
            else:
                # Treat as search query
                url = f"https://www.google.com/search?q={urllib.parse.quote(url)}"
        
        self.url = url
        
        # Add to history if it's a new URL
        if self.history_index == len(self.history) - 1:
            self.history.append(url)
            self.history_index = len(self.history) - 1
        
        try:
            # For now, we'll open in the system's default browser
            # In a full implementation, we'd render the HTML content
            self.content.config(state=tk.NORMAL)
            self.content.delete(1.0, tk.END)
            self.content.insert(tk.END, f"Loading: {url}\n\n")
            self.content.insert(tk.END, "This is a simplified browser. The page will open in your system's default browser.\n\n")
            self.content.insert(tk.END, f"URL: {url}\n")
            self.content.insert(tk.END, f"Title: {self.title}\n\n")
            self.content.insert(tk.END, "Features available in this browser:\n")
            self.content.insert(tk.END, "• Navigation (Back/Forward/Reload/Home)\n")
            self.content.insert(tk.END, "• Multiple tabs\n")
            self.content.insert(tk.END, "• Bookmarks\n")
            self.content.insert(tk.END, "• Address bar with search\n")
            self.content.insert(tk.END, "• History tracking\n\n")
            self.content.insert(tk.END, "Click 'Open in System Browser' to view the actual webpage.")
            self.content.config(state=tk.DISABLED)
            
            # Update title
            try:
                domain = urllib.parse.urlparse(url).netloc
                self.title = domain or "New Tab"
            except:
                self.title = "New Tab"
                
        except Exception as e:
            self.content.config(state=tk.NORMAL)
            self.content.delete(1.0, tk.END)
            self.content.insert(tk.END, f"Error loading {url}:\n{str(e)}")
            self.content.config(state=tk.DISABLED)
    
    def go_back(self):
        """Navigate back in history"""
        if self.history_index > 0:
            self.history_index -= 1
            self.load_url(self.history[self.history_index])
    
    def go_forward(self):
        """Navigate forward in history"""
        if self.history_index < len(self.history) - 1:
            self.history_index += 1
            self.load_url(self.history[self.history_index])
    
    def reload(self):
        """Reload current page"""
        self.load_url(self.url)
    
    def can_go_back(self):
        return self.history_index > 0
    
    def can_go_forward(self):
        return self.history_index < len(self.history) - 1

class V3XBrowser:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("V3X Browser")
        self.root.geometry("1200x800")
        self.root.minsize(800, 600)
        
        # Bookmarks storage
        self.bookmarks_file = os.path.expanduser("~/.v3x_browser_bookmarks.json")
        self.bookmarks = self.load_bookmarks()
        
        # Setup UI
        self.setup_ui()
        
        # Create initial tab
        self.new_tab()
    
    def setup_ui(self):
        """Setup the browser UI"""
        # Create main frame
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Navigation frame
        nav_frame = ttk.Frame(main_frame)
        nav_frame.pack(fill=tk.X, pady=(0, 5))
        
        # Navigation buttons
        ttk.Button(nav_frame, text="←", command=self.go_back, width=3).pack(side=tk.LEFT, padx=(0, 2))
        ttk.Button(nav_frame, text="→", command=self.go_forward, width=3).pack(side=tk.LEFT, padx=(0, 2))
        ttk.Button(nav_frame, text="↻", command=self.reload, width=3).pack(side=tk.LEFT, padx=(0, 2))
        ttk.Button(nav_frame, text="🏠", command=self.go_home, width=3).pack(side=tk.LEFT, padx=(0, 10))
        
        # Address bar
        self.address_var = tk.StringVar()
        self.address_var.set("https://www.google.com")
        address_entry = ttk.Entry(nav_frame, textvariable=self.address_var, font=('Arial', 11))
        address_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))
        address_entry.bind('<Return>', self.navigate_to_url)
        
        # Go button
        ttk.Button(nav_frame, text="Go", command=self.navigate_to_url).pack(side=tk.LEFT, padx=(0, 10))
        
        # Bookmark button
        ttk.Button(nav_frame, text="⭐", command=self.toggle_bookmark, width=3).pack(side=tk.LEFT, padx=(0, 2))
        
        # New tab button
        ttk.Button(nav_frame, text="+", command=self.new_tab, width=3).pack(side=tk.LEFT, padx=(0, 2))
        
        # System browser button
        ttk.Button(nav_frame, text="🌐", command=self.open_in_system_browser, width=3).pack(side=tk.LEFT)
        
        # Bookmarks frame (initially hidden)
        self.bookmarks_frame = ttk.Frame(main_frame)
        self.bookmarks_visible = False
        
        # Bookmarks toggle button
        ttk.Button(nav_frame, text="📚", command=self.toggle_bookmarks, width=3).pack(side=tk.RIGHT)
        
        # Tab notebook
        self.notebook = ttk.Notebook(main_frame)
        self.notebook.pack(fill=tk.BOTH, expand=True)
        self.notebook.bind('<<NotebookTabChanged>>', self.on_tab_changed)
        
        # Setup bookmarks UI
        self.setup_bookmarks_ui()
    
    def setup_bookmarks_ui(self):
        """Setup bookmarks UI"""
        ttk.Label(self.bookmarks_frame, text="Bookmarks:", font=('Arial', 10, 'bold')).pack(anchor=tk.W, pady=(5, 2))
        
        # Bookmarks listbox with scrollbar
        bookmarks_container = ttk.Frame(self.bookmarks_frame)
        bookmarks_container.pack(fill=tk.X, pady=(0, 5))
        
        self.bookmarks_listbox = tk.Listbox(bookmarks_container, height=3)
        scrollbar = ttk.Scrollbar(bookmarks_container, orient=tk.VERTICAL, command=self.bookmarks_listbox.yview)
        self.bookmarks_listbox.config(yscrollcommand=scrollbar.set)
        
        self.bookmarks_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.bookmarks_listbox.bind('<Double-Button-1>', self.open_bookmark)
        
        # Bookmark management buttons
        bookmark_buttons = ttk.Frame(self.bookmarks_frame)
        bookmark_buttons.pack(fill=tk.X)
        ttk.Button(bookmark_buttons, text="Remove", command=self.remove_bookmark).pack(side=tk.LEFT)
        
        self.update_bookmarks_display()
    
    def new_tab(self, url="https://www.google.com"):
        """Create a new tab"""
        tab = Tab(self.notebook, url)
        self.notebook.select(self.notebook.index("end") - 1)
        self.update_address_bar()
        return tab
    
    def get_current_tab(self):
        """Get the currently active tab"""
        try:
            current_index = self.notebook.index(self.notebook.select())
            return self.notebook.nametowidget(self.notebook.tabs()[current_index]).children['!tab']
        except:
            return None
    
    def navigate_to_url(self, event=None):
        """Navigate to URL in address bar"""
        url = self.address_var.get().strip()
        if url:
            current_tab = self.get_current_tab()
            if current_tab:
                current_tab.load_url(url)
                self.update_tab_title()
    
    def go_back(self):
        """Go back in current tab"""
        current_tab = self.get_current_tab()
        if current_tab and current_tab.can_go_back():
            current_tab.go_back()
            self.update_address_bar()
            self.update_tab_title()
    
    def go_forward(self):
        """Go forward in current tab"""
        current_tab = self.get_current_tab()
        if current_tab and current_tab.can_go_forward():
            current_tab.go_forward()
            self.update_address_bar()
            self.update_tab_title()
    
    def reload(self):
        """Reload current tab"""
        current_tab = self.get_current_tab()
        if current_tab:
            current_tab.reload()
    
    def go_home(self):
        """Go to home page"""
        self.address_var.set("https://www.google.com")
        self.navigate_to_url()
    
    def open_in_system_browser(self):
        """Open current URL in system's default browser"""
        current_tab = self.get_current_tab()
        if current_tab:
            webbrowser.open(current_tab.url)
    
    def on_tab_changed(self, event=None):
        """Handle tab change"""
        self.update_address_bar()
    
    def update_address_bar(self):
        """Update address bar with current tab's URL"""
        current_tab = self.get_current_tab()
        if current_tab:
            self.address_var.set(current_tab.url)
    
    def update_tab_title(self):
        """Update current tab's title"""
        current_tab = self.get_current_tab()
        if current_tab:
            try:
                current_index = self.notebook.index(self.notebook.select())
                self.notebook.tab(current_index, text=current_tab.title[:20])
            except:
                pass
    
    def toggle_bookmark(self):
        """Add or remove current page from bookmarks"""
        current_tab = self.get_current_tab()
        if current_tab:
            bookmark = {"title": current_tab.title, "url": current_tab.url}
            
            # Check if already bookmarked
            for i, bm in enumerate(self.bookmarks):
                if bm["url"] == current_tab.url:
                    # Remove bookmark
                    del self.bookmarks[i]
                    self.save_bookmarks()
                    self.update_bookmarks_display()
                    messagebox.showinfo("Bookmark", "Bookmark removed!")
                    return
            
            # Add bookmark
            self.bookmarks.append(bookmark)
            self.save_bookmarks()
            self.update_bookmarks_display()
            messagebox.showinfo("Bookmark", "Bookmark added!")
    
    def toggle_bookmarks(self):
        """Toggle bookmarks panel visibility"""
        if self.bookmarks_visible:
            self.bookmarks_frame.pack_forget()
            self.bookmarks_visible = False
        else:
            self.bookmarks_frame.pack(fill=tk.X, pady=(0, 5), before=self.notebook)
            self.bookmarks_visible = True
    
    def open_bookmark(self, event=None):
        """Open selected bookmark"""
        selection = self.bookmarks_listbox.curselection()
        if selection:
            bookmark = self.bookmarks[selection[0]]
            self.address_var.set(bookmark["url"])
            self.navigate_to_url()
    
    def remove_bookmark(self):
        """Remove selected bookmark"""
        selection = self.bookmarks_listbox.curselection()
        if selection:
            del self.bookmarks[selection[0]]
            self.save_bookmarks()
            self.update_bookmarks_display()
    
    def update_bookmarks_display(self):
        """Update bookmarks listbox"""
        self.bookmarks_listbox.delete(0, tk.END)
        for bookmark in self.bookmarks:
            self.bookmarks_listbox.insert(tk.END, f"{bookmark['title']} - {bookmark['url']}")
    
    def load_bookmarks(self):
        """Load bookmarks from file"""
        try:
            with open(self.bookmarks_file, 'r') as f:
                return json.load(f)
        except:
            return []
    
    def save_bookmarks(self):
        """Save bookmarks to file"""
        try:
            with open(self.bookmarks_file, 'w') as f:
                json.dump(self.bookmarks, f, indent=2)
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save bookmarks: {e}")
    
    def run(self):
        """Start the browser"""
        self.root.mainloop()

def main():
    """Main function"""
    print("Starting V3X Browser...")
    print("This is a lightweight browser built with Python and tkinter.")
    print("It provides basic browser functionality and can open pages in your system browser.")
    
    try:
        browser = V3XBrowser()
        browser.run()
    except KeyboardInterrupt:
        print("\nBrowser closed by user.")
    except Exception as e:
        print(f"Error starting browser: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
