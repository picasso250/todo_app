<script>
  import { onMount } from 'svelte'
  import TaskCard from './components/TaskCard.svelte'
  import Timer from './components/Timer.svelte'
  import StatsPanel from './components/StatsPanel.svelte'
  import PromptModal from './components/PromptModal.svelte'

  // 状态管理 - 使用普通变量
  let todoTasks = []
  let activeTask = null  // 替代 doingTasks 数组，只能有一个活跃任务
  let doneTasks = []
  let remainingTime = 25 * 60
  let isRunning = false
  let showAddTask = false
  let newTaskTitle = ''
  let newTaskDuration = 25
  let taskTitleInput

  // 统计数据
  let todayFocusMinutes = 0
  let todayFocusPercentage = 0
  const dailyTarget = 240

  // Prompt Modal 状态
  let isPromptModalOpen = false
  let currentPromptTask = null
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
    // doingTasks 已移除，改为 activeTask 架构
    doneTasks = (data.doneTasks || []).map((task) => ({
      ...task,
      prompt_context: task.prompt_context || '',
    }))
    activeTask = data.currentTask
      ? { ...data.currentTask, prompt_context: data.currentTask.prompt_context || '' }
      : null
    remainingTime = data.remainingTime || 25 * 60

    if (data.isRunning && activeTask && data.startTime) {
      const elapsedSeconds = Math.floor((Date.now() - data.startTime) / 1000)
      remainingTime = Math.max(0, activeTask.duration * 60 - elapsedSeconds)
      isRunning = true
      // 延迟启动计时器，等待DOM渲染完成
      setTimeout(() => {
        const timerElement = document.querySelector('timer-component')
        if (timerElement) {
          timerElement.start()
        }
      }, 100)
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
        doingTasks: [],  // 保持向后兼容，但数组为空
        doneTasks,
        currentTask: activeTask,
        remainingTime,
        isRunning,
        startTime: isRunning && activeTask ? Date.now() : null,
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

  // 当弹窗显示时自动聚焦到输入框
  $: if (showAddTask && taskTitleInput) {
    taskTitleInput.focus()
  }

  function startTask(task) {
    // 如果已有活跃任务，先将其移回待办
    if (activeTask) {
      // 通知计时器组件暂停
      const timerElement = document.querySelector('timer-component')
      if (timerElement) {
        timerElement.pause()
      }
      
      todoTasks = [...todoTasks, { ...activeTask, startedAt: undefined }]
    }

    // 从待办中移除任务，设为活跃任务
    todoTasks = todoTasks.filter((t) => t.id !== task.id)
    activeTask = { ...task, startedAt: new Date().toLocaleString('zh-CN') }

    remainingTime = task.duration * 60
    isRunning = true
    
    // 通知计时器组件开始
    const timerStart = document.querySelector('timer-component')
    if (timerStart) {
      setTimeout(() => timerStart.start(), 100)
    }
    
    saveData()
  }

  function completeTask(task) {
    // 活跃任务完成后移到已完成列表
    if (activeTask && activeTask.id === task.id) {
      doneTasks = [
        ...doneTasks,
        {
          ...task,
          completedAt: new Date().toLocaleString('zh-CN'),
          actualDuration: task.duration * 60 - remainingTime,
        },
      ]
      
      activeTask = null
      
      // 通知计时器组件播放完成音效并重置
      const timerElement = document.querySelector('timer-component')
      if (timerElement) {
        timerElement.reset()
      }
    }
    
    saveData()
  }

  function pauseTask(task) {
    // 只有活跃任务可以被暂停/停止
    if (activeTask && activeTask.id === task.id) {
      // 将活跃任务移回待办列表
      todoTasks = [...todoTasks, task]
      activeTask = null
      
      // 重置计时器状态
      isRunning = false
      remainingTime = 25 * 60
      
      // 通知计时器组件重置
      const timerElement = document.querySelector('timer-component')
      if (timerElement) {
        timerElement.reset()
      }
    }
    
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
    } else if (type === 'active') {
      if (activeTask && activeTask.id === taskId) {
        activeTask = null
        // 重置计时器
        const timerReset = document.querySelector('timer-component')
        if (timerReset) {
          timerReset.reset()
        }
      }
    } else if (type === 'done') {
      doneTasks = doneTasks.filter((t) => t.id !== taskId)
    }
    saveData()
  }

  function handleTimerTick(event) {
    const { remainingTime: newRemainingTime, isRunning: newIsRunning } = event.detail
    remainingTime = newRemainingTime
    isRunning = newIsRunning
    saveData()
  }

  function handleTimerComplete() {
    if (activeTask) completeTask(activeTask)
  }

  function handleTimerReset(event) {
    const { remainingTime: newRemainingTime } = event.detail
    remainingTime = newRemainingTime
    currentTask = null
    saveData()
  }

  function handleUpdateStats() {
    calculateTodayFocus()
    saveData()
  }

  function updatePromptContext(taskId, type, promptContext) {
    if (promptUpdateTimers[taskId]) {
      clearTimeout(promptUpdateTimers[taskId])
    }

    promptUpdateTimers[taskId] = setTimeout(() => {
      const updateList = (tasks) =>
        tasks.map((t) => (t.id === taskId ? { ...t, prompt_context: promptContext } : t))

      if (type === 'todo') todoTasks = updateList(todoTasks)
      else if (type === 'active') {
        activeTask = { ...activeTask, prompt_context: promptContext }
      }
      else if (type === 'done') doneTasks = updateList(doneTasks)

      saveData()
      delete promptUpdateTimers[taskId]
    }, 300)
  }

  function togglePrompt(event) {
    const { task } = event.detail
    currentPromptTask = task
    isPromptModalOpen = true
  }

  function handlePromptSave(event) {
    const { taskId, promptContext } = event.detail
    
    if (promptUpdateTimers[taskId]) {
      clearTimeout(promptUpdateTimers[taskId])
    }

    promptUpdateTimers[taskId] = setTimeout(() => {
      // 更新各个列表中的任务
      todoTasks = todoTasks.map(t => 
        t.id === taskId ? { ...t, prompt_context: promptContext } : t
      )
      
      if (activeTask && activeTask.id === taskId) {
        activeTask = { ...activeTask, prompt_context: promptContext }
      }
      
      doneTasks = doneTasks.map(t => 
        t.id === taskId ? { ...t, prompt_context: promptContext } : t
      )
      
      saveData()
      delete promptUpdateTimers[taskId]
    }, 300)
  }

  function handlePromptClose() {
    isPromptModalOpen = false
    currentPromptTask = null
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

    if (activeTask && isRunning) {
      totalMinutes += Math.round((activeTask.duration * 60 - remainingTime) / 60)
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




</script>

<!-- 网格背景 -->
<div class="fixed inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>

<!-- 统计面板 -->
<StatsPanel 
  {todayFocusMinutes} 
  {todayFocusPercentage} 
  dailyTarget={dailyTarget} 
/>

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
            bind:this={taskTitleInput}
            bind:value={newTaskTitle}
            placeholder="任务名称"
            class="w-full bg-cyber-gray border border-gray-700 rounded px-3 py-2 text-gray-200 mb-3"
            on:keydown={(e) => {
              if (e.key === 'Enter') {
                addTask()
              }
            }}
          />
          <input
            bind:value={newTaskDuration}
            type="number"
            placeholder="时长（分钟）"
            class="w-full bg-cyber-gray border border-gray-700 rounded px-3 py-2 text-gray-200 mb-4"
            on:keydown={(e) => {
              if (e.key === 'Enter') {
                addTask()
              }
            }}
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
              task={task} 
              type="todo"
              on:action={handleTaskAction}
              on:toggle-prompt={togglePrompt}
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
              task={task} 
              type="done"
              on:action={handleTaskAction}
              on:toggle-prompt={togglePrompt}
            />
          {/each}
        </div>
      </section>
    </div>
  </aside>

  <!-- 中心舞台 - 计时器和任务操作 -->
  <main class="flex-1 flex items-center justify-center relative">
    <Timer 
      bind:currentTask={activeTask} 
      bind:isRunning 
      bind:remainingTime
      on:tick={handleTimerTick}
      on:complete={handleTimerComplete}
      on:reset={handleTimerReset}
      on:updateStats={handleUpdateStats}
      on:taskAction={handleTaskAction}
      on:togglePrompt={togglePrompt}
    />
  </main>
</div>

<!-- Prompt Modal -->
<PromptModal 
  bind:isOpen={isPromptModalOpen}
  bind:task={currentPromptTask}
  on:save={handlePromptSave}
  on:close={handlePromptClose}
/>

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

</style>