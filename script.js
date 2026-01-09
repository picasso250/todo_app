function flowDashboard() {
    return {
        // 数据状态
        todoTasks: [],
        doingTasks: [],
        doneTasks: [],
        currentTask: null,
        remainingTime: 25 * 60, // 默认25分钟
        isRunning: false,
        timer: null,
        showAddTask: false,
        newTaskTitle: '',
        newTaskDuration: 25,
        // 上帝视角统计
        todayFocusMinutes: 0,
        todayFocusPercentage: 0,
        dailyTarget: 240, // 4小时目标（240分钟）
        
        // 初始化：从localStorage恢复数据
        init() {
            this.loadData();
            // 如果有正在进行的任务，恢复计时器状态
            if (this.currentTask && this.currentTask.isRunning) {
                this.resumeTimer();
            }
        },
        
        // 从localStorage加载数据
        loadData() {
            const savedData = localStorage.getItem('flowDashboardData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.todoTasks = data.todoTasks || [];
                this.doingTasks = data.doingTasks || [];
                this.doneTasks = data.doneTasks || [];
                this.currentTask = data.currentTask || null;
                this.remainingTime = data.remainingTime || 25 * 60;
            } else {
                // 首次使用时的示例数据
                this.todoTasks = [
                    { id: Date.now() + 1, title: '完成项目提案', duration: 25, createdAt: new Date().toLocaleString('zh-CN') },
                    { id: Date.now() + 2, title: '代码审查', duration: 30, createdAt: new Date().toLocaleString('zh-CN') },
                    { id: Date.now() + 3, title: '学习新技术', duration: 45, createdAt: new Date().toLocaleString('zh-CN') }
                ];
                this.saveData();
            }
            
            // 计算今日专注时间
            this.calculateTodayFocus();
        },
        
        // 保存数据到localStorage
        saveData() {
            const data = {
                todoTasks: this.todoTasks,
                doingTasks: this.doingTasks,
                doneTasks: this.doneTasks,
                currentTask: this.currentTask,
                remainingTime: this.remainingTime,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('flowDashboardData', JSON.stringify(data));
            
            // 重新计算今日专注时间
            this.calculateTodayFocus();
        },
        
        // 添加新任务
        addTask() {
            if (!this.newTaskTitle.trim()) return;
            
            const task = {
                id: Date.now(),
                title: this.newTaskTitle.trim(),
                duration: parseInt(this.newTaskDuration) || 25,
                createdAt: new Date().toLocaleString('zh-CN')
            };
            
            this.todoTasks.push(task);
            this.newTaskTitle = '';
            this.newTaskDuration = 25;
            this.showAddTask = false;
            this.saveData();
        },
        
        // 开始任务
        startTask(task) {
            // 从todo移动到doing
            this.todoTasks = this.todoTasks.filter(t => t.id !== task.id);
            this.doingTasks.push({...task, startedAt: new Date().toLocaleString('zh-CN')});
            
            // 设置为当前任务并开始计时
            this.currentTask = {...task};
            this.remainingTime = task.duration * 60;
            this.isRunning = true;
            this.startTimer();
            this.saveData();
        },
        
        // 完成任务
        completeTask(task) {
            // 从doing移动到done
            this.doingTasks = this.doingTasks.filter(t => t.id !== task.id);
            this.doneTasks.push({
                ...task, 
                completedAt: new Date().toLocaleString('zh-CN'),
                actualDuration: task.duration * 60 - this.remainingTime
            });
            
            // 重置计时器
            this.resetTimer();
            this.saveData();
            
            // 播放完成提示（可选）
            this.playCompleteSound();
        },
        
        // 暂停任务
        pauseTask(task) {
            this.pauseTimer();
            this.saveData();
        },
        
        // 重新开始已完成任务
        redoTask(task) {
            const newTask = {
                id: Date.now(),
                title: task.title,
                duration: task.duration,
                createdAt: new Date().toLocaleString('zh-CN')
            };
            
            this.doneTasks = this.doneTasks.filter(t => t.id !== task.id);
            this.todoTasks.push(newTask);
            this.saveData();
        },
        
        // 删除任务
        deleteTask(taskId, type) {
            if (type === 'todo') {
                this.todoTasks = this.todoTasks.filter(t => t.id !== taskId);
            } else if (type === 'doing') {
                this.doingTasks = this.doingTasks.filter(t => t.id !== taskId);
                if (this.currentTask && this.currentTask.id === taskId) {
                    this.resetTimer();
                }
            } else if (type === 'done') {
                this.doneTasks = this.doneTasks.filter(t => t.id !== taskId);
            }
            this.saveData();
        },
        
        // 开始计时器
        startTimer() {
            if (!this.currentTask) return;
            
            this.isRunning = true;
            this.timer = setInterval(() => {
                if (this.remainingTime > 0) {
                    this.remainingTime--;
                    // 每分钟更新一次专注统计
                    if (this.remainingTime % 60 === 0) {
                        this.calculateTodayFocus();
                    }
                    this.saveData();
                } else {
                    // 时间到，自动完成任务
                    if (this.currentTask) {
                        const task = this.doingTasks.find(t => t.id === this.currentTask.id);
                        if (task) {
                            this.completeTask(task);
                        }
                    }
                }
            }, 1000);
        },
        
        // 暂停计时器
        pauseTimer() {
            this.isRunning = false;
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
            this.saveData();
        },
        
        // 重置计时器
        resetTimer() {
            this.pauseTimer();
            this.currentTask = null;
            this.remainingTime = 25 * 60;
            this.saveData();
        },
        
        // 恢复计时器（页面刷新时）
        resumeTimer() {
            if (this.currentTask && !this.timer) {
                this.startTimer();
            }
        },
        
        // 格式化时间显示
        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        },
        
        // 播放完成提示音（使用Web Audio API）
        playCompleteSound() {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        },
        
        // 计算今日专注时间
        calculateTodayFocus() {
            const today = new Date().toDateString();
            let totalMinutes = 0;
            
            // 统计已完成任务的专注时间
            this.doneTasks.forEach(task => {
                if (task.completedAt && new Date(task.completedAt).toDateString() === today) {
                    totalMinutes += task.actualDuration ? Math.round(task.actualDuration / 60) : task.duration;
                }
            });
            
            // 统计正在进行的任务已用时长
            if (this.currentTask && this.isRunning) {
                const elapsedMinutes = Math.round((this.currentTask.duration * 60 - this.remainingTime) / 60);
                totalMinutes += elapsedMinutes;
            }
            
            this.todayFocusMinutes = totalMinutes;
            this.todayFocusPercentage = Math.min(Math.round((totalMinutes / this.dailyTarget) * 100), 100);
        },
        
        // 页面卸载时清理
        beforeUnload() {
            if (this.timer) {
                clearInterval(this.timer);
            }
        }
    }
}

// 页面卸载时清理定时器
window.addEventListener('beforeunload', () => {
    if (window.flowDashboard && window.flowDashboard.timer) {
        clearInterval(window.flowDashboard.timer);
    }
});