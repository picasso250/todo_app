<script>
  import { createEventDispatcher } from 'svelte'

  export let isOpen = false
  export let task = null
  export let title = ''

  const dispatch = createEventDispatcher()

  let promptText = ''
  let promptUpdateTimer = null

  // 当任务变化时更新prompt文本
  $: if (task) {
    promptText = task.prompt_context || ''
    title = task.title || ''
  }

  function closeModal() {
    isOpen = false
    dispatch('close')
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(promptText).catch(err => {
      console.error('复制失败:', err)
    })
  }

  // 自动保存逻辑
  function handlePromptChange() {
    if (!task) return

    // 清除之前的定时器
    if (promptUpdateTimer) {
      clearTimeout(promptUpdateTimer)
    }

    // 设置新的定时器，300ms后自动保存
    promptUpdateTimer = setTimeout(() => {
      dispatch('save', { taskId: task.id, promptContext: promptText })
    }, 300)
  }

  // 键盘快捷键
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      closeModal()
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && task}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
    <div class="bg-cyber-dark rounded-lg border border-neon-cyan w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
      <!-- 标题栏 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-700">
        <div class="flex items-center space-x-3">
          <div class="w-3 h-3 bg-neon-cyan rounded-full animate-pulse"></div>
          <h2 class="cyber-font text-xl text-neon-cyan font-bold">{title}</h2>
        </div>
        <div class="flex space-x-2">
          <button
            on:click={copyToClipboard}
            class="px-4 py-2 bg-cyber-gray text-cyber-blue hover:bg-cyber-gray/70 rounded-lg transition-colors text-sm font-medium"
            title="复制"
          >
            复制
          </button>
          <button
            on:click={closeModal}
            class="px-4 py-2 bg-gray-700 text-gray-200 hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
            title="关闭 (ESC)"
          >
            关闭
          </button>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="flex-1 p-6 overflow-hidden">
        <div class="h-full flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <label class="text-sm text-neon-purple font-medium">Prompt 记忆</label>
          <div class="text-xs text-gray-500">
            自动保存 | ESC 关闭
          </div>
          </div>
          <textarea
            bind:value={promptText}
            on:input={handlePromptChange}
            placeholder="在此粘贴你的 AI Prompt..."
            class="flex-1 bg-cyber-black border border-gray-700 rounded-lg px-4 py-3 text-gray-300 resize-none focus:border-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan/20 font-mono text-sm leading-relaxed"
          ></textarea>
        </div>
      </div>

      <!-- 状态栏 -->
      <div class="p-4 border-t border-gray-700 bg-cyber-gray/30">
        <div class="flex items-center justify-between text-xs text-gray-500">
          <div class="flex items-center space-x-4">
            <span>字符数: {promptText.length}</span>
            <span>行数: {promptText.split('\n').length}</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>自动保存中...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(.cyber-font) {
    font-family: 'Courier New', monospace;
  }
</style>