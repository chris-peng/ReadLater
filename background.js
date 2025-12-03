// 初始化存储
chrome.runtime.onInstalled.addListener(() => {
  console.log('稍后阅读扩展已安装');
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveLaterRead') {
    saveLaterReadItem(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 表示异步响应
  } else if (request.action === 'getLaterReadItems') {
    getLaterReadItems()
      .then(items => sendResponse(items))
      .catch(error => sendResponse([]));
    return true;
  } else if (request.action === 'removeLaterReadItem') {
    removeLaterReadItem(request.id)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'openLaterReadItem') {
    openLaterReadItem(request.item)
      .then(tab => sendResponse(tab))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'clearAllLaterReadItems') {
    clearAllLaterReadItems()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// 保存稍后阅读条目
async function saveLaterReadItem(item) {
  try {
    const items = await getLaterReadItems();
    const newItem = {
      id: generateId(),
      url: item.url,
      title: item.title,
      favicon: item.favicon,
      scrollPosition: item.scrollPosition,
      timestamp: Date.now()
    };
    
    items.push(newItem);
    await chrome.storage.sync.set({ laterReadItems: items });
    
    return { success: true, item: newItem };
  } catch (error) {
    console.error('保存稍后阅读条目失败:', error);
    throw error;
  }
}

// 获取所有稍后阅读条目
async function getLaterReadItems() {
  try {
    const result = await chrome.storage.sync.get('laterReadItems');
    return result.laterReadItems || [];
  } catch (error) {
    console.error('获取稍后阅读条目失败:', error);
    return [];
  }
}

// 删除稍后阅读条目
async function removeLaterReadItem(id) {
  try {
    const items = await getLaterReadItems();
    const updatedItems = items.filter(item => item.id !== id);
    await chrome.storage.sync.set({ laterReadItems: updatedItems });
    return { success: true };
  } catch (error) {
    console.error('删除稍后阅读条目失败:', error);
    throw error;
  }
}

// 清空所有稍后阅读条目
async function clearAllLaterReadItems() {
  try {
    await chrome.storage.sync.set({ laterReadItems: [] });
    return { success: true };
  } catch (error) {
    console.error('清空稍后阅读条目失败:', error);
    throw error;
  }
}

// 打开稍后阅读条目
async function openLaterReadItem(item) {
  try {
    // 打开新标签页
    const tab = await chrome.tabs.create({
      url: item.url,
      active: true
    });
    
    // 等待页面加载完成后滚动到保存的位置
    setTimeout(async () => {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (scrollPosition) => {
            window.scrollTo({
              top: scrollPosition,
              behavior: 'smooth'
            });
          },
          args: [item.scrollPosition]
        });
      } catch (error) {
        console.error('滚动到保存位置失败:', error);
      }
    }, 1000);
    
    return tab;
  } catch (error) {
    console.error('打开稍后阅读条目失败:', error);
    throw error;
  }
}

// 生成唯一ID
function generateId() {
  return 'id_' + Math.random().toString(36).substring(2, 15);
}

// 监听存储变化，通知content script更新UI
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.laterReadItems) {
    // 向所有标签页发送更新通知
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        try {
          chrome.tabs.sendMessage(tab.id, {
            action: 'laterReadItemsUpdated',
            items: changes.laterReadItems.newValue || []
          });
        } catch (error) {
          // 忽略无法发送消息的标签页
        }
      });
    });
  }
});

// 监听新标签页创建，确保菜单能在新标签页显示
chrome.tabs.onCreated.addListener((tab) => {
  setTimeout(() => {
    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'checkLaterReadItems'
      });
    } catch (error) {
      // 忽略错误
    }
  }, 1000);
});

console.log('稍后阅读扩展后台服务运行中...');