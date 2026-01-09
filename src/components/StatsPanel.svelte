<script>
  export let todayFocusMinutes = 0
  export let todayFocusPercentage = 0
  // dailyTarget 保留用于未来扩展
  export let dailyTarget = 240
</script>

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

<style>
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