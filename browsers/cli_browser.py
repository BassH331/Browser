#!/usr/bin/env python3
"""
V3X CLI Browser - A command-line web browser
A simple but functional browser that works in the terminal
"""

import sys
import os
import json
import urllib.request
import urllib.parse
import urllib.error
import webbrowser
import re
from html.parser import HTMLParser
import subprocess

class SimpleHTMLParser(HTMLParser):
    """Simple HTML parser to extract text content and links"""
    
    def __init__(self):
        super().__init__()
        self.text_content = []
        self.links = []
        self.current_tag = None
        self.in_title = False
        self.title = ""
        
    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
        if tag == 'title':
            self.in_title = True
        elif tag == 'a':
            for attr_name, attr_value in attrs:
                if attr_name == 'href':
                    self.links.append(attr_value)
    
    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        self.current_tag = None
    
    def handle_data(self, data):
        if self.in_title:
            self.title += data.strip()
        elif self.current_tag in ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            text = data.strip()
            if text:
                self.text_content.append(text)

class CLIBrowser:
    """Command-line web browser"""
    
    def __init__(self):
        self.history = []
        self.history_index = -1
        self.bookmarks = self.load_bookmarks()
        self.current_url = ""
        self.current_title = ""
        
    def load_bookmarks(self):
        """Load bookmarks from file"""
        bookmarks_file = os.path.expanduser("~/.v3x_cli_browser_bookmarks.json")
        try:
            with open(bookmarks_file, 'r') as f:
                return json.load(f)
        except:
            return []
    
    def save_bookmarks(self):
        """Save bookmarks to file"""
        bookmarks_file = os.path.expanduser("~/.v3x_cli_browser_bookmarks.json")
        try:
            with open(bookmarks_file, 'w') as f:
                json.dump(self.bookmarks, f, indent=2)
        except Exception as e:
            print(f"Error saving bookmarks: {e}")
    
    def fetch_page(self, url):
        """Fetch and parse a web page"""
        if not url.startswith(('http://', 'https://')):
            if '.' in url and ' ' not in url:
                url = 'https://' + url
            else:
                # Treat as search query
                query = urllib.parse.quote(url)
                url = f"https://www.google.com/search?q={query}"
        
        try:
            print(f"Fetching: {url}")
            
            # Create request with user agent
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'V3X-CLI-Browser/1.0')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read().decode('utf-8', errors='ignore')
                
            # Parse HTML
            parser = SimpleHTMLParser()
            parser.feed(content)
            
            self.current_url = url
            self.current_title = parser.title or url
            
            # Add to history
            if not self.history or self.history[-1] != url:
                self.history.append(url)
                self.history_index = len(self.history) - 1
            
            return {
                'url': url,
                'title': parser.title,
                'content': parser.text_content[:50],  # First 50 text elements
                'links': parser.links[:20]  # First 20 links
            }
            
        except urllib.error.URLError as e:
            return {'error': f"Failed to fetch {url}: {e}"}
        except Exception as e:
            return {'error': f"Error: {e}"}
    
    def display_page(self, page_data):
        """Display page content in terminal"""
        if 'error' in page_data:
            print(f"\n❌ {page_data['error']}")
            return
        
        print("\n" + "="*80)
        print(f"📄 {page_data['title']}")
        print(f"🔗 {page_data['url']}")
        print("="*80)
        
        # Display content
        if page_data['content']:
            print("\n📝 Content Preview:")
            for i, text in enumerate(page_data['content'][:10], 1):
                if len(text) > 100:
                    text = text[:97] + "..."
                print(f"  {i}. {text}")
        
        # Display links
        if page_data['links']:
            print(f"\n🔗 Links found ({len(page_data['links'])}):")
            for i, link in enumerate(page_data['links'][:10], 1):
                if link.startswith('http'):
                    print(f"  {i}. {link}")
                elif link.startswith('/'):
                    base_url = urllib.parse.urlparse(page_data['url'])
                    full_link = f"{base_url.scheme}://{base_url.netloc}{link}"
                    print(f"  {i}. {full_link}")
        
        print("\n" + "="*80)
    
    def navigate(self, url):
        """Navigate to a URL"""
        page_data = self.fetch_page(url)
        self.display_page(page_data)
        return page_data
    
    def go_back(self):
        """Go back in history"""
        if self.history_index > 0:
            self.history_index -= 1
            url = self.history[self.history_index]
            page_data = self.fetch_page(url)
            self.display_page(page_data)
            return page_data
        else:
            print("❌ No previous page in history")
            return None
    
    def go_forward(self):
        """Go forward in history"""
        if self.history_index < len(self.history) - 1:
            self.history_index += 1
            url = self.history[self.history_index]
            page_data = self.fetch_page(url)
            self.display_page(page_data)
            return page_data
        else:
            print("❌ No next page in history")
            return None
    
    def add_bookmark(self):
        """Add current page to bookmarks"""
        if self.current_url:
            bookmark = {
                'title': self.current_title,
                'url': self.current_url
            }
            
            # Check if already bookmarked
            for bm in self.bookmarks:
                if bm['url'] == self.current_url:
                    print("⭐ Page is already bookmarked!")
                    return
            
            self.bookmarks.append(bookmark)
            self.save_bookmarks()
            print(f"⭐ Bookmarked: {self.current_title}")
        else:
            print("❌ No page to bookmark")
    
    def show_bookmarks(self):
        """Display bookmarks"""
        if not self.bookmarks:
            print("📚 No bookmarks yet")
            return
        
        print("\n📚 Bookmarks:")
        print("-" * 60)
        for i, bm in enumerate(self.bookmarks, 1):
            title = bm['title'][:40] + "..." if len(bm['title']) > 40 else bm['title']
            print(f"  {i}. {title}")
            print(f"     {bm['url']}")
        print("-" * 60)
    
    def open_bookmark(self, index):
        """Open bookmark by index"""
        try:
            index = int(index) - 1
            if 0 <= index < len(self.bookmarks):
                bookmark = self.bookmarks[index]
                return self.navigate(bookmark['url'])
            else:
                print("❌ Invalid bookmark number")
        except ValueError:
            print("❌ Please enter a valid number")
        return None
    
    def open_in_system_browser(self):
        """Open current URL in system browser"""
        if self.current_url:
            print(f"🌐 Opening {self.current_url} in system browser...")
            webbrowser.open(self.current_url)
        else:
            print("❌ No URL to open")
    
    def show_help(self):
        """Show help information"""
        help_text = """
🌐 V3X CLI Browser - Commands:

Navigation:
  go <url>          - Navigate to URL or search
  back              - Go back in history
  forward           - Go forward in history
  reload            - Reload current page
  home              - Go to Google homepage

Bookmarks:
  bookmark          - Add current page to bookmarks
  bookmarks         - Show all bookmarks
  open <number>     - Open bookmark by number

Utilities:
  history           - Show browsing history
  browser           - Open current page in system browser
  clear             - Clear screen
  help              - Show this help
  quit/exit         - Exit browser

Examples:
  go github.com
  go python tutorial
  bookmark
  open 1
  browser
        """
        print(help_text)
    
    def show_history(self):
        """Show browsing history"""
        if not self.history:
            print("📜 No browsing history")
            return
        
        print("\n📜 Browsing History:")
        print("-" * 60)
        for i, url in enumerate(self.history, 1):
            marker = " → " if i - 1 == self.history_index else "   "
            print(f"{marker}{i}. {url}")
        print("-" * 60)
    
    def run(self):
        """Main browser loop"""
        print("🌐 V3X CLI Browser")
        print("Type 'help' for commands or 'quit' to exit")
        print("Example: go github.com")
        
        # Start with Google
        self.navigate("https://www.google.com")
        
        while True:
            try:
                command = input("\n🌐 > ").strip()
                
                if not command:
                    continue
                
                parts = command.split(' ', 1)
                cmd = parts[0].lower()
                arg = parts[1] if len(parts) > 1 else ""
                
                if cmd in ['quit', 'exit', 'q']:
                    print("👋 Goodbye!")
                    break
                
                elif cmd in ['help', 'h']:
                    self.show_help()
                
                elif cmd in ['go', 'navigate', 'visit']:
                    if arg:
                        self.navigate(arg)
                    else:
                        url = input("Enter URL or search term: ").strip()
                        if url:
                            self.navigate(url)
                
                elif cmd in ['back', 'b']:
                    self.go_back()
                
                elif cmd in ['forward', 'f']:
                    self.go_forward()
                
                elif cmd in ['reload', 'refresh', 'r']:
                    if self.current_url:
                        self.navigate(self.current_url)
                    else:
                        print("❌ No page to reload")
                
                elif cmd in ['home']:
                    self.navigate("https://www.google.com")
                
                elif cmd in ['bookmark', 'bm']:
                    self.add_bookmark()
                
                elif cmd in ['bookmarks', 'bms']:
                    self.show_bookmarks()
                
                elif cmd in ['open', 'o']:
                    if arg:
                        self.open_bookmark(arg)
                    else:
                        print("❌ Please specify bookmark number (e.g., 'open 1')")
                
                elif cmd in ['browser', 'system']:
                    self.open_in_system_browser()
                
                elif cmd in ['history', 'hist']:
                    self.show_history()
                
                elif cmd in ['clear', 'cls']:
                    os.system('clear' if os.name == 'posix' else 'cls')
                
                else:
                    # Treat unknown command as navigation
                    self.navigate(command)
                    
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except EOFError:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

def main():
    """Main function"""
    try:
        browser = CLIBrowser()
        browser.run()
    except Exception as e:
        print(f"❌ Failed to start browser: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
