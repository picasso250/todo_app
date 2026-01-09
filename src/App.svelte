<script>
  import { onMount } from 'svelte'
  import TaskCard from './components/TaskCard.svelte'

  // 状态管理 - 使用普通变量
  let todoTasks = []
  let doingTasks = []
  let doneTasks = []
  let currentTask = null
  let remainingTime = 25 * 60
  let isRunning = false
  let showAddTask = false
  let newTaskTitle = ''
  let newTaskDuration = 25

  // 统计数据
  let todayFocusMinutes = 0
  let todayFocusPercentage = 0
  const dailyTarget = 240

  let timer = null
  let expandedPrompts = {}
  let promptUpdateTimers = {}

  onMount(() => {
    loadData()
  })

  function loadData() {
    const data = JSON.parse(localStorage.getItem('flowDashboardData') || '{}')

    todoTasks = (data.todoTasks || []).map((task) => ({
      ...task,
      prompt_context: task.prompt_context || '',
    }))
    doingTasks = (data.doingTasks || []).map((task) => ({
      ...task,
      prompt_context: task.prompt_context || '',
    }))
    doneTasks = (data.doneTasks || []).map((task) => ({
      ...task,
      prompt_context: task.prompt_context || '',
    }))
    currentTask = data.currentTask
      ? { ...data.currentTask, prompt_context: data.currentTask.prompt_context || '' }
      : null
    remainingTime = data.remainingTime || 25 * 60

    if (data.isRunning && currentTask && data.startTime) {
      const elapsedSeconds = Math.floor((Date.now() - data.startTime) / 1000)
      remainingTime = Math.max(0, currentTask.duration * 60 - elapsedSeconds)
      isRunning = true
      setTimeout(() => startTimer(), 100)
    } else {
      isRunning = false
    }

    if (Object.keys(data).length === 0) {
      todoTasks = [
        {
          id: Date.now() + 1,
          title: '完成项目提案',
          duration: 25,
          createdAt: new Date().toLocaleString('zh-CN'),
          prompt_context: '',
        },
        {
          id: Date.now() + 2,
          title: '代码审查',
          duration: 30,
          createdAt: new Date().toLocaleString('zh-CN'),
          prompt_context: '',
        },
        {
          id: Date.now() + 3,
          title: '学习新技术',
          duration: 45,
          createdAt: new Date().toLocaleString('zh-CN'),
          prompt_context: '',
        },
      ]
    }

    calculateTodayFocus()
  }

  function saveData() {
    localStorage.setItem(
      'flowDashboardData',
      JSON.stringify({
        todoTasks,
        doingTasks,
        doneTasks,
        currentTask,
        remainingTime,
        isRunning,
        startTime: isRunning && currentTask ? Date.now() : null,
      }),
    )
    calculateTodayFocus()
  }

  function addTask() {
    if (!newTaskTitle.trim()) return

    const task = {
      id: Date.now(),
      title: newTaskTitle.trim(),
      duration: parseInt(newTaskDuration) || 25,
      createdAt: new Date().toLocaleString('zh-CN'),
      prompt_context: '',
    }

    todoTasks = [...todoTasks, task]
    newTaskTitle = ''
    newTaskDuration = 25
    showAddTask = false
    saveData()
  }

  function startTask(task) {
    if (isRunning && currentTask) {
      pauseTimer()
      doingTasks = doingTasks.filter((t) => t.id !== currentTask.id)
      todoTasks = [...todoTasks, { ...currentTask, startedAt: undefined }]
    }

    todoTasks = todoTasks.filter((t) => t.id !== task.id)
    doingTasks = [...doingTasks, { ...task, startedAt: new Date().toLocaleString('zh-CN') }]

    currentTask = { ...task }
    remainingTime = task.duration * 60
    isRunning = true
    startTimer()
    saveData()
  }

  function completeTask(task) {
    doingTasks = doingTasks.filter((t) => t.id !== task.id)
    doneTasks = [
      ...doneTasks,
      {
        ...task,
        completedAt: new Date().toLocaleString('zh-CN'),
        actualDuration: task.duration * 60 - remainingTime,
      },
    ]

    resetTimer()
    saveData()
    playCompleteSound()
  }

  function pauseTask(task) {
    pauseTimer()
    doingTasks = doingTasks.filter((t) => t.id !== task.id)
    todoTasks = [...todoTasks, task]
    resetTimer()
    saveData()
  }

  function redoTask(task) {
    const newTask = {
      id: Date.now(),
      title: task.title,
      duration: task.duration,
      createdAt: new Date().toLocaleString('zh-CN'),
      prompt_context: task.prompt_context || '',
    }

    doneTasks = doneTasks.filter((t) => t.id !== task.id)
    todoTasks = [...todoTasks, newTask]
    saveData()
  }

  function deleteTask(taskId, type) {
    if (type === 'todo') {
      todoTasks = todoTasks.filter((t) => t.id !== taskId)
    } else if (type === 'doing') {
      doingTasks = doingTasks.filter((t) => t.id !== taskId)
      if (currentTask && currentTask.id === taskId) {
        resetTimer()
      }
    } else if (type === 'done') {
      doneTasks = doneTasks.filter((t) => t.id !== taskId)
    }
    saveData()
  }

  function startTimer() {
    if (!currentTask) return

    isRunning = true
    timer = setInterval(() => {
      if (remainingTime > 0) {
        remainingTime--
        if (remainingTime % 60 === 0) {
          calculateTodayFocus()
        }
        saveData()
      } else {
        const task = doingTasks.find((t) => t.id === currentTask.id)
        if (task) completeTask(task)
      }
    }, 1000)
  }

  function pauseTimer() {
    isRunning = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    saveData()
  }

  function resetTimer() {
    pauseTimer()
    currentTask = null
    remainingTime = 25 * 60
    saveData()
  }

  function formatTime(seconds) {
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60)
      .toString()
      .padStart(2, '0')}`
  }

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

  function updatePromptContext(taskId, type, promptContext) {
    if (promptUpdateTimers[taskId]) {
      clearTimeout(promptUpdateTimers[taskId])
    }

    promptUpdateTimers[taskId] = setTimeout(() => {
      const updateList = (tasks) =>
        tasks.map((t) => (t.id === taskId ? { ...t, prompt_context: promptContext } : t))

      if (type === 'todo') todoTasks = updateList(todoTasks)
      else if (type === 'doing') doingTasks = updateList(doingTasks)
      else if (type === 'done') doneTasks = updateList(doneTasks)

      if (currentTask && currentTask.id === taskId) {
        currentTask = { ...currentTask, prompt_context: promptContext }
      }

      saveData()
      delete promptUpdateTimers[taskId]
    }, 300)
  }

  function togglePrompt(promptId) {
    expandedPrompts[promptId] = !expandedPrompts[promptId]
    expandedPrompts = { ...expandedPrompts }
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  function calculateTodayFocus() {
    const today = new Date().toDateString()
    let totalMinutes = 0

    doneTasks.forEach((task) => {
      if (task.completedAt && new Date(task.completedAt).toDateString() === today) {
        totalMinutes += task.actualDuration
          ? Math.round(task.actualDuration / 60)
          : task.duration
      }
    })

    if (currentTask && isRunning) {
      totalMinutes += Math.round((currentTask.duration * 60 - remainingTime) / 60)
    }

    todayFocusMinutes = totalMinutes
    todayFocusPercentage = Math.min(Math.round((totalMinutes / dailyTarget) * 100), 100)
  }

  function handleTaskAction(event) {
    const { action, task, type } = event.detail
    switch (action) {
      case 'start':
        startTask(task)
        break
      case 'complete':
        completeTask(task)
        break
      case 'pause':
        pauseTask(task)
        break
      case 'redo':
        redoTask(task)
        break
      case 'delete':
        deleteTask(task.id, type)
        break
    }
  }

  function handleTaskUpdate(event) {
    const { taskId, type, promptContext } = event.detail
    updatePromptContext(taskId, type, promptContext)
  }

  function handleTogglePrompt(event) {
    const { taskId } = event.detail
    togglePrompt(`prompt-${taskId}`)
  }


</script>

<!-- 网格背景 -->
<div class="fixed inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>

<!-- 上帝视角统计面板 -->
<div class="fixed top-4 right-4 z-50 god-view-panel rounded-lg p-4 min-w-[200px]">
  <h3 class="cyber-font text-sm font-semibold text-neon-purple mb-3 god-view-stat">
    今日专注
  </h3>
  <div class="flex items-center justify-center mb-3">
    <svg width="120" height="120" class="transform -rotate-90">
      <circle cx="60" cy="60" r="50" stroke="#2a2a2a" stroke-width="8" fill="none" />
      <circle
        cx="60"
        cy="60"
        r="50"
        stroke="#9945ff"
        stroke-width="8"
        fill="none"
        stroke-dasharray="314.16"
        stroke-dashoffset={314.16 - (314.16 * todayFocusPercentage) / 100}
        class="god-view-ring"
        stroke-linecap="round"
      />
    </svg>
    <div class="absolute text-center">
      <div class="cyber-font text-xl text-neon-purple god-view-stat">
        {todayFocusMinutes}min
      </div>
      <div class="text-xs text-gray-500">专注时长</div>
    </div>
  </div>
  <div class="text-xs text-gray-400 text-center">
    效率指数:
    <span class="text-neon-cyan font-semibold god-view-stat">{todayFocusPercentage}%</span>
  </div>
</div>

<!-- 主容器 -->
<div class="flex h-screen relative z-10">
  <!-- 左侧看板区域 -->
  <aside class="w-96 bg-cyber-dark/90 backdrop-blur-md border-r border-cyber-gray p-6 overflow-y-auto">
    <!-- 标题 -->
    <header class="mb-8">
      <h1 class="cyber-font text-2xl font-bold text-neon-cyan neon-text mb-2">
        心流驾驶舱
      </h1>
      <p class="text-gray-400 text-sm">专注当下，掌控时间</p>
    </header>

    <!-- 添加任务按钮 -->
    <button
      on:click={() => (showAddTask = true)}
      class="w-full cyber-border p-3 rounded-lg text-neon-cyan hover:bg-neon-cyan/10 transition-all duration-300 font-medium mb-6"
    >
      + 添加新任务
    </button>

    <!-- 添加任务弹窗 -->
    {#if showAddTask}
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-cyber-dark p-6 rounded-lg border border-neon-cyan w-96">
          <h3 class="cyber-font text-lg text-neon-cyan mb-4">添加新任务</h3>
          <input
            bind:value={newTaskTitle}
            placeholder="任务名称"
            class="w-full bg-cyber-gray border border-gray-700 rounded px-3 py-2 text-gray-200 mb-3"
          />
          <input
            bind:value={newTaskDuration}
            type="number"
            placeholder="时长（分钟）"
            class="w-full bg-cyber-gray border border-gray-700 rounded px-3 py-2 text-gray-200 mb-4"
          />
          <div class="flex space-x-3">
            <button
              on:click={addTask}
              class="flex-1 bg-neon-cyan text-cyber-black px-4 py-2 rounded font-medium"
            >
              添加
            </button>
            <button
              on:click={() => {
                showAddTask = false
                newTaskTitle = ''
                newTaskDuration = 25
              }}
              class="flex-1 bg-gray-700 text-gray-200 px-4 py-2 rounded font-medium"
            >
              取消
            </button>
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
          <span class="text-xs text-gray-500">{todoTasks.length} 个任务</span>
        </h2>
        <div class="space-y-2">
          {#each todoTasks as task (task.id)}
            <TaskCard 
              {task} 
              type="todo" 
              isExpanded={expandedPrompts[`prompt-${task.id}`]}
              on:action={handleTaskAction}
              on:update={handleTaskUpdate}
              on:toggle-prompt={handleTogglePrompt}
            />
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
          <span class="text-xs text-gray-500">{doingTasks.length} 个任务</span>
        </h2>
        <div class="space-y-2">
          {#each doingTasks as task (task.id)}
            <TaskCard 
              {task} 
              type="doing" 
              isExpanded={expandedPrompts[`prompt-${task.id}`]}
              on:action={handleTaskAction}
              on:update={handleTaskUpdate}
              on:toggle-prompt={handleTogglePrompt}
            />
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
          <span class="text-xs text-gray-500">{doneTasks.length} 个任务</span>
        </h2>
        <div class="space-y-2">
          {#each doneTasks as task (task.id)}
            <TaskCard 
              {task} 
              type="done" 
              isExpanded={expandedPrompts[`prompt-${task.id}`]}
              on:action={handleTaskAction}
              on:update={handleTaskUpdate}
              on:toggle-prompt={handleTogglePrompt}
            />
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
        <div class="cyber-font text-8xl font-bold text-neon-cyan neon-text">
          {formatTime(remainingTime)}
        </div>
      </div>

      <div class="space-y-4">
        <h2 class="cyber-font text-2xl text-gray-300">
          {currentTask ? currentTask.title : '准备开始'}
        </h2>

        <!-- 控制按钮 -->
        <div class="flex justify-center space-x-4">
          <button
            on:click={() => (isRunning ? pauseTimer() : startTimer())}
            disabled={!currentTask}
            class="cyber-border px-8 py-3 rounded-lg text-neon-cyan hover:bg-neon-cyan hover:text-cyber-black transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if !currentTask}准备开始{:else if isRunning}暂停{:else}继续{/if}
          </button>
          <button
            on:click={resetTimer}
            class="cyber-border px-8 py-3 rounded-lg text-gray-400 hover:bg-gray-400 hover:text-cyber-black transition-all duration-300 font-medium"
          >
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
    background-image: linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
    background-size: 50px 50px;
  }

  :global(.countdown-glow) {
    text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff, 0 0 80px #00ffff;
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

  :global(.text-cyber-purple) {
    color: #9945ff;
  }
</style>