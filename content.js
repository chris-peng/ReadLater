console.log('稍后阅读扩展内容脚本已加载');

// 检查是否有稍后阅读条目，如果有则创建菜单
checkLaterReadItems();

// 监听来自background的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'laterReadItemsUpdated' || message.action === 'checkLaterReadItems') {
    updateLaterReadMenu();
  }
});

// 检查稍后阅读条目
async function checkLaterReadItems() {
  try {
    const items = await chrome.runtime.sendMessage({ action: 'getLaterReadItems' });
    if (items.length > 0) {
      createLaterReadMenu(items);
    } else {
      // 如果没有条目，移除现有菜单
      removeLaterReadMenu();
    }
  } catch (error) {
    console.error('检查稍后阅读条目失败:', error);
    // 如果在特殊页面无法通信，尝试直接从storage获取
    try {
      const result = await chrome.storage.sync.get('laterReadItems');
      const items = result.laterReadItems || [];
      if (items.length > 0) {
        createLaterReadMenu(items);
      } else {
        removeLaterReadMenu();
      }
    } catch (storageError) {
      console.error('从storage获取条目失败:', storageError);
    }
  }
}

// 更新稍后阅读菜单
async function updateLaterReadMenu() {
  try {
    const items = await chrome.runtime.sendMessage({ action: 'getLaterReadItems' });
    
    // 移除旧菜单
    removeLaterReadMenu();
    
    // 如果有条目则创建新菜单
    if (items.length > 0) {
      createLaterReadMenu(items);
    }
  } catch (error) {
    console.error('更新稍后阅读菜单失败:', error);
    // 尝试直接从storage获取
    try {
      const result = await chrome.storage.sync.get('laterReadItems');
      const items = result.laterReadItems || [];
      
      removeLaterReadMenu();
      
      if (items.length > 0) {
        createLaterReadMenu(items);
      }
    } catch (storageError) {
      console.error('从storage更新菜单失败:', storageError);
    }
  }
}

// 移除稍后阅读菜单
function removeLaterReadMenu() {
  const oldMenu = document.getElementById('later-read-menu');
  if (oldMenu) {
    oldMenu.remove();
  }
}

// 创建稍后阅读菜单
function createLaterReadMenu(items) {
  // 检查是否已经有菜单
  if (document.getElementById('later-read-menu')) {
    return;
  }
  
  // 创建菜单容器 - 改为相对定位，确保主按钮位置固定
  const menuContainer = document.createElement('div');
  menuContainer.id = 'later-read-menu';
  menuContainer.style.position = 'fixed';
  menuContainer.style.bottom = '20px';
  menuContainer.style.left = '80px';
  menuContainer.style.zIndex = '999999';
  menuContainer.style.display = 'block'; // 改为block布局，避免flex影响位置
  
  // 创建关闭按钮 - 只在悬停时显示
  const closeBtn = document.createElement('div');
  closeBtn.id = 'later-read-close-btn';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '-10px';
  closeBtn.style.right = '-10px';
  closeBtn.style.width = '16px';
  closeBtn.style.height = '16px';
  closeBtn.style.borderRadius = '50%';
  closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'; // 半透明黑色背景
  closeBtn.style.color = 'white';
  closeBtn.style.fontSize = '14px';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.display = 'flex';
  closeBtn.style.alignItems = 'center';
  closeBtn.style.justifyContent = 'center';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  closeBtn.style.userSelect = 'none';
  closeBtn.style.transition = 'all 0.2s ease';
  closeBtn.style.opacity = '0'; // 默认隐藏
  closeBtn.style.transform = 'scale(0.8)'; // 默认缩小
  closeBtn.title = '关闭菜单';
  
  // 使用更精致的关闭图标（×）
  closeBtn.innerHTML = '×';
  
  // 添加悬停效果
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    closeBtn.style.transform = 'scale(1.1)';
    closeBtn.style.boxShadow = '0 3px 8px rgba(0,0,0,0.3)';
  });
  
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    closeBtn.style.transform = 'scale(1)';
    closeBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  });
  
  // 关闭按钮点击事件
  closeBtn.addEventListener('click', () => {
    menuContainer.remove();
    removeOutsideClickListener();
  });
  
  // 创建主按钮（圆形扩展图标）- 绝对定位，确保位置固定
  const mainButton = document.createElement('div');
  mainButton.id = 'later-read-main-btn';
  mainButton.style.position = 'absolute';
  mainButton.style.bottom = '0';
  mainButton.style.right = '0';
  mainButton.style.width = '56px';
  mainButton.style.height = '56px';
  mainButton.style.borderRadius = '50%';
  mainButton.style.backgroundColor = 'white';
  mainButton.style.display = 'flex';
  mainButton.style.opacity = '0.5';
  mainButton.style.alignItems = 'center';
  mainButton.style.justifyContent = 'center';
  // mainButton.style.cursor = 'pointer';
  mainButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  mainButton.style.transition = 'transform 0.2s, box-shadow 0.2s';
  mainButton.style.transform = 'translateZ(0)'; // 硬件加速，防止变形
  
  // 添加主按钮悬停效果，显示关闭按钮
  mainButton.addEventListener('mouseenter', () => {
	mainButton.style.opacity = '1';
    closeBtn.style.opacity = '1';
    closeBtn.style.transform = 'scale(1)';
  });
  
  mainButton.addEventListener('mouseleave', () => {
	mainButton.style.opacity = '0.5';
    // 检查鼠标是否不在关闭按钮上
    if (!closeBtn.matches(':hover')) {
      closeBtn.style.opacity = '0';
      closeBtn.style.transform = 'scale(0.8)';
    }
  });
  
  // 确保鼠标在关闭按钮上时不会隐藏
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.opacity = '1';
    closeBtn.style.transform = 'scale(1)';
  });
  
  closeBtn.addEventListener('mouseleave', () => {
    // 检查鼠标是否不在主按钮上
    if (!mainButton.matches(':hover')) {
      closeBtn.style.opacity = '0';
      closeBtn.style.transform = 'scale(0.8)';
    }
  });
  
  // 添加扩展图标
  const extensionIcon = document.createElement('img');
  extensionIcon.src = chrome.runtime.getURL('icons/icon-128.png');
  extensionIcon.style.width = '40px';
  extensionIcon.style.height = '40px';
  extensionIcon.style.borderRadius = '8px';
  extensionIcon.style.opacity = '0.8';
  
  // 添加数量标记 - 移到正中间，移除背景，添加黑色阴影
  const countBadge = document.createElement('div');
  countBadge.id = 'later-read-count-badge';
  countBadge.style.position = 'absolute';
  countBadge.style.top = '50%';
  countBadge.style.left = '50%';
  countBadge.style.transform = 'translate(-50%, -50%)';
  countBadge.style.minWidth = '24px';
  countBadge.style.height = '24px';
  countBadge.style.color = '#FF0033';
  countBadge.style.fontSize = '14px';
  countBadge.style.fontWeight = 'bold';
  countBadge.style.display = 'flex';
  countBadge.style.alignItems = 'center';
  countBadge.style.justifyContent = 'center';
  countBadge.style.padding = '0 6px';
  // countBadge.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)'; // 黑色阴影
  countBadge.style.userSelect = 'none';
  countBadge.style.zIndex = '1';
  countBadge.textContent = items.length;
  
  // 创建条目列表容器 - 固定在主按钮上方
  const itemsContainer = document.createElement('div');
  itemsContainer.id = 'later-read-items-container';
  itemsContainer.style.position = 'absolute';
  itemsContainer.style.bottom = '66px'; // 主按钮高度 + 间距
  itemsContainer.style.right = '0';
  itemsContainer.style.display = 'none';
  itemsContainer.style.flexDirection = 'column';
  itemsContainer.style.alignItems = 'center';
  itemsContainer.style.margin = '0';
  itemsContainer.style.transition = 'all 0.3s ease';
  itemsContainer.style.opacity = '0';
  itemsContainer.style.transform = 'translateZ(0)'; // 硬件加速
  
  // 添加条目
  items.forEach((item, index) => {
    const itemElement = createLaterReadItem(item, index);
    itemsContainer.appendChild(itemElement);
  });
  
  // 将元素组合起来
  mainButton.appendChild(extensionIcon);
  mainButton.appendChild(countBadge);
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.position = 'relative';
  buttonContainer.appendChild(mainButton);
  buttonContainer.appendChild(closeBtn);
  
  // 先添加主按钮容器，再添加条目容器
  menuContainer.appendChild(buttonContainer);
  menuContainer.appendChild(itemsContainer);
  
  // 添加到页面
  try {
    document.body.appendChild(menuContainer);
    
    // 添加拖拽功能 - 移除所有边界限制
    makeDraggable(menuContainer, mainButton);
    
    // 添加展开/收起功能
    let isExpanded = false;
    let dragState = {
      isDragging: false,
      startX: 0,
      startY: 0,
      hasMoved: false
    };
    
    // 主按钮鼠标按下事件
    mainButton.addEventListener('mousedown', (e) => {
      dragState.startX = e.clientX;
      dragState.startY = e.clientY;
      dragState.hasMoved = false;
      
      // 添加鼠标移动监听来检测是否有实际移动
      document.addEventListener('mousemove', detectDragMovement);
    });
    
    // 检测拖拽移动的函数
    function detectDragMovement(e) {
      if (!dragState.hasMoved) {
        const deltaX = Math.abs(e.clientX - dragState.startX);
        const deltaY = Math.abs(e.clientY - dragState.startY);
        
        // 如果移动超过5像素，认为是拖拽
        if (deltaX > 5 || deltaY > 5) {
          dragState.hasMoved = true;
          document.removeEventListener('mousemove', detectDragMovement);
        }
      }
    }
    
    // 主按钮点击事件
    mainButton.addEventListener('click', (e) => {
      // 如果有移动过，或者正在拖拽中，不执行点击
      if (dragState.hasMoved) {
        dragState.hasMoved = false;
        return;
      }
      
      isExpanded = !isExpanded;
      
      if (isExpanded) {
        // 每次点击都重新计算展开方向，修复方向记忆问题
        const buttonRect = mainButton.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const buttonCenterY = buttonRect.top + buttonRect.height / 2;
        
        // 如果按钮中心在屏幕上半部分，向下展开；否则向上展开
        const expandUpwards = buttonCenterY > windowHeight / 2;
        
        console.log('展开方向计算:', buttonCenterY, '/', windowHeight, '向上展开:', expandUpwards);
        
        // 重置条目容器的所有定位属性
        itemsContainer.style.bottom = 'auto';
        itemsContainer.style.top = 'auto';
        
        // 设置展开方向
        if (expandUpwards) {
          itemsContainer.style.bottom = '66px'; // 主按钮下方展开
          itemsContainer.style.flexDirection = 'column';
        } else {
          itemsContainer.style.top = '0'; // 主按钮上方展开
          itemsContainer.style.flexDirection = 'column-reverse';
        }
        
        // 显示条目容器
        itemsContainer.style.display = 'flex';
        
        // 添加展开动画
        setTimeout(() => {
          itemsContainer.style.opacity = '1';
        }, 10);
        
        // 添加外部点击监听
        addOutsideClickListener(menuContainer, () => {
          if (isExpanded) {
            itemsContainer.style.opacity = '0';
            setTimeout(() => {
              itemsContainer.style.display = 'none';
            }, 300);
            isExpanded = false;
            removeOutsideClickListener();
          }
        });
        
      } else {
        itemsContainer.style.opacity = '0';
        setTimeout(() => {
          itemsContainer.style.display = 'none';
        }, 300);
        removeOutsideClickListener();
      }
    });
    
    // 确保在鼠标抬起时清理状态
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', detectDragMovement);
    });
    
  } catch (error) {
    console.error('添加菜单到页面失败:', error);
    // 如果无法添加到body，尝试添加到其他元素
    try {
      const firstElement = document.documentElement || document.head || document.documentElement;
      firstElement.appendChild(menuContainer);
    } catch (secondError) {
      console.error('添加菜单到其他元素失败:', secondError);
    }
  }
}

// 创建单个稍后阅读条目（圆形按钮）
function createLaterReadItem(item, index) {
  const itemElement = document.createElement('div');
  itemElement.className = 'later-read-item';
  itemElement.dataset.id = item.id;
  itemElement.style.width = '48px';
  itemElement.style.height = '48px';
  itemElement.style.borderRadius = '50%';
  itemElement.style.backgroundColor = 'white';
  itemElement.style.display = 'flex';
  itemElement.style.alignItems = 'center';
  itemElement.style.justifyContent = 'center';
  itemElement.style.cursor = 'pointer';
  itemElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  itemElement.style.transition = 'transform 0.2s, box-shadow 0.2s, margin 0.3s ease';
  itemElement.style.margin = '8px 0';
  itemElement.style.opacity = '0';
  itemElement.style.transform = 'scale(0.8) translateZ(0)'; // 硬件加速，防止变形
  itemElement.style.minWidth = '48px'; // 确保宽度不会被压缩
  itemElement.style.minHeight = '48px'; // 确保高度不会被压缩
  
  // 延迟显示动画
  setTimeout(() => {
    itemElement.style.opacity = '1';
    itemElement.style.transform = 'scale(1) translateZ(0)';
  }, 100 + (index * 50));
  
  // 添加悬停效果
  itemElement.addEventListener('mouseenter', () => {
    itemElement.style.transform = 'scale(1.1) translateZ(0)';
    itemElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    showItemTooltip(itemElement, item);
  });
  
  itemElement.addEventListener('mouseleave', () => {
    itemElement.style.transform = 'scale(1) translateZ(0)';
    itemElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    hideItemTooltip();
  });
  
  // 网站图标
  const favicon = document.createElement('img');
  favicon.src = item.favicon || chrome.runtime.getURL('icons/icon-128.png');
  favicon.style.width = '28px';
  favicon.style.height = '28px';
  favicon.style.borderRadius = '6px';
  favicon.style.objectFit = 'cover';
  
  // 点击事件
  itemElement.addEventListener('click', async (e) => {
    e.stopPropagation(); // 阻止事件冒泡到主按钮
    
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
      
      // 更新菜单
      updateLaterReadMenu();
    } catch (error) {
      console.error('打开稍后阅读条目失败:', error);
      // 尝试直接打开URL
      try {
        window.open(item.url, '_blank');
        // 直接从storage删除
        const result = await chrome.storage.sync.get('laterReadItems');
        const items = result.laterReadItems || [];
        const updatedItems = items.filter(i => i.id !== item.id);
        await chrome.storage.sync.set({ laterReadItems: updatedItems });
        updateLaterReadMenu();
      } catch (fallbackError) {
        console.error('备用方案也失败:', fallbackError);
      }
    }
  });
  
  itemElement.appendChild(favicon);
  
  return itemElement;
}

// 显示条目悬停提示
function showItemTooltip(element, item) {
  // 先移除现有提示
  hideItemTooltip();
  
  const tooltip = document.createElement('div');
  tooltip.id = 'later-read-item-tooltip';
  tooltip.style.position = 'fixed';
  tooltip.style.backgroundColor = 'white';
  tooltip.style.borderRadius = '8px';
  tooltip.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
  tooltip.style.padding = '12px';
  tooltip.style.maxWidth = '400px';
  tooltip.style.zIndex = '1000000';
  tooltip.style.fontFamily = 'Arial, sans-serif';
  tooltip.style.opacity = '0';
  tooltip.style.transition = 'opacity 0.2s';
  tooltip.style.pointerEvents = 'none';
  
  // 提示内容
  const title = document.createElement('div');
  title.style.fontWeight = 'bold';
  title.style.fontSize = '14px';
  title.style.color = '#333';
  title.style.marginBottom = '4px';
  title.style.whiteSpace = 'nowrap';
  title.style.overflow = 'hidden';
  title.style.textOverflow = 'ellipsis';
  title.textContent = item.title || '未命名页面';
  
  const url = document.createElement('div');
  url.style.fontSize = '12px';
  url.style.color = '#666';
  url.style.marginBottom = '4px';
  url.style.whiteSpace = 'nowrap';
  url.style.overflow = 'hidden';
  url.style.textOverflow = 'ellipsis';
  url.textContent = item.url;
  
  const time = document.createElement('div');
  time.style.fontSize = '11px';
  time.style.color = '#999';
  time.textContent = `添加于: ${formatTime(item.timestamp)}`;
  
  tooltip.appendChild(title);
  tooltip.appendChild(url);
  tooltip.appendChild(time);
  
  document.body.appendChild(tooltip);
  
  // 定位提示
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  // 放在元素左侧，垂直居中
  tooltip.style.left = `${rect.left - tooltipRect.width - 10}px`;
  tooltip.style.top = `${rect.top + (rect.height - tooltipRect.height) / 2}px`;
  
  // 确保在视窗内
  if (tooltip.offsetLeft < 0) {
    tooltip.style.left = `${rect.right + 10}px`;
  }
  
  if (tooltip.offsetTop < 0) {
    tooltip.style.top = '10px';
  } else if (tooltip.offsetTop + tooltipRect.height > window.innerHeight) {
    tooltip.style.top = `${window.innerHeight - tooltipRect.height - 10}px`;
  }
  
  // 显示提示
  setTimeout(() => {
    tooltip.style.opacity = '1';
  }, 10);
}

// 隐藏条目悬停提示
function hideItemTooltip() {
  const existingTooltip = document.getElementById('later-read-item-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
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

// 添加拖拽功能 - 移除所有边界限制
function makeDraggable(element, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  let isDragging = false;
  
  // handle.style.cursor = 'move';
  
  handle.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    
    isDragging = true;
    
    // 获取鼠标初始位置
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    
    if (!isDragging) return;
    
    // 计算新位置
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // 获取元素当前位置
    const currentTop = element.offsetTop;
    const currentLeft = element.offsetLeft;
    
    // 计算新位置 - 没有任何边界限制
    const newTop = currentTop - pos2;
    const newLeft = currentLeft - pos1;
    
    // 设置元素新位置
    element.style.top = newTop + "px";
    element.style.left = newLeft + "px";
    element.style.bottom = "auto";
    element.style.right = "auto";
  }
  
  function closeDragElement() {
    isDragging = false;
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// 添加点击外部区域收起菜单的功能
let outsideClickListener = null;

function addOutsideClickListener(menuElement, callback) {
  // 先移除现有的监听
  removeOutsideClickListener();
  
  outsideClickListener = function(e) {
    if (!menuElement.contains(e.target)) {
      callback();
    }
  };
  
  document.addEventListener('click', outsideClickListener);
}

function removeOutsideClickListener() {
  if (outsideClickListener) {
    document.removeEventListener('click', outsideClickListener);
    outsideClickListener = null;
  }
}