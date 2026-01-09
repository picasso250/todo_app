<script>
  import { createEventDispatcher, onDestroy } from 'svelte'
  
  export let currentTask = null
  export let isRunning = false
  export let remainingTime = 25 * 60

  let timer = null
  let timerElement

  // 向父组件发送事件
  const dispatch = createEventDispatcher()

  function togglePrompt() {
    dispatch('togglePrompt', { taskId: currentTask.id, task: currentTask })
  }

  function handleTaskAction(action) {
    dispatch('taskAction', { action, task: currentTask, type: 'active' })
  }

  // 格式化时间显示
  function formatTime(seconds) {
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60)
      .toString()
      .padStart(2, '0')}`
  }

  // 开始计时器
  function startTimer() {
    if (!currentTask) return

    isRunning = true
    timer = setInterval(() => {
      if (remainingTime > 0) {
        remainingTime--
        // 每分钟更新一次统计
        if (remainingTime % 60 === 0) {
          dispatch('updateStats')
        }
        dispatch('tick', { remainingTime, isRunning })
      } else {
        dispatch('complete')
      }
    }, 1000)
  }

  // 暂停计时器
  function pauseTimer() {
    isRunning = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    dispatch('tick', { remainingTime, isRunning })
  }

  // 重置计时器
  function resetTimer() {
    pauseTimer()
    currentTask = null
    remainingTime = 25 * 60
    isRunning = false
    dispatch('reset', { remainingTime })
  }

  // 播放完成音效
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

  // 在组件被重置时播放完成音效
  function handleReset() {
    playCompleteSound()
    resetTimer()
  }

  // 处理外部控制
  export function start() {
    startTimer()
  }

  export function pause() {
    pauseTimer()
  }

  export function reset() {
    resetTimer()
  }

  // 组件销毁时清理计时器
  onDestroy(() => {
    pauseTimer()
  })

  // 响应外部状态变化
  $: if (isRunning && currentTask && !timer) {
    startTimer()
  } else if (!isRunning && timer) {
    pauseTimer()
  }


</script>

<!-- 倒计时显示 -->
<div class="text-center">
  <div class="countdown-glow mb-8">
    <div class="cyber-font text-8xl font-bold text-neon-cyan neon-text">
      {formatTime(remainingTime)}
    </div>
  </div>

  <!-- 当前任务信息 -->
  {#if currentTask}
    <div class="mb-8 cyber-border rounded-lg p-6 bg-cyber-gray/50 max-w-md mx-auto">
      <h2 class="cyber-font text-2xl text-gray-200 mb-2">
        {currentTask.title}
      </h2>
      <p class="text-sm text-gray-400 mb-4">
        预计 {currentTask.duration} 分钟 | 开始于 {currentTask.startedAt || '刚刚'}
      </p>

      <!-- 任务操作按钮 -->
      <div class="flex justify-center space-x-3 mb-4">
        <button
          on:click={() => (isRunning ? pause() : start())}
          class="cyber-border px-6 py-2 rounded-lg text-neon-cyan hover:bg-neon-cyan hover:text-cyber-black transition-all duration-300 font-medium text-sm"
        >
          {isRunning ? '暂停' : '继续'}
        </button>
        <button
          on:click={() => handleTaskAction('complete')}
          class="cyber-border px-6 py-2 rounded-lg text-cyber-green hover:bg-cyber-green hover:text-cyber-black transition-all duration-300 font-medium text-sm"
        >
          完成
        </button>
        <button
          on:click={() => handleTaskAction('pause')}
          class="cyber-border px-6 py-2 rounded-lg text-orange-500 hover:bg-orange-500 hover:text-cyber-black transition-all duration-300 font-medium text-sm"
        >
          停止
        </button>
        <button
          on:click={() => togglePrompt()}
          class="cyber-border px-6 py-2 rounded-lg text-neon-purple hover:bg-neon-purple hover:text-cyber-black transition-all duration-300 font-medium text-sm"
        >
          Prompt
        </button>
      </div>


    </div>
  {:else}
    <div class="space-y-4">
      <h2 class="cyber-font text-2xl text-gray-300">
        选择一个任务开始专注
      </h2>
      <p class="text-gray-500">
        从左侧列表中选择任务，进入心流状态
      </p>
    </div>
  {/if}
</div>

<!-- 装饰性元素 -->
<div class="absolute top-10 right-10 w-32 h-32 border border-neon-cyan/20 rounded-full animate-pulse"></div>
<div class="absolute bottom-10 left-10 w-24 h-24 border border-neon-pink/20 rounded-full animate-pulse delay-100"></div>

<style>
  :global(.countdown-glow) {
    text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff, 0 0 80px #00ffff;
  }
</style>