<script>
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'
  
  // 状态管理
  let todoTasks = writable([])
  let doingTasks = writable([])
  let doneTasks = writable([])
  let currentTask = writable(null)
  let remainingTime = writable(25 * 60)
  let isRunning = writable(false)
  let showAddTask = writable(false)
  let newTaskTitle = writable('')
  let newTaskDuration = writable(25)
  
  // 统计数据
  let todayFocusMinutes = writable(0)
  let todayFocusPercentage = writable(0)
  const dailyTarget = 240
  
  let timer = null
  
  // 订阅响应式变量
  $: todoTasksArray = $todoTasks
  $: doingTasksArray = $doingTasks
  $: doneTasksArray = $doneTasks
  $: currentTaskValue = $currentTask
  $: remainingTimeValue = $remainingTime
  $: isRunningValue = $isRunning
  $: showAddTaskValue = $showAddTask
  $: newTaskTitleValue = $newTaskTitle
  $: newTaskDurationValue = $newTaskDuration
  $: todayFocusMinutesValue = $todayFocusMinutes
  $: todayFocusPercentageValue = $todayFocusPercentage
  
  onMount(() => {
    loadData()
    if ($currentTask && $currentTask.isRunning) {
      resumeTimer()
    }
  })
  
  // 从localStorage加载数据
  function loadData() {
    const savedData = localStorage.getItem('flowDashboardData')
    if (savedData) {
      const data = JSON.parse(savedData)
      todoTasks.set(data.todoTasks || [])
      doingTasks.set(data.doingTasks || [])
      doneTasks.set(data.doneTasks || [])
      currentTask.set(data.currentTask || null)
      remainingTime.set(data.remainingTime || 25 * 60)
    } else {
      // 首次使用时的示例数据
      todoTasks.set([
        { id: Date.now() + 1, title: '完成项目提案', duration: 25, createdAt: new Date().toLocaleString('zh-CN') },
        { id: Date.now() + 2, title: '代码审查', duration: 30, createdAt: new Date().toLocaleString('zh-CN') },
        { id: Date.now() + 3, title: '学习新技术', duration: 45, createdAt: new Date().toLocaleString('zh-CN') }
      ])
      saveData()
    }
    calculateTodayFocus()
  }
  
  // 保存数据到localStorage
  function saveData() {
    const data = {
      todoTasks: $todoTasks,
      doingTasks: $doingTasks,
      doneTasks: $doneTasks,
      currentTask: $currentTask,
      remainingTime: $remainingTime,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('flowDashboardData', JSON.stringify(data))
    calculateTodayFocus()
  }
  
  // 添加新任务
  function addTask() {
    if (!$newTaskTitle.trim()) return
    
    const task = {
      id: Date.now(),
      title: $newTaskTitle.trim(),
      duration: parseInt($newTaskDuration) || 25,
      createdAt: new Date().toLocaleString('zh-CN')
    }
    
    todoTasks.update(tasks => [...tasks, task])
    newTaskTitle.set('')
    newTaskDuration.set(25)
    showAddTask.set(false)
    saveData()
  }
  
  // 开始任务
  function startTask(task) {
    todoTasks.update(tasks => tasks.filter(t => t.id !== task.id))
    doingTasks.update(tasks => [...tasks, {...task, startedAt: new Date().toLocaleString('zh-CN')}])
    
    currentTask.set({...task})
    remainingTime.set(task.duration * 60)
    isRunning.set(true)
    startTimer()
    saveData()
  }
  
  // 完成任务
  function completeTask(task) {
    doingTasks.update(tasks => tasks.filter(t => t.id !== task.id))
    doneTasks.update(tasks => [...tasks, {
      ...task, 
      completedAt: new Date().toLocaleString('zh-CN'),
      actualDuration: task.duration * 60 - $remainingTime
    }])
    
    resetTimer()
    saveData()
    playCompleteSound()
  }
  
  // 暂停任务
  function pauseTask(task) {
    pauseTimer()
    saveData()
  }
  
  // 重新开始已完成任务
  function redoTask(task) {
    const newTask = {
      id: Date.now(),
      title: task.title,
      duration: task.duration,
      createdAt: new Date().toLocaleString('zh-CN')
    }
    
    doneTasks.update(tasks => tasks.filter(t => t.id !== task.id))
    todoTasks.update(tasks => [...tasks, newTask])
    saveData()
  }
  
  // 删除任务
  function deleteTask(taskId, type) {
    if (type === 'todo') {
      todoTasks.update(tasks => tasks.filter(t => t.id !== taskId))
    } else if (type === 'doing') {
      doingTasks.update(tasks => tasks.filter(t => t.id !== taskId))
      if ($currentTask && $currentTask.id === taskId) {
        resetTimer()
      }
    } else if (type === 'done') {
      doneTasks.update(tasks => tasks.filter(t => t.id !== taskId))
    }
    saveData()
  }
  
  // 开始计时器
  function startTimer() {
    if (!$currentTask) return
    
    isRunning.set(true)
    timer = setInterval(() => {
      if ($remainingTime > 0) {
        remainingTime.update(time => time - 1)
        // 每分钟更新一次专注统计
        if ($remainingTime % 60 === 0) {
          calculateTodayFocus()
        }
        saveData()
      } else {
        // 时间到，自动完成任务
        if ($currentTask) {
          const task = $doingTasks.find(t => t.id === $currentTask.id)
          if (task) {
            completeTask(task)
          }
        }
      }
    }, 1000)
  }
  
  // 暂停计时器
  function pauseTimer() {
    isRunning.set(false)
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    saveData()
  }
  
  // 重置计时器
  function resetTimer() {
    pauseTimer()
    currentTask.set(null)
    remainingTime.set(25 * 60)
    saveData()
  }
  
  // 恢复计时器（页面刷新时）
  function resumeTimer() {
    if ($currentTask && !timer) {
      startTimer()
    }
  }
  
  // 格式化时间显示
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  // 播放完成提示音
  function playCompleteSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }
  
  // 计算今日专注时间
  function calculateTodayFocus() {
    const today = new Date().toDateString()
    let totalMinutes = 0
    
    // 统计已完成任务的专注时间
    $doneTasks.forEach(task => {
      if (task.completedAt && new Date(task.completedAt).toDateString() === today) {
        totalMinutes += task.actualDuration ? Math.round(task.actualDuration / 60) : task.duration
      }
    })
    
    // 统计正在进行的任务已用时长
    if ($currentTask && $isRunning) {
      const elapsedMinutes = Math.round(($currentTask.duration * 60 - $remainingTime) / 60)
      totalMinutes += elapsedMinutes
    }
    
    todayFocusMinutes.set(totalMinutes)
    todayFocusPercentage.set(Math.min(Math.round((totalMinutes / dailyTarget) * 100), 100))
  }
</script>

<!-- 网格背景 -->
<div class="fixed inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>

<!-- 上帝视角统计面板 -->
<div class="fixed top-4 right-4 z-50 god-view-panel rounded-lg p-4 min-w-[200px]">
    <h3 class="cyber-font text-sm font-semibold text-neon-purple mb-3 god-view-stat">今日专注</h3>
    <div class="flex items-center justify-center mb-3">
        <svg width="120" height="120" class="transform -rotate-90">
            <circle cx="60" cy="60" r="50" stroke="#2a2a2a" stroke-width="8" fill="none"/>
            <circle cx="60" cy="60" r="50" stroke="#9945ff" stroke-width="8" fill="none"
                    stroke-dasharray="314.16"
                    stroke-dashoffset={314.16 - (314.16 * todayFocusPercentageValue / 100)}
                    class="god-view-ring"
                    stroke-linecap="round"/>
        </svg>
        <div class="absolute text-center">
            <div class="cyber-font text-xl text-neon-purple god-view-stat">{todayFocusMinutesValue}min</div>
            <div class="text-xs text-gray-500">专注时长</div>
        </div>
    </div>
    <div class="text-xs text-gray-400 text-center">
        效率指数: <span class="text-neon-cyan font-semibold god-view-stat">{todayFocusPercentageValue}%</span>
    </div>
</div>

<!-- 主容器 -->
<div class="flex h-screen relative z-10">
    
    <!-- 左侧看板区域 -->
    <aside class="w-96 bg-cyber-dark/90 backdrop-blur-md border-r border-cyber-gray p-6 overflow-y-auto">
        
        <!-- 标题 -->
        <header class="mb-8">
            <h1 class="cyber-font text-2xl font-bold text-neon-cyan neon-text mb-2">心流驾驶舱</h1>
            <p class="text-gray-400 text-sm">专注当下，掌控时间</p>
        </header>
        
        <!-- 添加任务按钮 -->
        <button on:click={() => showAddTask.set(true)} class="w-full cyber-border p-3 rounded-lg text-neon-cyan hover:bg-neon-cyan/10 transition-all duration-300 font-medium mb-6">
            + 添加新任务
        </button>
        
        <!-- 添加任务弹窗 -->
        {#if showAddTaskValue}
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div class="bg-cyber-dark p-6 rounded-lg border border-neon-cyan w-96">
                <h3 class="cyber-font text-lg text-neon-cyan mb-4">添加新任务</h3>
                <input bind:value={$newTaskTitle} placeholder="任务名称" class="w-full bg-cyber-gray border border-gray-700 rounded px-3 py-2 text-gray-200 mb-3">
                <input bind:value={$newTaskDuration} type="number" placeholder="时长（分钟）" class="w-full bg-cyber-gray border border-gray-700 rounded px-3 py-2 text-gray-200 mb-4">
                <div class="flex space-x-3">
                    <button on:click={addTask} class="flex-1 bg-neon-cyan text-cyber-black px-4 py-2 rounded font-medium">添加</button>
                    <button on:click={() => { showAddTask.set(false); newTaskTitle.set(''); newTaskDuration.set(25) }} class="flex-1 bg-gray-700 text-gray-200 px-4 py-2 rounded font-medium">取消</button>
                </div>
            </div>
        </div>
        {/if}
        
        <!-- 看板容器 -->
        <div class="space-y-6">
            
            <!-- TODO 列表 -->
            <section class="cyber-border rounded-lg p-4">
                <h2 class="cyber-font text-sm font-semibold text-neon-cyan mb-4 flex items-center justify-between">
                    <span class="flex items-center">
                        <span class="w-2 h-2 bg-neon-cyan rounded-full mr-2 animate-pulse"></span>
                        TODO 待办
                    </span>
                    <span class="text-xs text-gray-500">{todoTasksArray.length} 个任务</span>
                </h2>
                <div class="space-y-2">
                    {#each todoTasksArray as task (task.id)}
                    <div class="task-card bg-cyber-gray/50 p-3 rounded border border-gray-700 hover:border-neon-cyan/50">
                        <div class="flex items-center justify-between">
                            <div class="flex-1">
                                <h3 class="text-sm font-medium text-gray-200">{task.title}</h3>
                                <p class="text-xs text-gray-500 mt-1">{task.duration} 分钟</p>
                            </div>
                            <div class="flex space-x-2">
                                <button on:click={() => startTask(task)} class="text-neon-cyan hover:text-neon-pink transition-colors" title="开始任务">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </button>
                                <button on:click={() => deleteTask(task.id, 'todo')} class="text-red-500 hover:text-red-400 transition-colors" title="删除任务">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    {/each}
                </div>
            </section>
            
            <!-- DOING 列表 -->
            <section class="cyber-border rounded-lg p-4">
                <h2 class="cyber-font text-sm font-semibold text-neon-pink mb-4 flex items-center justify-between">
                    <span class="flex items-center">
                        <span class="w-2 h-2 bg-neon-pink rounded-full mr-2 animate-pulse"></span>
                        DOING 进行中
                    </span>
                    <span class="text-xs text-gray-500">{doingTasksArray.length} 个任务</span>
                </h2>
                <div class="space-y-2">
                    {#each doingTasksArray as task (task.id)}
                    <div class="task-card bg-cyber-gray/50 p-3 rounded border border-neon-pink/50">
                        <div class="flex items-center justify-between">
                            <div class="flex-1">
                                <h3 class="text-sm font-medium text-gray-200">{task.title}</h3>
                                <p class="text-xs text-gray-500 mt-1">{task.duration} 分钟</p>
                            </div>
                            <div class="flex space-x-2">
                                <button on:click={() => completeTask(task)} class="text-cyber-green hover:text-green-400 transition-colors" title="完成任务">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </button>
                                <button on:click={() => pauseTask(task)} class="text-orange-500 hover:text-orange-400 transition-colors" title="暂停任务">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    {/each}
                </div>
            </section>
            
            <!-- DONE 列表 -->
            <section class="cyber-border rounded-lg p-4">
                <h2 class="cyber-font text-sm font-semibold text-cyber-green mb-4 flex items-center justify-between">
                    <span class="flex items-center">
                        <span class="w-2 h-2 bg-cyber-green rounded-full mr-2"></span>
                        DONE 已完成
                    </span>
                    <span class="text-xs text-gray-500">{doneTasksArray.length} 个任务</span>
                </h2>
                <div class="space-y-2">
                    {#each doneTasksArray as task (task.id)}
                    <div class="task-card bg-cyber-gray/30 p-3 rounded border border-gray-700 opacity-60">
                        <div class="flex items-center justify-between">
                            <div class="flex-1">
                                <h3 class="text-sm font-medium text-gray-400 line-through">{task.title}</h3>
                                <p class="text-xs text-gray-600 mt-1">完成于 {task.completedAt}</p>
                            </div>
                            <div class="flex space-x-2">
                                <button on:click={() => redoTask(task)} class="text-gray-400 hover:text-neon-cyan transition-colors" title="重新开始">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                    </svg>
                                </button>
                                <button on:click={() => deleteTask(task.id, 'done')} class="text-red-500 hover:text-red-400 transition-colors" title="删除任务">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    {/each}
                </div>
            </section>
            
        </div>
        
    </aside>
    
    <!-- 中间倒计时区域 -->
    <main class="flex-1 flex items-center justify-center relative">
        
        <!-- 倒计时显示 -->
        <div class="text-center">
            <div class="countdown-glow mb-8">
                <div class="cyber-font text-8xl font-bold text-neon-cyan neon-text">{formatTime(remainingTimeValue)}</div>
            </div>
            
            <div class="space-y-4">
                <h2 class="cyber-font text-2xl text-gray-300">{currentTaskValue ? currentTaskValue.title : '准备开始'}</h2>
                
                <!-- 控制按钮 -->
                <div class="flex justify-center space-x-4">
                    <button on:click={startTimer} disabled={isRunningValue || !currentTaskValue} 
                            class="cyber-border px-8 py-3 rounded-lg text-neon-cyan hover:bg-neon-cyan hover:text-cyber-black transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                        {#if isRunningValue}运行中{:else}开始{/if}
                    </button>
                    <button on:click={pauseTimer} disabled={!isRunningValue} 
                            class="cyber-border px-8 py-3 rounded-lg text-neon-pink hover:bg-neon-pink hover:text-cyber-black transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                        暂停
                    </button>
                    <button on:click={resetTimer} 
                            class="cyber-border px-8 py-3 rounded-lg text-gray-400 hover:bg-gray-400 hover:text-cyber-black transition-all duration-300 font-medium">
                        重置
                    </button>
                </div>
            </div>
        </div>
        
        <!-- 装饰性元素 -->
        <div class="absolute top-10 right-10 w-32 h-32 border border-neon-cyan/20 rounded-full animate-pulse"></div>
        <div class="absolute bottom-10 left-10 w-24 h-24 border border-neon-pink/20 rounded-full animate-pulse delay-100"></div>
        
    </main>
    
</div>

<style>
  :global(.cyber-font) {
    font-family: 'Courier New', monospace;
  }
  
  :global(.neon-text) {
    text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
  }
  
  :global(.cyber-border) {
    border: 1px solid currentColor;
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.3), inset 0 0 5px rgba(0, 255, 255, 0.1);
  }
  
  :global(.bg-grid-pattern) {
    background-image: 
      linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
    background-size: 50px 50px;
  }
  
  :global(.countdown-glow) {
    text-shadow: 
      0 0 20px #00ffff,
      0 0 40px #00ffff,
      0 0 60px #00ffff,
      0 0 80px #00ffff;
  }
  
  :global(.task-card) {
    transition: all 0.3s ease;
  }
  
  :global(.god-view-panel) {
    background: rgba(26, 26, 26, 0.95);
    border: 1px solid #9945ff;
    box-shadow: 0 0 20px rgba(153, 69, 255, 0.3);
  }
  
  :global(.god-view-stat) {
    text-shadow: 0 0 10px currentColor;
  }
  
  :global(.god-view-ring) {
    filter: drop-shadow(0 0 5px #9945ff);
    transition: stroke-dashoffset 0.3s ease;
  }
</style>