<script>
  import { createEventDispatcher } from 'svelte'

  export let task
  export let type = 'todo'
  export let isExpanded = false
  export let heroMode = false

  const dispatch = createEventDispatcher()

  function updatePromptContext(promptContext) {
    dispatch('update', { taskId: task.id, type, promptContext })
  }

  function togglePrompt() {
    dispatch('toggle-prompt', { taskId: task.id })
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(task.prompt_context).catch(err => {
      console.error('复制失败:', err)
    })
  }

  function taskActions() {
    const promptIcon =
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>'
    const deleteIcon =
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>'

    if (type === 'todo')
      return [
        {
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
          color: 'neon-cyan hover:text-neon-pink',
          title: '开始任务',
          action: 'start',
        },
        {
          icon: promptIcon,
          color: 'cyber-purple hover:text-neon-purple',
          title: 'Prompt 记忆',
          action: 'prompt',
        },
        {
          icon: deleteIcon,
          color: 'red-500 hover:text-red-400',
          title: '删除任务',
          action: 'delete',
        },
      ]

    if (type === 'active')
      return [
        {
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
          color: 'cyber-green hover:text-green-400',
          title: '完成任务',
          action: 'complete',
        },
        {
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>',
          color: 'orange-500 hover:text-orange-400',
          title: '停止任务',
          action: 'pause',
        },
        {
          icon: promptIcon,
          color: 'cyber-purple hover:text-neon-purple',
          title: 'Prompt 记忆',
          action: 'prompt',
        },
      ]

    return [
      {
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>',
        color: 'text-gray-400 hover:text-neon-cyan',
        title: '重新开始',
        action: 'redo',
      },
      {
        icon: promptIcon,
        color: 'text-gray-500 hover:text-neon-purple',
        title: 'Prompt 记忆',
        action: 'prompt',
      },
      {
        icon: deleteIcon,
        color: 'red-500 hover:text-red-400',
        title: '删除任务',
        action: 'delete',
      },
    ]
  }

  function handleAction(action) {
    dispatch('action', { action, task, type })
  }

  function getBorderColor() {
    if (type === 'todo') return 'border-gray-700 hover:border-neon-cyan/50'
    if (type === 'active') return 'border-neon-pink/50'
    return 'border-gray-700'
  }

  function getBackgroundOpacity() {
    if (type === 'done') return 'bg-cyber-gray/30 opacity-60'
    return 'bg-cyber-gray/50'
  }

  function getTextClass() {
    if (type === 'done') return 'text-gray-400 line-through'
    return 'text-gray-200'
  }
</script>

<div class="task-card {getBackgroundOpacity()} p-3 rounded border {getBorderColor()}" class:hero-mode={heroMode}>
  <div class="flex items-center justify-between">
    <div class="flex-1">
      <h3 class="text-sm font-medium {getTextClass()}">{task.title}</h3>
      <p class="text-xs text-gray-500 mt-1">
        {type === 'done' ? `完成于 ${task.completedAt}` : 
         type === 'active' ? `进行中 - ${task.duration} 分钟` : 
         `${task.duration} 分钟`}
      </p>
    </div>
    <div class="flex space-x-2">
      {#each taskActions() as action}
        <button
          on:click={() => action.action === 'prompt' ? togglePrompt() : handleAction(action.action)}
          class="text-{action.color} transition-colors"
          title={action.title}
        >
          <svg
            class="w-{action.title.includes('Prompt') ? '4' : '5'} h-{action.title.includes('Prompt') ? '4' : '5'}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {@html action.icon}
          </svg>
        </button>
      {/each}
    </div>
  </div>
  {#if isExpanded}
    <div class="mt-3 pt-3 border-t border-gray-700">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-neon-purple font-medium">Prompt 记忆</span>
        <button
          on:click={copyToClipboard}
          class="text-xs text-cyber-blue hover:text-neon-cyan transition-colors"
        >
          复制
        </button>
      </div>
      <textarea
        bind:value={task.prompt_context}
        on:input={() => updatePromptContext(task.prompt_context)}
        placeholder="在此粘贴你的 AI Prompt..."
        class="w-full bg-cyber-black border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 resize-none h-20 focus:border-neon-cyan focus:outline-none"
      ></textarea>
    </div>
  {/if}
</div>

<style>
  :global(.task-card) {
    transition: all 0.3s ease;
  }

  :global(.hero-mode) {
    transform: scale(1.2);
    background: rgba(26, 26, 26, 0.95);
    border: 2px solid #ff1493;
    box-shadow: 0 0 20px rgba(255, 20, 147, 0.5);
    max-width: 400px;
  }
</style>