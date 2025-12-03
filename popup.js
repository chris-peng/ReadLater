document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  const closeTabCheckbox = document.getElementById('closeTabCheckbox');
  const itemList = document.getElementById('itemList');
  const emptyState = document.getElementById('emptyState');
  const itemCount = document.getElementById('itemCount');
  const clearAllBtn = document.getElementById('clearAllBtn');
  
  // 加载设置和稍后阅读条目
  loadSettings();
  loadLaterReadItems();
  
  // 检查是否已经保存过当前页面
  checkIfSaved();
  
  // 事件监听
  saveBtn.addEventListener('click', saveToLaterRead);
  clearAllBtn.addEventListener('click', clearAllItems);
  closeTabCheckbox.addEventListener('change', saveSettings);
  
  // 监听存储变化
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync') {
      if (changes.laterReadItems) {
        loadLaterReadItems();
        checkIfSaved();
      }
      if (changes.laterReadSettings) {
        loadSettings();
      }
    }
  });
  
  // 加载用户设置
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get('laterReadSettings');
      const settings = result.laterReadSettings || {
        closeTabAfterSave: true // 默认值
      };
      
      // 更新复选框状态
      closeTabCheckbox.checked = settings.closeTabAfterSave;
    } catch (error) {
      console.error('加载设置失败:', error);
      // 使用默认值
      closeTabCheckbox.checked = true;
    }
  }
  
  // 保存用户设置
  async function saveSettings() {
    try {
      const settings = {
        closeTabAfterSave: closeTabCheckbox.checked
      };
      
      await chrome.storage.sync.set({ laterReadSettings: settings });
      
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }
  
  async function checkIfSaved() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const items = await getLaterReadItems();
      
      const isSaved = items.some(item => item.url === tab.url);
      
      if (isSaved) {
        saveBtn.textContent = '已添加到稍后阅读';
        saveBtn.disabled = true;
        saveBtn.style.backgroundColor = '#6c757d';
        closeTabCheckbox.disabled = true;
      } else {
        saveBtn.textContent = '添加到稍后阅读';
        saveBtn.disabled = false;
        saveBtn.style.backgroundColor = '#4285f4';
        closeTabCheckbox.disabled = false;
      }
    } catch (error) {
      console.error('检查是否已保存失败:', error);
    }
  }
  
  async function saveToLaterRead() {
    try {
      saveBtn.disabled = true;
      saveBtn.textContent = '处理中...';
      statusDiv.textContent = '';
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tab.id;
      
      // 获取保存的设置
      const result = await chrome.storage.sync.get('laterReadSettings');
      const settings = result.laterReadSettings || { closeTabAfterSave: true };
      const shouldCloseTab = settings.closeTabAfterSave;
      
      // 获取当前页面的滚动位置
      const scrollPosition = await getScrollPosition(tabId);
      
      // 获取网站图标
      const favicon = await getFavicon(tabId);
      
      const item = {
        url: tab.url,
        title: tab.title || '未命名页面',
        favicon: favicon,
        scrollPosition: scrollPosition
      };
      
      const resultSave = await chrome.runtime.sendMessage({
        action: 'saveLaterRead',
        data: item
      });
      
      if (resultSave.success) {
        saveBtn.textContent = '已添加到稍后阅读';
        saveBtn.style.backgroundColor = '#28a745';
        statusDiv.textContent = '✓ 已成功添加到稍后阅读列表';
        statusDiv.className = 'status success';
        
        // 通知content script更新UI
        chrome.tabs.sendMessage(tabId, { action: 'laterReadItemsUpdated' });
        
        // 如果需要关闭页面
        if (shouldCloseTab) {
          // 添加延迟让用户看到成功提示
          setTimeout(() => {
            chrome.tabs.remove(tabId);
          }, 300);
        }
        
      } else {
        throw new Error(resultSave.error || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      saveBtn.disabled = false;
      saveBtn.textContent = '添加到稍后阅读';
      statusDiv.textContent = '✗ 保存失败: ' + error.message;
      statusDiv.className = 'status error';
    }
  }
  
  // 加载稍后阅读条目
  async function loadLaterReadItems() {
    try {
      const items = await getLaterReadItems();
      
      // 更新计数
      itemCount.textContent = `${items.length} 个条目`;
      
      // 清空列表
      itemList.innerHTML = '';
      
      if (items.length === 0) {
        // 显示空状态
        itemList.style.display = 'none';
        emptyState.style.display = 'block';
        clearAllBtn.disabled = true;
        clearAllBtn.style.opacity = '0.5';
      } else {
        // 显示列表
        itemList.style.display = 'block';
        emptyState.style.display = 'none';
        clearAllBtn.disabled = false;
        clearAllBtn.style.opacity = '1';
        
        // 按时间排序（最新的在最上面）
        items.sort((a, b) => b.timestamp - a.timestamp);
        
        // 添加条目
        items.forEach(item => {
          const itemElement = createItemElement(item);
          itemList.appendChild(itemElement);
        });
      }
    } catch (error) {
      console.error('加载条目失败:', error);
      emptyState.innerHTML = `
        <img src="icons/icon-128.png" alt="错误">
        <p>加载失败</p>
        <p>无法加载稍后阅读条目，请重试</p>
      `;
    }
  }
  
  // 创建条目元素
  function createItemElement(item) {
    const itemElement = document.createElement('div');
    itemElement.className = 'item';
    itemElement.dataset.id = item.id;
    
    // 网站图标
    const favicon = document.createElement('img');
    favicon.src = item.favicon || 'icons/icon-128.png';
    favicon.className = 'item-favicon';
    favicon.alt = '网站图标';
    
    // 内容区域
    const content = document.createElement('div');
    content.className = 'item-content';
    
    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = item.title || '未命名页面';
    
    const url = document.createElement('div');
    url.className = 'item-url';
    url.textContent = item.url;
    
    const time = document.createElement('div');
    time.className = 'item-time';
    time.textContent = formatTime(item.timestamp);
    
    content.appendChild(title);
    content.appendChild(url);
    content.appendChild(time);
    
    // 删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = '删除此条目';
    
    // 确认删除框
    const deleteConfirm = document.createElement('div');
    deleteConfirm.className = 'delete-confirm';
    deleteConfirm.innerHTML = `
      <button class="confirm-yes">是</button>
      <button class="confirm-no">否</button>
    `;
    
    // 删除按钮点击事件
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止事件冒泡到父元素
      
      // 显示确认框
      deleteConfirm.style.display = 'block';
      deleteBtn.style.display = 'none';
      
      // 点击其他地方关闭确认框
      document.addEventListener('click', closeConfirmOnOutsideClick);
    });
    
    // 确认删除
    deleteConfirm.querySelector('.confirm-yes').addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteItem(item.id, itemElement);
      document.removeEventListener('click', closeConfirmOnOutsideClick);
    });
    
    // 取消删除
    deleteConfirm.querySelector('.confirm-no').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteConfirm.style.display = 'none';
      deleteBtn.style.display = 'block';
      document.removeEventListener('click', closeConfirmOnOutsideClick);
    });
    
    // 点击其他地方关闭确认框的处理函数
    function closeConfirmOnOutsideClick(e) {
      if (!itemElement.contains(e.target)) {
        deleteConfirm.style.display = 'none';
        deleteBtn.style.display = 'block';
        document.removeEventListener('click', closeConfirmOnOutsideClick);
      }
    }
    
    // 点击条目打开页面
    itemElement.addEventListener('click', async () => {
      try {
        // 打开新标签页
        const newTab = await chrome.runtime.sendMessage({
          action: 'openLaterReadItem',
          item: item
        });
        
        // 删除条目
        await chrome.runtime.sendMessage({
          action: 'removeLaterReadItem',
          id: item.id
        });
        
        // 关闭popup
        window.close();
        
      } catch (error) {
        console.error('打开稍后阅读条目失败:', error);
        statusDiv.textContent = '✗ 打开失败: ' + error.message;
        statusDiv.className = 'status error';
      }
    });
    
    itemElement.appendChild(favicon);
    itemElement.appendChild(content);
    itemElement.appendChild(deleteConfirm);
    itemElement.appendChild(deleteBtn);
    
    return itemElement;
  }
  
  // 删除单个条目
  async function deleteItem(id, itemElement) {
    try {
      // 显示删除中的状态
      itemElement.style.opacity = '0.5';
      
      // 发送删除请求
      const result = await chrome.runtime.sendMessage({
        action: 'removeLaterReadItem',
        id: id
      });
      
      if (result.success) {
        // 从DOM中移除
        itemElement.style.transition = 'opacity 0.3s, transform 0.3s';
        itemElement.style.transform = 'translateX(20px)';
        itemElement.style.opacity = '0';
        
        setTimeout(() => {
          itemElement.remove();
          // 更新计数
          updateItemCount();
        }, 300);
        
        // 显示成功提示
        statusDiv.textContent = '✓ 已删除';
        statusDiv.className = 'status success';
        setTimeout(() => {
          statusDiv.textContent = '';
          statusDiv.className = 'status';
        }, 2000);
        
      } else {
        throw new Error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除条目失败:', error);
      itemElement.style.opacity = '1';
      statusDiv.textContent = '✗ 删除失败: ' + error.message;
      statusDiv.className = 'status error';
    }
  }
  
  // 更新条目计数
  function updateItemCount() {
    const items = document.querySelectorAll('.item');
    itemCount.textContent = `${items.length} 个条目`;
    
    if (items.length === 0) {
      itemList.style.display = 'none';
      emptyState.style.display = 'block';
      clearAllBtn.disabled = true;
      clearAllBtn.style.opacity = '0.5';
    }
  }
  
  // 格式化时间
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}天前`;
    } else if (hours > 0) {
      return `${hours}小时前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  }
  
  // 清空所有条目
  async function clearAllItems() {
    if (confirm('确定要清空所有稍后阅读条目吗？此操作不可恢复。')) {
      try {
        await chrome.runtime.sendMessage({
          action: 'clearAllLaterReadItems'
        });
        statusDiv.textContent = '✓ 已清空所有稍后阅读条目';
        statusDiv.className = 'status success';
      } catch (error) {
        console.error('清空失败:', error);
        statusDiv.textContent = '✗ 清空失败: ' + error.message;
        statusDiv.className = 'status error';
      }
    }
  }
  
  // 获取当前页面的滚动位置
  async function getScrollPosition(tabId) {
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => window.scrollY
      });
      return result[0].result || 0;
    } catch (error) {
      console.error('获取滚动位置失败:', error);
      return 0;
    }
  }
  
  // 获取网站图标
  async function getFavicon(tabId) {
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          const favicon = document.querySelector('link[rel*="icon"]');
          return favicon ? favicon.href : null;
        }
      });
      return result[0].result || 'icons/icon-128.png';
    } catch (error) {
      console.error('获取网站图标失败:', error);
      return 'icons/icon-128.png';
    }
  }
  
  // 获取所有稍后阅读条目
  async function getLaterReadItems() {
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'getLaterReadItems'
      });
      return result || [];
    } catch (error) {
      console.error('获取条目失败:', error);
      return [];
    }
  }
});